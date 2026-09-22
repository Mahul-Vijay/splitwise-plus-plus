"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AddMemberForm({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't add that member");
        setLoading(false);
        return;
      }
      setEmail("");
      setOpen(false);
      router.refresh();
    } catch {
      setError("Couldn't reach the server — try again");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs text-teal-400 hover:text-teal-300 font-medium">
        + Add member
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        autoFocus
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="member@email.com"
        type="email"
        required
        className="input py-1 text-xs w-48"
      />
      <button
        type="submit"
        disabled={loading}
        className="text-xs bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-ink-950 font-semibold px-2.5 py-1.5 rounded-md"
      >
        {loading ? "…" : "Add"}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs text-paper-400">
        Cancel
      </button>
      {error && <span className="text-xs text-coral-400">{error}</span>}
    </form>
  );
}
