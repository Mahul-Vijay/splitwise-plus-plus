"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { centsToDisplay } from "@/lib/client/format";
import type { Expense } from "@/types";

const CATEGORY_EMOJI: Record<string, string> = {
  general: "🧾",
  food: "🍜",
  travel: "🚕",
  lodging: "🏨",
  activities: "🎟️",
  groceries: "🛒",
  utilities: "💡",
};

export function ExpenseList({ groupId, expenses, meId }: { groupId: string; expenses: Expense[]; meId: string }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await fetch(`/api/groups/${groupId}/expenses/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  if (expenses.length === 0) {
    return (
      <div className="rounded-xl border border-ink-700 bg-ink-900/60 p-8 text-center text-paper-400 text-sm">
        No expenses yet. Add the first one above.
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {expenses.map((e) => (
        <li
          key={e.id}
          className="rounded-xl border border-ink-700 bg-ink-900/60 px-4 py-3 flex items-center gap-3"
        >
          <span className="text-xl shrink-0">{CATEGORY_EMOJI[e.category] ?? "🧾"}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-paper-100 font-medium truncate">{e.description}</p>
            <p className="text-xs text-paper-400 font-mono mt-0.5">
              {e.paidBy.name} paid · split {e.shares.length} way{e.shares.length === 1 ? "" : "s"} ·{" "}
              {new Date(e.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </p>
          </div>
          <span className="font-mono text-sm text-paper-100 font-medium shrink-0">{centsToDisplay(e.amountCents)}</span>
          {e.paidBy.id === meId && (
            <button
              onClick={() => handleDelete(e.id)}
              disabled={deletingId === e.id}
              className="text-xs text-paper-400 hover:text-coral-400 disabled:opacity-50 shrink-0"
              aria-label={`Delete ${e.description}`}
            >
              {deletingId === e.id ? "…" : "✕"}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
