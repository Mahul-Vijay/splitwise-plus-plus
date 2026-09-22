"use client";

import { useMemo, useState } from "react";
import { avatarColor, centsToDisplay, initials } from "@/lib/client/format";
import type { Expense, SimplifiedTransaction } from "@/types";

type GraphEdge = {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amountCents: number;
};

type Node = { id: string; name: string; x: number; y: number };

const WIDTH = 640;
const HEIGHT = 420;
const CENTER = { x: WIDTH / 2, y: HEIGHT / 2 };
const RADIUS = Math.min(WIDTH, HEIGHT) / 2 - 70;

function layoutNodes(memberIds: { id: string; name: string }[]): Node[] {
  const n = memberIds.length;
  return memberIds.map((m, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    return {
      id: m.id,
      name: m.name,
      x: CENTER.x + RADIUS * Math.cos(angle),
      y: CENTER.y + RADIUS * Math.sin(angle),
    };
  });
}

/** Raw per-expense debts: every non-payer share is one directed edge to the payer. */
function deriveNaiveEdges(expenses: Expense[]): GraphEdge[] {
  const agg = new Map<string, GraphEdge>();
  for (const expense of expenses) {
    for (const share of expense.shares) {
      if (share.userId === expense.paidBy.id) continue;
      const key = `${share.userId}->${expense.paidBy.id}`;
      const existing = agg.get(key);
      if (existing) {
        existing.amountCents += share.shareCents;
      } else {
        agg.set(key, {
          fromId: share.userId,
          fromName: share.user.name,
          toId: expense.paidBy.id,
          toName: expense.paidBy.name,
          amountCents: share.shareCents,
        });
      }
    }
  }
  return Array.from(agg.values());
}

function EdgeArrow({
  from,
  to,
  color,
  label,
  curveOffset,
  animate,
}: {
  from: Node;
  to: Node;
  color: string;
  label: string;
  curveOffset: number;
  animate: boolean;
}) {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  // perpendicular offset so edges curve outward instead of overlapping straight lines
  const nx = -dy / len;
  const ny = dx / len;
  const ctrlX = mx + nx * curveOffset;
  const ctrlY = my + ny * curveOffset;

  // Pull the endpoint back a bit so the arrowhead doesn't sit under the node circle.
  const pullBack = 26;
  const endX = to.x - (dx / len) * pullBack;
  const endY = to.y - (dy / len) * pullBack;
  const startX = from.x + (dx / len) * pullBack;
  const startY = from.y + (dy / len) * pullBack;

  const path = `M ${startX} ${startY} Q ${ctrlX} ${ctrlY} ${endX} ${endY}`;

  return (
    <g opacity={0.92}>
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        markerEnd="url(#arrowhead)"
        className={animate ? "edge-animate" : undefined}
        style={
          animate
            ? ({ strokeDasharray: 300, ["--dash-length" as string]: 300 } as React.CSSProperties)
            : undefined
        }
      />
      <text
        x={ctrlX}
        y={ctrlY}
        textAnchor="middle"
        className="fill-paper-100 font-mono"
        fontSize="11"
        style={{ paintOrder: "stroke", stroke: "#0B0E13", strokeWidth: 4 }}
      >
        {label}
      </text>
    </g>
  );
}

export function DebtGraph({
  members,
  expenses,
  simplifiedTransactions,
}: {
  members: { id: string; name: string }[];
  expenses: Expense[];
  simplifiedTransactions: SimplifiedTransaction[];
}) {
  const [mode, setMode] = useState<"raw" | "simplified">("simplified");
  const nodes = useMemo(() => layoutNodes(members), [members]);
  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const naiveEdges = useMemo(() => deriveNaiveEdges(expenses), [expenses]);
  const simplifiedEdges: GraphEdge[] = useMemo(
    () =>
      simplifiedTransactions.map((t) => ({
        fromId: t.fromUserId,
        fromName: t.fromName,
        toId: t.toUserId,
        toName: t.toName,
        amountCents: t.amountCents,
      })),
    [simplifiedTransactions]
  );

  const activeEdges = mode === "raw" ? naiveEdges : simplifiedEdges;

  if (members.length < 2) {
    return (
      <div className="rounded-xl border border-ink-700 bg-ink-900/60 p-8 text-center text-paper-400 text-sm">
        Add another member to see the debt graph.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-ink-700 bg-ink-900/60 overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-5">
        <div>
          <h3 className="font-display font-semibold text-paper-100">Debt graph</h3>
          <p className="text-xs text-paper-400 mt-0.5">
            {mode === "raw"
              ? `${naiveEdges.length} raw transaction${naiveEdges.length === 1 ? "" : "s"} from expense history`
              : `Simplified to ${simplifiedEdges.length} payment${simplifiedEdges.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <div className="flex rounded-lg border border-ink-700 p-0.5 bg-ink-950/60 text-xs font-medium">
          <button
            onClick={() => setMode("raw")}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              mode === "raw" ? "bg-coral-500/20 text-coral-400" : "text-paper-400 hover:text-paper-100"
            }`}
          >
            Raw tangle
          </button>
          <button
            onClick={() => setMode("simplified")}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              mode === "simplified" ? "bg-teal-500/20 text-teal-400" : "text-paper-400 hover:text-paper-100"
            }`}
          >
            Simplified plan
          </button>
        </div>
      </div>

      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-auto grid-surface" key={mode}>
        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill={mode === "raw" ? "#F25C4D" : "#2DD4BF"} />
          </marker>
        </defs>

        {activeEdges.map((edge, i) => {
          const from = nodeById.get(edge.fromId);
          const to = nodeById.get(edge.toId);
          if (!from || !to) return null;
          // Alternate curve direction/magnitude a bit so parallel-ish edges don't stack.
          const curveOffset = 28 + (i % 3) * 14;
          return (
            <EdgeArrow
              key={`${edge.fromId}-${edge.toId}-${i}`}
              from={from}
              to={to}
              color={mode === "raw" ? "#F25C4D" : "#2DD4BF"}
              label={centsToDisplay(edge.amountCents)}
              curveOffset={curveOffset}
              animate
            />
          );
        })}

        {nodes.map((node) => (
          <g key={node.id} className="fade-up">
            <circle cx={node.x} cy={node.y} r={26} fill="#12151C" stroke={avatarColor(node.id)} strokeWidth={2.5} />
            <text
              x={node.x}
              y={node.y + 5}
              textAnchor="middle"
              className="fill-paper-100 font-display font-semibold"
              fontSize="14"
            >
              {initials(node.name)}
            </text>
            <text
              x={node.x}
              y={node.y + 44}
              textAnchor="middle"
              className="fill-paper-400 font-body"
              fontSize="12"
            >
              {node.name.split(" ")[0]}
            </text>
          </g>
        ))}

        {activeEdges.length === 0 && (
          <text
            x={CENTER.x}
            y={CENTER.y}
            textAnchor="middle"
            className="fill-paper-400 font-body"
            fontSize="14"
          >
            All settled up 🎉
          </text>
        )}
      </svg>
    </div>
  );
}
