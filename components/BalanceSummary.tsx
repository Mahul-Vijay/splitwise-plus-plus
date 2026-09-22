import { avatarColor, centsToDisplay, initials } from "@/lib/client/format";
import type { Balance } from "@/types";

export function BalanceSummary({ balances, meId }: { balances: Balance[]; meId: string }) {
  const sorted = [...balances].sort((a, b) => b.netCents - a.netCents);

  return (
    <div className="rounded-xl border border-ink-700 bg-ink-900/60 p-5">
      <h3 className="font-display font-semibold text-paper-100 mb-4">Balances</h3>
      <ul className="space-y-3">
        {sorted.map((b) => (
          <li key={b.userId} className="flex items-center gap-3">
            <span
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-display font-semibold text-ink-950 shrink-0"
              style={{ backgroundColor: avatarColor(b.userId) }}
            >
              {initials(b.name)}
            </span>
            <span className="text-sm text-paper-100 flex-1 truncate">
              {b.name}
              {b.userId === meId && <span className="text-paper-400"> (you)</span>}
            </span>
            <span
              className={`font-mono text-sm font-medium ${
                b.netCents > 0 ? "text-teal-400" : b.netCents < 0 ? "text-coral-400" : "text-paper-400"
              }`}
            >
              {b.netCents === 0
                ? "settled"
                : b.netCents > 0
                ? `is owed ${centsToDisplay(b.netCents)}`
                : `owes ${centsToDisplay(-b.netCents)}`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
