/**
 * Debt Graph Simplification
 * ==========================
 *
 * The problem: in a group, expenses create a tangle of pairwise debts.
 * If Alice paid for dinner, Bob paid for gas, and Carol paid for the
 * hotel, you can end up with a directed graph where Alice owes Bob,
 * Bob owes Carol, AND Carol owes Alice — a cycle that nets out to
 * everyone owing less than the graph suggests, but nobody can see that
 * from the raw transaction list.
 *
 * The fix: this is the "minimum cash flow" problem. Reduce the graph to
 * the smallest possible set of transactions that settles every balance.
 *
 * Approach (greedy, O(n log n)):
 *   1. Net every user down to a single balance (positive = is owed
 *      money, negative = owes money). This alone collapses cycles,
 *      since A -> B -> C -> A of equal amounts nets everyone to zero.
 *   2. Put net creditors in a max-heap, net debtors in a max-heap
 *      (by absolute value).
 *   3. Repeatedly match the biggest debtor against the biggest
 *      creditor, settle the smaller of the two amounts between them,
 *      and push whichever side still has a remaining balance back in.
 *
 * This greedy strategy does not always hit the theoretical minimum
 * number of transactions (that variant of the problem is NP-hard —
 * it's equivalent to a set-partition-style search), but it's a widely
 * used, provably-good approximation: it never does worse than
 * (n - 1) transactions for n people, versus the naive pairwise
 * approach which can produce O(n^2) transactions.
 */

export type Balance = {
  userId: string;
  name: string;
  netCents: number; // positive: is owed money · negative: owes money
};

export type SimplifiedTransaction = {
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  amountCents: number;
};

type HeapEntry = { userId: string; name: string; amountCents: number };

/**
 * Small binary max-heap keyed by amountCents. Good enough at group
 * scale (dozens of members) and keeps the algorithm dependency-free.
 */
class MaxHeap {
  private items: HeapEntry[] = [];

  get size() {
    return this.items.length;
  }

  push(entry: HeapEntry) {
    this.items.push(entry);
    this.bubbleUp(this.items.length - 1);
  }

  pop(): HeapEntry | undefined {
    if (this.items.length === 0) return undefined;
    const top = this.items[0];
    const last = this.items.pop()!;
    if (this.items.length > 0) {
      this.items[0] = last;
      this.bubbleDown(0);
    }
    return top;
  }

  private bubbleUp(i: number) {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.items[parent].amountCents >= this.items[i].amountCents) break;
      [this.items[parent], this.items[i]] = [this.items[i], this.items[parent]];
      i = parent;
    }
  }

  private bubbleDown(i: number) {
    const n = this.items.length;
    for (;;) {
      let largest = i;
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      if (l < n && this.items[l].amountCents > this.items[largest].amountCents) largest = l;
      if (r < n && this.items[r].amountCents > this.items[largest].amountCents) largest = r;
      if (largest === i) break;
      [this.items[largest], this.items[i]] = [this.items[i], this.items[largest]];
      i = largest;
    }
  }
}

/**
 * Reduce a set of net balances to the minimal-ish set of transactions
 * that settles the group. Balances must already sum to (near) zero.
 */
export function simplifyDebts(balances: Balance[]): SimplifiedTransaction[] {
  const creditors = new MaxHeap();
  const debtors = new MaxHeap();

  for (const b of balances) {
    if (b.netCents > 0) {
      creditors.push({ userId: b.userId, name: b.name, amountCents: b.netCents });
    } else if (b.netCents < 0) {
      debtors.push({ userId: b.userId, name: b.name, amountCents: -b.netCents });
    }
  }

  const transactions: SimplifiedTransaction[] = [];

  let creditor = creditors.pop();
  let debtor = debtors.pop();

  while (creditor && debtor) {
    const settled = Math.min(creditor.amountCents, debtor.amountCents);

    if (settled > 0) {
      transactions.push({
        fromUserId: debtor.userId,
        fromName: debtor.name,
        toUserId: creditor.userId,
        toName: creditor.name,
        amountCents: settled,
      });
    }

    creditor.amountCents -= settled;
    debtor.amountCents -= settled;

    if (creditor.amountCents > 0) {
      creditors.push(creditor);
      debtor = debtors.pop();
    } else if (debtor.amountCents > 0) {
      debtors.push(debtor);
      creditor = creditors.pop();
    } else {
      creditor = creditors.pop();
      debtor = debtors.pop();
    }
  }

  return transactions;
}

/**
 * Turn a group's raw expenses + shares into net balances per user.
 * netCents > 0  => this user is owed money overall
 * netCents < 0  => this user owes money overall
 */
export function computeNetBalances(
  members: { userId: string; name: string }[],
  expenses: { paidById: string; shares: { userId: string; shareCents: number }[] }[],
  settlements: { fromUserId: string; toUserId: string; amountCents: number }[]
): Balance[] {
  const net = new Map<string, number>();
  for (const m of members) net.set(m.userId, 0);

  for (const expense of expenses) {
    for (const share of expense.shares) {
      // The payer fronted the money, so they're owed each share
      // except their own; everyone who owes a share gets debited.
      net.set(share.userId, (net.get(share.userId) ?? 0) - share.shareCents);
    }
    const total = expense.shares.reduce((sum, s) => sum + s.shareCents, 0);
    net.set(expense.paidById, (net.get(expense.paidById) ?? 0) + total);
  }

  // Recorded settlements (real payments already made) reduce what's
  // still outstanding between the two parties involved.
  for (const s of settlements) {
    net.set(s.fromUserId, (net.get(s.fromUserId) ?? 0) + s.amountCents);
    net.set(s.toUserId, (net.get(s.toUserId) ?? 0) - s.amountCents);
  }

  return members.map((m) => ({
    userId: m.userId,
    name: m.name,
    netCents: net.get(m.userId) ?? 0,
  }));
}
