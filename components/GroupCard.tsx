import Link from "next/link";
import type { GroupSummary } from "@/types";

export function GroupCard({ group }: { group: GroupSummary }) {
  return (
    <Link
      href={`/groups/${group.id}`}
      className="rounded-xl border border-ink-700 bg-ink-900/60 hover:border-teal-500/40 hover:bg-ink-900 transition-colors p-5 flex flex-col gap-3 min-h-[168px]"
    >
      <div className="flex items-start justify-between">
        <span className="text-2xl">{group.emoji}</span>
        {group.role === "owner" && (
          <span className="text-[10px] font-mono uppercase tracking-wide text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5">
            owner
          </span>
        )}
      </div>
      <h3 className="font-display font-semibold text-paper-100 text-lg leading-tight">{group.name}</h3>
      <div className="mt-auto flex items-center gap-3 text-xs text-paper-400 font-mono">
        <span>{group.memberCount} member{group.memberCount === 1 ? "" : "s"}</span>
        <span>·</span>
        <span>{group.expenseCount} expense{group.expenseCount === 1 ? "" : "s"}</span>
      </div>
    </Link>
  );
}
