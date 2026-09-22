import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, requireGroupMember } from "@/lib/requireUser";

const AddMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, unauthorized } = await requireUser();
  if (!session) return unauthorized;

  const { forbidden } = await requireGroupMember(session.userId, params.id);
  if (forbidden) return forbidden;

  const body = await req.json().catch(() => null);
  const parsed = AddMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) {
    return NextResponse.json(
      { error: "No account with that email yet — they need to sign up first" },
      { status: 404 }
    );
  }

  const existing = await prisma.membership.findUnique({
    where: { userId_groupId: { userId: user.id, groupId: params.id } },
  });
  if (existing) {
    return NextResponse.json({ error: "Already a member of this group" }, { status: 409 });
  }

  const membership = await prisma.membership.create({
    data: { userId: user.id, groupId: params.id, role: "member" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json({ membership }, { status: 201 });
}
