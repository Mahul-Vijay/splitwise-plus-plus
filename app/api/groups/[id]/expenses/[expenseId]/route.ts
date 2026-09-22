import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, requireGroupMember } from "@/lib/requireUser";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; expenseId: string } }
) {
  const { session, unauthorized } = await requireUser();
  if (!session) return unauthorized;

  const { forbidden } = await requireGroupMember(session.userId, params.id);
  if (forbidden) return forbidden;

  const expense = await prisma.expense.findUnique({ where: { id: params.expenseId } });
  if (!expense || expense.groupId !== params.id) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  // Only the person who logged the expense (the payer) can remove it —
  // keeps other members from silently erasing money they're owed.
  if (expense.paidById !== session.userId) {
    return NextResponse.json({ error: "Only the payer can delete this expense" }, { status: 403 });
  }

  await prisma.expense.delete({ where: { id: params.expenseId } });
  return NextResponse.json({ ok: true });
}
