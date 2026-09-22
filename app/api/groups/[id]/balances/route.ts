import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, requireGroupMember } from "@/lib/requireUser";
import { computeNetBalances, simplifyDebts } from "@/lib/simplifyDebts";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { session, unauthorized } = await requireUser();
  if (!session) return unauthorized;

  const { forbidden } = await requireGroupMember(session.userId, params.id);
  if (forbidden) return forbidden;

  const [members, expenses, settlements] = await Promise.all([
    prisma.membership.findMany({
      where: { groupId: params.id },
      include: { user: { select: { id: true, name: true } } },
    }),
    prisma.expense.findMany({
      where: { groupId: params.id },
      include: { shares: true },
    }),
    prisma.settlement.findMany({ where: { groupId: params.id } }),
  ]);

  const memberList = members.map((m) => ({ userId: m.userId, name: m.user.name }));

  const balances = computeNetBalances(
    memberList,
    expenses.map((e) => ({ paidById: e.paidById, shares: e.shares })),
    settlements.map((s) => ({ fromUserId: s.fromUserId, toUserId: s.toUserId, amountCents: s.amountCents }))
  );

  // Naive pairwise transaction count, for the UI to show the
  // "N transactions -> simplified to M" comparison that's the whole
  // point of the project.
  const naiveTransactionCount = expenses.reduce((count, e) => {
    // Every share row that isn't the payer's own share is one raw debt edge.
    return count + e.shares.filter((s) => s.userId !== e.paidById).length;
  }, 0);

  const simplified = simplifyDebts(balances);

  return NextResponse.json({
    balances,
    simplifiedTransactions: simplified,
    stats: {
      naiveTransactionCount,
      simplifiedTransactionCount: simplified.length,
    },
  });
}
