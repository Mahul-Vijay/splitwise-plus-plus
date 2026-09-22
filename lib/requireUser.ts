import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * Shared guard for API route handlers. Returns the session if present,
 * otherwise returns a 401 NextResponse the caller should return immediately.
 */
export async function requireUser() {
  const session = await getSession();
  if (!session) {
    return { session: null, unauthorized: NextResponse.json({ error: "Not signed in" }, { status: 401 }) };
  }
  return { session, unauthorized: null };
}

/**
 * Confirms the given user is a member of the given group. Used by every
 * group-scoped route so people can't view or mutate a group's data just
 * by guessing its id.
 */
export async function requireGroupMember(userId: string, groupId: string) {
  const membership = await prisma.membership.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });
  if (!membership) {
    return { membership: null, forbidden: NextResponse.json({ error: "Not a member of this group" }, { status: 403 }) };
  }
  return { membership, forbidden: null };
}
