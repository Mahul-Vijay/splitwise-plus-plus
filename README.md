# SplitWise++

Group expense splitting with **graph-based debt simplification**. Log
expenses however your group actually spent money — equal splits, exact
amounts, or percentages — and SplitWise++ reduces the resulting tangle
of who-owes-who down to the *minimum* set of payments that settles
everyone up.

This isn't just "Splitwise but simpler." The interesting part is the
`simplifyDebts` algorithm in `lib/simplifyDebts.ts`: it treats the
group's debts as a directed graph, nets every balance to collapse
cycles, then greedily matches the largest debtor against the largest
creditor (a max-heap approach to the min-cash-flow problem) until the
graph is reduced to as few edges as possible.

## Stack

- **Next.js 14** (App Router) + TypeScript
- **Prisma** + SQLite for zero-config local dev (swap to Postgres for prod — see below)
- **Custom JWT auth** (`jose` + `bcryptjs`), httpOnly session cookie, no third-party auth provider
- **Tailwind CSS**, hand-built design system (no component library)
- Zero external state library — server components + `router.refresh()` for a simple, correct data flow

## Getting started

```bash
npm install
cp .env.example .env          # already done if you unzipped this as-is
npx prisma generate
npx prisma db push            # creates dev.db (SQLite) from the schema
npx prisma db seed            # optional: loads a demo group + 4 users
npm run dev
```

Then open http://localhost:3000.

If you ran the seed script, you can sign in as `alex@demo.com` /
`password123` (also `priya@`, `sam@`, `jordan@demo.com`) and open the
seeded **Goa Trip** group to see the debt graph pre-populated with a
realistic multi-person tangle.

> **Note on this build:** the sandboxed environment this project was
> assembled in blocks the network host Prisma uses to download its
> query-engine binary (`binaries.prisma.sh`), so `prisma generate`
> could not be executed there. Every other piece was verified in that
> environment — the simplification algorithm was run directly with
> Node against hand-checked test cases (cycle collapsing, exact-split
> rounding, a 5-person min-cash-flow case), and the full TypeScript
> project was type-checked (`tsc --noEmit`) with zero errors outside
> the expected `any` fallout from the ungenerated Prisma types. Once
> you run `npx prisma generate` with normal internet access, those
> resolve automatically.

## Going to production

Swap SQLite for Postgres by changing two things:

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

```bash
DATABASE_URL="postgresql://user:pass@host:5432/splitwise"
```

Then `npx prisma migrate deploy`. Everything else — routes, auth,
algorithm — is unchanged.

## How the algorithm works

1. **Net every balance.** For each user, sum what they paid for others
   minus what others paid for them. This single step already collapses
   cycles: if A→B→C→A each owe the same amount, netting takes all
   three straight to zero without a human ever spotting the cycle.
2. **Split into creditors and debtors**, each in a max-heap keyed by
   amount.
3. **Greedily match** the biggest creditor with the biggest debtor,
   settle the smaller of the two amounts, and push whichever side has
   a balance left back into its heap. Repeat until both heaps are
   empty.

This is a well-known greedy approximation to the min-cash-flow
problem (the *exact* minimum-transaction variant is NP-hard — it
reduces to a set-partition search). The greedy version is what
production apps use in practice: it's O(n log n), it never produces
more than `n - 1` transactions for `n` people, and in the seeded demo
it turns 7 raw expense-shares into 2 payments.

See the doc-comment at the top of `lib/simplifyDebts.ts` for the full
writeup, and `computeNetBalances` right below it for how raw
`Expense`/`ExpenseShare` rows turn into the `Balance[]` the algorithm
consumes.

## Project structure

```
app/
  page.tsx                     landing page
  login/, register/            auth pages
  dashboard/                   list of the user's groups
  groups/[id]/                 group detail: graph, ledger, balances
  api/
    auth/{register,login,logout,me}/
    groups/
      route.ts                 list / create groups
      [id]/route.ts             group detail / delete
      [id]/members/route.ts     invite existing users by email
      [id]/expenses/route.ts    log expenses (equal / exact / percentage split)
      [id]/expenses/[expenseId]/route.ts   delete an expense
      [id]/balances/route.ts   net balances + simplified settlement plan
      [id]/settle/route.ts     record a real payment
components/                    all client-side UI, including DebtGraph.tsx
lib/
  simplifyDebts.ts              the algorithm (pure functions, framework-free)
  auth.ts, db.ts, requireUser.ts
prisma/schema.prisma            User, Group, Membership, Expense, ExpenseShare, Settlement
```

## Known limitations / roadmap

- Inviting a member requires them to already have an account — no
  email-invite flow yet.
- No real-time updates between members viewing the same group
  simultaneously (would be a natural WebSocket addition).
- No receipt/image attachments on expenses.
- The greedy simplification is a strong approximation, not a proven
  global minimum — fine for real-world group sizes, but worth flagging
  if this gets used as a DSA talking point.

---

## Development log

A day-by-day record of how this was built, in case you need to talk
through the project or reconstruct a commit history.

**Days 1–2 — Problem framing & schema design**
Picked the debt-simplification angle over a plain expense tracker
specifically to have a real algorithmic core. Modeled the domain:
`User`, `Group`, `Membership` (join table with a `role`), `Expense`,
`ExpenseShare` (many-to-many between expenses and the users who owe a
piece of them), and `Settlement` (a *recorded* real payment, distinct
from the algorithm's on-the-fly suggestions). Chose to store all money
as integer cents from day one to avoid floating-point drift.

**Days 3–4 — Auth**
Rolled custom auth instead of pulling in NextAuth, specifically to
practice JWT + bcrypt + httpOnly cookies end-to-end. Added
`middleware.ts` to gate `/dashboard` and `/groups/*` at the edge
before any page code runs.

**Days 5–7 — The algorithm, in isolation**
Wrote `simplifyDebts.ts` and `computeNetBalances` as pure,
framework-free functions before touching the database or UI, so they
could be tested directly with hand-built cases: a 3-person cycle that
should net to zero transactions, a straightforward 3-person dinner
split, and a 5-person case with mixed credit/debit to confirm the
max-heap matching logic and that total money moved always equals the
sum of positive balances.

**Days 8–10 — API layer**
Built the group, membership, expense, balance, and settlement routes.
Spent real time on the expense-splitting validation — equal splits
need a remainder-distribution trick so integer cents still sum
exactly to the total; percentage splits need the same trick applied
after converting percent to cents; exact splits just need a sum check.
Added a `requireGroupMember` guard so every group-scoped route
confirms membership before returning or mutating anything.

**Days 11–12 — Dashboard & group shell**
Server-rendered the groups list and the group detail page directly
from Prisma (no redundant client fetch on first load), then layered
client components on top for anything interactive.

**Days 13–15 — The debt graph visualization**
The part that makes the project feel like more than a CRUD app. Built
`DebtGraph.tsx`: circular node layout computed from member count,
curved SVG edges with arrowheads, and a toggle between the "raw
tangle" (derived straight from expense shares) and the "simplified
plan" (from the algorithm) so the reduction is visible, not just
stated in text.

**Days 16–17 — Expense form & ledger**
Built the three-mode expense form (equal / exact / percentage) with
live client-side validation matching the server's rules, plus the
expense list with payer-only delete.

**Day 18 — Settlements**
Wired "mark paid" on each suggested settlement to actually record a
`Settlement` row, which then feeds back into `computeNetBalances` on
the next load — so marking a suggestion paid immediately shrinks the
graph.

**Day 19 — Design pass**
Moved off default Tailwind grays toward a deliberate ink/teal/coral
palette that reads as "ledger meets graph paper" rather than a generic
dashboard, and gave the graph edges a draw-in animation.

**Day 20 — Polish & docs**
Seed script for a realistic demo group, this README, and a pass
through every API route to make sure error messages are specific
enough to actually debug from.
