"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const EMOJI_OPTIONS = ["💸", "🏠", "✈️", "🍕", "🎉", "🏕️", "🚗", "🎓"];

export function CreateGroupCard() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState(EMOJI_OPTIONS[0]);
  const [emailsInput, setEmailsInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const memberEmails = emailsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, emoji, memberEmails }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't create the group");
        setLoading(false);
        return;
      }
      setOpen(false);
      setName("");
      setEmailsInput("");
      router.refresh();
    } catch {
      setError("Couldn't reach the server — try again");
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="group border-2 border-dashed border-ink-700 hover:border-teal-500/50 rounded-xl p-6 flex flex-col items-center justify-center gap-2 text-paper-400 hover:text-teal-400 transition-colors min-h-[168px]"
      >
        <span className="text-3xl">+</span>
        <span className="text-sm font-medium">New group</span>
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-teal-500/40 bg-ink-900/80 p-5 flex flex-col gap-3 min-h-[168px]"
    >
      <div className="flex gap-2">
        {EMOJI_OPTIONS.map((e) => (
          <button
            type="button"
            key={e}
            onClick={() => setEmoji(e)}
            className={`text-lg w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
              emoji === e ? "bg-teal-500/20 ring-1 ring-teal-500/50" : "hover:bg-ink-800"
            }`}
          >
            {e}
          </button>
        ))}
      </div>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Group name (e.g. Goa Trip)"
        required
        minLength={2}
        className="input"
      />
      <input
        value={emailsInput}
        onChange={(e) => setEmailsInput(e.target.value)}
        placeholder="Invite by email, comma-separated (optional)"
        className="input text-xs"
      />
      {error && <p className="text-xs text-coral-400">{error}</p>}
      <div className="flex gap-2 mt-auto">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-ink-950 text-sm font-semibold py-2 rounded-lg transition-colors"
        >
          {loading ? "Creating…" : "Create group"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-3 text-sm text-paper-400 hover:text-paper-100"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
