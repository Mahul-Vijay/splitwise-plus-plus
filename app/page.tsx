import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/Navbar";
import { HeroGraphDemo } from "@/components/HeroGraphDemo";

export default async function LandingPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <div className="min-h-screen">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 pt-16 pb-20 grid md:grid-cols-2 gap-12 items-center">
        <div className="fade-up">
          <span className="inline-block text-xs font-mono tracking-wide text-teal-400 border border-teal-500/30 bg-teal-500/10 rounded-full px-3 py-1 mb-6">
            min-cash-flow, not another expense spreadsheet
          </span>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.1] text-paper-100">
            Log expenses however you like.
            <br />
            <span className="text-teal-400">Settle in the fewest payments.</span>
          </h1>
          <p className="mt-6 text-paper-400 text-lg leading-relaxed max-w-lg">
            Every group trip ends the same way: a tangle of who-owes-who. SplitWise++
            runs your group&apos;s expenses through a debt-simplification graph algorithm
            and collapses it down to the minimum set of transactions that actually
            settles everyone up.
          </p>
          <div className="mt-8 flex items-center gap-4">
            <Link
              href="/register"
              className="bg-teal-500 hover:bg-teal-400 text-ink-950 font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Start a group — it&apos;s free
            </Link>
            <Link href="/login" className="text-paper-400 hover:text-paper-100 font-medium transition-colors">
              I already have an account →
            </Link>
          </div>
        </div>

        <div className="fade-up" style={{ animationDelay: "120ms" }}>
          <HeroGraphDemo />
        </div>
      </section>

      <section className="border-t border-ink-700/60 bg-ink-900/40">
        <div className="mx-auto max-w-6xl px-6 py-16 grid sm:grid-cols-3 gap-8">
          <Feature
            eyebrow="01 — Log"
            title="Split it any way"
            body="Equal splits, exact amounts, or percentages. Every expense records exactly who owes what, in cents, no rounding drift."
          />
          <Feature
            eyebrow="02 — Simplify"
            title="Graph reduction, not guesswork"
            body="A min-cash-flow algorithm nets every balance and matches biggest debtor to biggest creditor until the group is settled."
          />
          <Feature
            eyebrow="03 — Settle"
            title="Fewer payments, less awkwardness"
            body="See exactly who should pay whom — often far fewer transfers than the raw expense history would suggest."
          />
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-6 py-10 text-xs text-paper-400 font-mono">
        SplitWise++ · built as a full-stack demo project
      </footer>
    </div>
  );
}

function Feature({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <div>
      <div className="text-xs font-mono text-amber-400 mb-2">{eyebrow}</div>
      <h3 className="font-display font-semibold text-paper-100 text-lg mb-2">{title}</h3>
      <p className="text-sm text-paper-400 leading-relaxed">{body}</p>
    </div>
  );
}
