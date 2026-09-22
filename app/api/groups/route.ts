import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/requireUser";

const CreateGroupSchema = z.object({
  name: z.string().trim().min(2, "Group name must be at least 2 characters"),
  emoji: z.string().trim().optional(),
  memberEmails: z.array(z.string().trim().toLowerCase().email()).optional().default([]),
});

// List every group the signed-in user belongs to, with a lightweight
// member count and expense count for the dashboard cards.
export async function GET() {
  const { session, unauthorized } = await requireUser();
  if (!session) return unauthorized;

  const memberships = await prisma.membership.findMany({
    where: { userId: session.userId },
    include: {
      group: {
        include: {
          _count: { select: { members: true, expenses: true } },
        },
      },
    },
    orderBy: { group: { createdAt: "desc" } },
  });

  const groups = memberships.map((m) => ({
    id: m.group.id,
    name: m.group.name,
    emoji: m.group.emoji,
    memberCount: m.group._count.members,
    expenseCount: m.group._count.expenses,
    role: m.role,
  }));

  return NextResponse.json({ groups });
}

// Create a group. The creator is auto-added as owner. Optional
// memberEmails invites existing users by email; unknown emails are
// silently skipped (v1 has no email-invite flow — see README roadmap).
export async function POST(req: NextRequest) {
  const { session, unauthorized } = await requireUser();
  if (!session) return unauthorized;

  const body = await req.json().catch(() => null);
  const parsed = CreateGroupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { name, emoji, memberEmails } = parsed.data;

  const invitedUsers = memberEmails.length
    ? await prisma.user.findMany({ where: { email: { in: memberEmails } } })
    : [];

  const memberUserIds = new Set(invitedUsers.map((u) => u.id));
  memberUserIds.add(session.userId);

  const group = await prisma.group.create({
    data: {
      name,
      emoji: emoji || "💸",
      members: {
        create: Array.from(memberUserIds).map((userId) => ({
          userId,
          role: userId === session.userId ? "owner" : "member",
        })),
      },
    },
  });

  const skippedEmails = memberEmails.filter(
    (email) => !invitedUsers.some((u) => u.email === email)
  );

  return NextResponse.json({ group, skippedEmails }, { status: 201 });
}
