"use client";

import { useEffect, useState } from "react";

const DEMO_NODES = [
  { id: "a", label: "AL", name: "Alex", x: 320, y: 60 },
  { id: "b", label: "PR", name: "Priya", x: 560, y: 220 },
  { id: "c", label: "SM", name: "Sam", x: 460, y: 420 },
  { id: "d", label: "JO", name: "Jordan", x: 180, y: 420 },
  { id: "e", label: "MI", name: "Mina", x: 80, y: 220 },
];

const RAW_EDGES = [
  { from: "a", to: "b", amount: "$18" },
  { from: "b", to: "c", amount: "$9" },
  { from: "c", to: "d", amount: "$24" },
  { from: "d", to: "e", amount: "$6" },
  { from: "e", to: "a", amount: "$15" },
  { from: "b", to: "d", amount: "$11" },
  { from: "c", to: "a", amount: "$7" },
];

const SIMPLIFIED_EDGES = [
  { from: "d", to: "a", amount: "$21" },
  { from: "e", to: "b", amount: "$9" },
];

function byId(id: string) {
  return DEMO_NODES.find((n) => n.id === id)!;
}

function Edge({ from, to, amount, color }: { from: string; to: string; amount: string; color: string }) {
  const a = byId(from);
  const b = byId(to);
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const ctrlX = mx + nx * 30;
  const ctrlY = my + ny * 30;
  const pull = 30;
  const sx = a.x + (dx / len) * pull;
  const sy = a.y + (dy / len) * pull;
  const ex = b.x - (dx / len) * pull;
  const ey = b.y - (dy / len) * pull;

  return (
    <g opacity={0.95}>
      <path
        d={`M ${sx} ${sy} Q ${ctrlX} ${ctrlY} ${ex} ${ey}`}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        markerEnd={`url(#hero-arrow-${color === "#F25C4D" ? "raw" : "simple"})`}
      />
      <text
        x={ctrlX}
        y={ctrlY}
        textAnchor="middle"
        fontSize="12"
        className="fill-paper-100 font-mono"
        style={{ paintOrder: "stroke", stroke: "#0B0E13", strokeWidth: 4 }}
      >
        {amount}
      </text>
    </g>
  );
}

export function HeroGraphDemo() {
  const [mode, setMode] = useState<"raw" | "simplified">("raw");

  useEffect(() => {
    const id = setInterval(() => {
      setMode((m) => (m === "raw" ? "simplified" : "raw"));
    }, 3200);
    return () => clearInterval(id);
  }, []);

  const edges = mode === "raw" ? RAW_EDGES : SIMPLIFIED_EDGES;
  const color = mode === "raw" ? "#F25C4D" : "#2DD4BF";

  return (
    <div className="relative">
      <svg viewBox="0 0 640 480" className="w-full h-auto">
        <defs>
          <marker id="hero-arrow-raw" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="#F25C4D" />
          </marker>
          <marker id="hero-arrow-simple" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="#2DD4BF" />
          </marker>
        </defs>

        {edges.map((e, i) => (
          <Edge key={`${mode}-${i}`} from={e.from} to={e.to} amount={e.amount} color={color} />
        ))}

        {DEMO_NODES.map((n) => (
          <g key={n.id}>
            <circle cx={n.x} cy={n.y} r={30} fill="#12151C" stroke={color} strokeOpacity={0.5} strokeWidth={2} />
            <text x={n.x} y={n.y + 5} textAnchor="middle" fontSize="15" className="fill-paper-100 font-display font-semibold">
              {n.label}
            </text>
            <text x={n.x} y={n.y + 48} textAnchor="middle" fontSize="12" className="fill-paper-400 font-body">
              {n.name}
            </text>
          </g>
        ))}
      </svg>

      <div className="absolute top-0 left-0 flex items-center gap-2 text-xs font-mono">
        <span className={`px-2 py-1 rounded ${mode === "raw" ? "bg-coral-500/20 text-coral-400" : "bg-ink-800 text-paper-400"}`}>
          7 raw transactions
        </span>
        <span className="text-paper-400">→</span>
        <span className={`px-2 py-1 rounded ${mode === "simplified" ? "bg-teal-500/20 text-teal-400" : "bg-ink-800 text-paper-400"}`}>
          2 payments
        </span>
      </div>
    </div>
  );
}
