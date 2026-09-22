"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { avatarColor, centsToDisplay, initials } from "@/lib/client/format";
import type { SimplifiedTransaction } from "@/types";

export function SettlementSuggestions({
  groupId,
  transactions,
  naiveCount,
}: {
  groupId: string;
  transactions: SimplifiedTransaction[];
  naiveCount: number;
}) {
  const router = useRouter();
  const [recordingKey, setRecordingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function recordPayment(t: SimplifiedTransaction) {
    const key = `${t.fromUserId}-${t.toUserId}`;
    setRecordingKey(key);
    setError(null);
    try {
      const res = await fetch(`/api/groups/${groupId}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromUserId: t.fromUserId,
          toUserId: t.toUserId,
          amountCents: t.amountCents,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't record that payment");
        setRecordingKey(null);
        return;
      }
      router.refresh();
    } catch {
      setError("Couldn't reach the server — try again");
    } finally {
      setRecordingKey(null);
    }
  }

  return (
    <div className="rounded-xl border border-ink-700 bg-ink-900/60 p-5">
      <div className="flex items-baseline justify-between mb-1">
        <h3 className="font-display font-semibold text-paper-100">Suggested settlements</h3>
        {naiveCount > transactions.length && (
          <span className="text-xs font-mono text-teal-400">
            {naiveCount} → {transactions.length}
          </span>
        )}
      </div>
      <p className="text-xs text-paper-400 mb-4">
        The minimum set of payments that settles this group, computed by the debt-simplification algorithm.
      </p>

      {transactions.length === 0 ? (
        <p className="text-sm text-paper-400 py-4 text-center">Everyone&apos;s settled up 🎉</p>
      ) : (
        <ul className="space-y-2">
          {transactions.map((t) => {
            const key = `${t.fromUserId}-${t.toUserId}`;
            return (
              <li
                key={key}
                className="flex items-center gap-3 rounded-lg border border-ink-700 bg-ink-950/50 px-3 py-2.5"
              >
                <Avatar id={t.fromUserId} name={t.fromName} />
                <span className="text-sm text-paper-100">{t.fromName}</span>
                <span className="text-paper-400 text-xs">pays</span>
                <span className="font-mono text-sm text-amber-400 font-medium">{centsToDisplay(t.amountCents)}</span>
                <span className="text-paper-400 text-xs">to</span>
                <Avatar id={t.toUserId} name={t.toName} />
                <span className="text-sm text-paper-100">{t.toName}</span>
                <button
                  onClick={() => recordPayment(t)}
                  disabled={recordingKey === key}
                  className="ml-auto text-xs font-medium text-teal-400 hover:text-teal-300 disabled:opacity-50 border border-teal-500/30 hover:border-teal-500/60 rounded-md px-2.5 py-1 transition-colors"
                >
                  {recordingKey === key ? "Recording…" : "Mark paid"}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {error && <p className="text-xs text-coral-400 mt-3">{error}</p>}
    </div>
  );
}

function Avatar({ id, name }: { id: string; name: string }) {
  return (
    <span
      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-display font-semibold text-ink-950 shrink-0"
      style={{ backgroundColor: avatarColor(id) }}
    >
      {initials(name)}
    </span>
  );
}
