"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export function Navbar({ userName }: { userName?: string }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="border-b border-ink-700/60 bg-ink-950/80 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
        <Link href={userName ? "/dashboard" : "/"} className="flex items-center gap-2 group">
          <span className="text-xl">💸</span>
          <span className="font-display font-semibold text-lg tracking-tight text-paper-100">
            SplitWise<span className="text-teal-400">++</span>
          </span>
        </Link>

        {userName ? (
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline text-sm text-paper-400 font-body">
              Signed in as <span className="text-paper-100">{userName}</span>
            </span>
            <button
              onClick={handleLogout}
              className="text-sm font-medium text-paper-400 hover:text-coral-400 transition-colors px-3 py-1.5 rounded-md border border-ink-700 hover:border-coral-500/40"
            >
              Sign out
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-paper-400 hover:text-paper-100 transition-colors px-3 py-1.5"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="text-sm font-semibold bg-teal-500 text-ink-950 hover:bg-teal-400 transition-colors px-4 py-1.5 rounded-md"
            >
              Get started
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
