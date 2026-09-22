import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, requireGroupMember } from "@/lib/requireUser";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { session, unauthorized } = await requireUser();
  if (!session) return unauthorized;

  const { forbidden } = await requireGroupMember(session.userId, params.id);
  if (forbidden) return forbidden;

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
    },
  });

  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  return NextResponse.json({ group });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { session, unauthorized } = await requireUser();
  if (!session) return unauthorized;

  const { membership, forbidden } = await requireGroupMember(session.userId, params.id);
  if (forbidden) return forbidden;

  if (membership.role !== "owner") {
    return NextResponse.json({ error: "Only the group owner can delete this group" }, { status: 403 });
  }

  await prisma.group.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
