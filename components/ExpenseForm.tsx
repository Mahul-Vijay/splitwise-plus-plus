"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { dollarsToCents } from "@/lib/client/format";
import type { Member } from "@/types";

type SplitType = "equal" | "exact" | "percentage";

const CATEGORIES = ["general", "food", "travel", "lodging", "activities", "groceries", "utilities"];

export function ExpenseForm({
  groupId,
  members,
  meId,
}: {
  groupId: string;
  members: Member[];
  meId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [paidById, setPaidById] = useState(meId);
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [selected, setSelected] = useState<Set<string>>(new Set(members.map((m) => m.id)));
  const [exactValues, setExactValues] = useState<Record<string, string>>({});
  const [percentValues, setPercentValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const amountCents = useMemo(() => dollarsToCents(amount || "0"), [amount]);

  function toggleMember(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!description.trim()) return setError("Add a description");
    if (!amountCents || amountCents <= 0) return setError("Enter a valid amount");

    let payload: Record<string, unknown> = {
      description: description.trim(),
      amountCents,
      category,
      paidById,
      splitType,
    };

    if (splitType === "equal") {
      const participants = Array.from(selected);
      if (participants.length === 0) return setError("Select who's splitting this");
      payload.participants = participants;
    } else if (splitType === "exact") {
      const exactShares = members
        .filter((m) => selected.has(m.id))
        .map((m) => ({ userId: m.id, cents: dollarsToCents(exactValues[m.id] || "0") }));
      const sum = exactShares.reduce((s, x) => s + x.cents, 0);
      if (sum !== amountCents) {
        return setError(`Exact amounts sum to $${(sum / 100).toFixed(2)}, expected $${(amountCents / 100).toFixed(2)}`);
      }
      payload.exactShares = exactShares;
    } else {
      const percentageShares = members
        .filter((m) => selected.has(m.id))
        .map((m) => ({ userId: m.id, percent: Number.parseFloat(percentValues[m.id] || "0") }));
      const totalPct = percentageShares.reduce((s, x) => s + x.percent, 0);
      if (Math.abs(totalPct - 100) > 0.01) {
        return setError(`Percentages sum to ${totalPct}, expected 100`);
      }
      payload.percentageShares = percentageShares;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't add that expense");
        setLoading(false);
        return;
      }
      setOpen(false);
      setDescription("");
      setAmount("");
      setExactValues({});
      setPercentValues({});
      router.refresh();
    } catch {
      setError("Couldn't reach the server — try again");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full bg-teal-500 hover:bg-teal-400 text-ink-950 font-semibold px-4 py-2.5 rounded-lg transition-colors"
      >
        + Add an expense
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-teal-500/40 bg-ink-900/80 p-5 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <input
          autoFocus
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What was it for?"
          className="input col-span-2"
        />
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount ($)"
          inputMode="decimal"
          className="input"
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="input">
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c[0].toUpperCase() + c.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <span className="block text-xs font-mono text-paper-400 mb-1.5">Paid by</span>
        <select value={paidById} onChange={(e) => setPaidById(e.target.value)} className="input">
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.id === meId ? `${m.name} (you)` : m.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <span className="block text-xs font-mono text-paper-400 mb-1.5">Split</span>
        <div className="flex rounded-lg border border-ink-700 p-0.5 bg-ink-950/60 text-xs font-medium w-fit">
          {(["equal", "exact", "percentage"] as SplitType[]).map((s) => (
            <button
              type="button"
              key={s}
              onClick={() => setSplitType(s)}
              className={`px-3 py-1.5 rounded-md transition-colors capitalize ${
                splitType === s ? "bg-teal-500/20 text-teal-400" : "text-paper-400 hover:text-paper-100"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={selected.has(m.id)}
              onChange={() => toggleMember(m.id)}
              className="accent-teal-500 w-4 h-4"
            />
            <span className="text-sm text-paper-100 flex-1">{m.id === meId ? `${m.name} (you)` : m.name}</span>
            {splitType === "exact" && selected.has(m.id) && (
              <input
                value={exactValues[m.id] ?? ""}
                onChange={(e) => setExactValues((v) => ({ ...v, [m.id]: e.target.value }))}
                placeholder="$0.00"
                inputMode="decimal"
                className="input w-24 py-1 text-xs"
              />
            )}
            {splitType === "percentage" && selected.has(m.id) && (
              <input
                value={percentValues[m.id] ?? ""}
                onChange={(e) => setPercentValues((v) => ({ ...v, [m.id]: e.target.value }))}
                placeholder="0%"
                inputMode="decimal"
                className="input w-20 py-1 text-xs"
              />
            )}
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-coral-400">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-ink-950 text-sm font-semibold py-2.5 rounded-lg transition-colors"
        >
          {loading ? "Adding…" : "Add expense"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-4 text-sm text-paper-400 hover:text-paper-100"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
