import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { computeNetBalances, simplifyDebts } from "@/lib/simplifyDebts";
import { Navbar } from "@/components/Navbar";
import { DebtGraph } from "@/components/DebtGraph";
import { BalanceSummary } from "@/components/BalanceSummary";
import { SettlementSuggestions } from "@/components/SettlementSuggestions";
import { ExpenseForm } from "@/components/ExpenseForm";
import { ExpenseList } from "@/components/ExpenseList";
import { AddMemberForm } from "@/components/AddMemberForm";

export default async function GroupDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const membership = await prisma.membership.findUnique({
    where: { userId_groupId: { userId: session.userId, groupId: params.id } },
  });
  if (!membership) notFound();

  const group = await prisma.group.findUnique({
    where: { id: params.id },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
      expenses: {
        orderBy: { createdAt: "desc" },
        include: {
          paidBy: { select: { id: true, name: true } },
          shares: { include: { user: { select: { id: true, name: true } } } },
        },
      },
      settlements: true,
    },
  });
  if (!group) notFound();

  const memberList = group.members.map((m) => ({ userId: m.userId, name: m.user.name }));
  const balances = computeNetBalances(
    memberList,
    group.expenses.map((e) => ({ paidById: e.paidById, shares: e.shares })),
    group.settlements.map((s) => ({ fromUserId: s.fromUserId, toUserId: s.toUserId, amountCents: s.amountCents }))
  );
  const simplifiedTransactions = simplifyDebts(balances);
  const naiveCount = group.expenses.reduce(
    (count, e) => count + e.shares.filter((s) => s.userId !== e.paidById).length,
    0
  );

  const members = group.members.map((m) => m.user);
  const expenses = group.expenses.map((e) => ({
    ...e,
    createdAt: e.createdAt.toISOString(),
  }));

  return (
    <div className="min-h-screen">
      <Navbar userName={session.name} />

      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-paper-400 mb-1">
              <a href="/dashboard" className="hover:text-paper-100">
                Groups
              </a>
              <span>/</span>
              <span>{group.name}</span>
            </div>
            <h1 className="font-display text-2xl font-semibold text-paper-100 flex items-center gap-2">
              <span>{group.emoji}</span> {group.name}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {members.slice(0, 6).map((m) => (
                <span
                  key={m.id}
                  title={m.name}
                  className="w-8 h-8 rounded-full border-2 border-ink-950 bg-ink-800 flex items-center justify-center text-[10px] font-display font-semibold text-paper-100"
                >
                  {m.name.slice(0, 2).toUpperCase()}
                </span>
              ))}
            </div>
            <AddMemberForm groupId={group.id} />
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <DebtGraph members={memberList} expenses={expenses} simplifiedTransactions={simplifiedTransactions} />

            <div>
              <ExpenseForm groupId={group.id} members={members} meId={session.userId} />
            </div>

            <div>
              <h2 className="font-display font-semibold text-paper-100 mb-3">Expense history</h2>
              <ExpenseList groupId={group.id} expenses={expenses} meId={session.userId} />
            </div>
          </div>

          <div className="space-y-6">
            <BalanceSummary balances={balances} meId={session.userId} />
            <SettlementSuggestions
              groupId={group.id}
              transactions={simplifiedTransactions}
              naiveCount={naiveCount}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
