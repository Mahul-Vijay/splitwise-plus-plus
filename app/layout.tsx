import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SplitWise++ — Settle groups in the fewest possible payments",
  description:
    "Group expense splitting with graph-based debt simplification. Log expenses any way you like; SplitWise++ reduces the tangle to the minimum set of payments.",
};

// Fonts are loaded via a classic <link> tag rather than next/font, so
// the production build never depends on reaching fonts.googleapis.com
// at build time (useful in CI/sandboxed environments with restricted
// network egress). The browser fetches them at runtime instead.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
