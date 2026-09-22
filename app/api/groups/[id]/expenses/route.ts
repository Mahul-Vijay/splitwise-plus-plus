import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, requireGroupMember } from "@/lib/requireUser";

const SplitTypeSchema = z.enum(["equal", "exact", "percentage"]);

const CreateExpenseSchema = z.object({
  description: z.string().trim().min(1, "Description is required"),
  amountCents: z.number().int().positive("Amount must be greater than 0"),
  category: z.string().trim().optional().default("general"),
  paidById: z.string().min(1),
  splitType: SplitTypeSchema,
  // For "equal": just the list of participant userIds.
  // For "exact": { userId, cents }[] that must sum to amountCents.
  // For "percentage": { userId, percent }[] that must sum to 100.
  participants: z.array(z.string()).optional(),
  exactShares: z.array(z.object({ userId: z.string(), cents: z.number().int().nonnegative() })).optional(),
  percentageShares: z.array(z.object({ userId: z.string(), percent: z.number().nonnegative() })).optional(),
});

/**
 * Splits amountCents equally among n participants, distributing the
 * unavoidable rounding remainder (integer cents don't always divide
 * evenly) one cent at a time to the first participants in the list so
 * the shares still sum exactly to amountCents.
 */
function splitEqually(amountCents: number, participantIds: string[]) {
  const n = participantIds.length;
  const base = Math.floor(amountCents / n);
  const remainder = amountCents - base * n;
  return participantIds.map((userId, i) => ({
    userId,
    shareCents: base + (i < remainder ? 1 : 0),
  }));
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { session, unauthorized } = await requireUser();
  if (!session) return unauthorized;

  const { forbidden } = await requireGroupMember(session.userId, params.id);
  if (forbidden) return forbidden;

  const expenses = await prisma.expense.findMany({
    where: { groupId: params.id },
    orderBy: { createdAt: "desc" },
    include: {
      paidBy: { select: { id: true, name: true } },
      shares: { include: { user: { select: { id: true, name: true } } } },
    },
  });

  return NextResponse.json({ expenses });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, unauthorized } = await requireUser();
  if (!session) return unauthorized;

  const { forbidden } = await requireGroupMember(session.userId, params.id);
  if (forbidden) return forbidden;

  const body = await req.json().catch(() => null);
  const parsed = CreateExpenseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const data = parsed.data;

  // Confirm every referenced user (payer + all participants) is
  // actually a member of this group before we let money move.
  const groupMemberIds = new Set(
    (await prisma.membership.findMany({ where: { groupId: params.id }, select: { userId: true } })).map(
      (m) => m.userId
    )
  );

  if (!groupMemberIds.has(data.paidById)) {
    return NextResponse.json({ error: "Payer must be a member of this group" }, { status: 400 });
  }

  let shares: { userId: string; shareCents: number }[] = [];

  if (data.splitType === "equal") {
    const participants = data.participants ?? [];
    if (participants.length === 0) {
      return NextResponse.json({ error: "Select at least one participant" }, { status: 400 });
    }
    if (!participants.every((id) => groupMemberIds.has(id))) {
      return NextResponse.json({ error: "All participants must be group members" }, { status: 400 });
    }
    shares = splitEqually(data.amountCents, participants);
  } else if (data.splitType === "exact") {
    const exact = data.exactShares ?? [];
    if (exact.length === 0) {
      return NextResponse.json({ error: "Provide exact amounts for each participant" }, { status: 400 });
    }
    if (!exact.every((s) => groupMemberIds.has(s.userId))) {
      return NextResponse.json({ error: "All participants must be group members" }, { status: 400 });
    }
    const sum = exact.reduce((acc, s) => acc + s.cents, 0);
    if (sum !== data.amountCents) {
      return NextResponse.json(
        { error: `Exact shares must sum to the total (got ${sum / 100}, expected ${data.amountCents / 100})` },
        { status: 400 }
      );
    }
    shares = exact.map((s) => ({ userId: s.userId, shareCents: s.cents }));
  } else {
    const pct = data.percentageShares ?? [];
    if (pct.length === 0) {
      return NextResponse.json({ error: "Provide percentages for each participant" }, { status: 400 });
    }
    if (!pct.every((s) => groupMemberIds.has(s.userId))) {
      return NextResponse.json({ error: "All participants must be group members" }, { status: 400 });
    }
    const totalPct = pct.reduce((acc, s) => acc + s.percent, 0);
    if (Math.abs(totalPct - 100) > 0.01) {
      return NextResponse.json({ error: `Percentages must sum to 100 (got ${totalPct})` }, { status: 400 });
    }
    // Same remainder-distribution trick as splitEqually, so percentage
    // splits also land on an exact integer-cent total.
    const raw = pct.map((s) => Math.floor((s.percent / 100) * data.amountCents));
    const distributed = raw.reduce((acc, c) => acc + c, 0);
    let remainder = data.amountCents - distributed;
    shares = pct.map((s, i) => {
      const bonus = remainder > 0 ? 1 : 0;
      if (remainder > 0) remainder -= 1;
      return { userId: s.userId, shareCents: raw[i] + bonus };
    });
  }

  const expense = await prisma.expense.create({
    data: {
      description: data.description,
      amountCents: data.amountCents,
      category: data.category,
      groupId: params.id,
      paidById: data.paidById,
      shares: { create: shares },
    },
    include: {
      paidBy: { select: { id: true, name: true } },
      shares: { include: { user: { select: { id: true, name: true } } } },
    },
  });

  return NextResponse.json({ expense }, { status: 201 });
}
