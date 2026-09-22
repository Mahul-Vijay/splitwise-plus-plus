import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, requireGroupMember } from "@/lib/requireUser";

const SettleSchema = z.object({
  fromUserId: z.string().min(1),
  toUserId: z.string().min(1),
  amountCents: z.number().int().positive("Amount must be greater than 0"),
});

// Records that a real payment happened (e.g. "Bob venmo'd Alice $12").
// This is separate from the simplified-transaction *suggestions* the
// balances endpoint computes — those are recalculated fresh every time
// from expenses + settlements, never stored directly.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, unauthorized } = await requireUser();
  if (!session) return unauthorized;

  const { forbidden } = await requireGroupMember(session.userId, params.id);
  if (forbidden) return forbidden;

  const body = await req.json().catch(() => null);
  const parsed = SettleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { fromUserId, toUserId, amountCents } = parsed.data;

  if (fromUserId === toUserId) {
    return NextResponse.json({ error: "A payment needs two different people" }, { status: 400 });
  }

  const groupMemberIds = new Set(
    (await prisma.membership.findMany({ where: { groupId: params.id }, select: { userId: true } })).map(
      (m) => m.userId
    )
  );
  if (!groupMemberIds.has(fromUserId) || !groupMemberIds.has(toUserId)) {
    return NextResponse.json({ error: "Both people must be members of this group" }, { status: 400 });
  }

  const settlement = await prisma.settlement.create({
    data: { groupId: params.id, fromUserId, toUserId, amountCents },
    include: {
      fromUser: { select: { id: true, name: true } },
      toUser: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ settlement }, { status: 201 });
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { session, unauthorized } = await requireUser();
  if (!session) return unauthorized;

  const { forbidden } = await requireGroupMember(session.userId, params.id);
  if (forbidden) return forbidden;

  const settlements = await prisma.settlement.findMany({
    where: { groupId: params.id },
    orderBy: { createdAt: "desc" },
    include: {
      fromUser: { select: { id: true, name: true } },
      toUser: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ settlements });
}
