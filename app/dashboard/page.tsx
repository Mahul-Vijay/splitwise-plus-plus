import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Navbar } from "@/components/Navbar";
import { GroupCard } from "@/components/GroupCard";
import { CreateGroupCard } from "@/components/CreateGroupCard";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const memberships = await prisma.membership.findMany({
    where: { userId: session.userId },
    include: {
      group: { include: { _count: { select: { members: true, expenses: true } } } },
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

  return (
    <div className="min-h-screen">
      <Navbar userName={session.name} />
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-semibold text-paper-100">Your groups</h1>
          <p className="text-sm text-paper-400 mt-1">
            {groups.length === 0
              ? "Create your first group to start splitting expenses."
              : `${groups.length} group${groups.length === 1 ? "" : "s"} · pick one to log an expense or see who owes what.`}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((g) => (
            <GroupCard key={g.id} group={g} />
          ))}
          <CreateGroupCard />
        </div>
      </div>
    </div>
  );
}
