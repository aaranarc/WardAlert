"use client";

import React from "react";
import { formatPercent } from "@/lib/utils";
import { ShieldCheck, Info } from "lucide-react";

interface ConfidenceBadgeProps {
  lower: number | null | undefined;
  upper: number | null | undefined;
  actual: number | null | undefined;
}

export function ConfidenceBadge({ lower, upper, actual }: ConfidenceBadgeProps) {
  if (lower === null || lower === undefined || upper === null || upper === undefined) {
    return (
      <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-400 font-mono">
        Credible Interval: <span className="text-slate-300">—</span>
      </div>
    );
  }

  // Calculate percentage positions for visual bar (0 to 100%)
  const minVal = 0;
  const maxVal = 1;
  const leftPct = Math.max(0, Math.min(100, lower * 100));
  const rightPct = Math.max(0, Math.min(100, upper * 100));
  const pointPct = actual !== null && actual !== undefined ? Math.max(0, Math.min(100, actual * 100)) : null;
  const widthPct = Math.max(2, rightPct - leftPct);

  return (
    <div className="p-3 rounded-xl bg-[#0e0e24] border border-[#7B68EE]/25 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-slate-300 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-[#b8a9ff]" />
          <span>Bayesian Credible Interval (95%)</span>
        </div>
        <span className="text-[11px] font-mono text-[#b8a9ff] bg-[#7B68EE]/15 px-2 py-0.5 rounded border border-[#7B68EE]/30">
          [{formatPercent(lower, 1)} – {formatPercent(upper, 1)}]
        </span>
      </div>

      {/* Visual credible interval bar */}
      <div className="relative pt-1 pb-1">
        <div className="h-2 w-full bg-slate-800/80 rounded-full overflow-hidden relative">
          {/* Shaded interval band */}
          <div
            className="absolute top-0 bottom-0 bg-gradient-to-r from-[#7B68EE]/60 to-[#b8a9ff]/80 rounded-full"
            style={{
              left: `${leftPct}%`,
              width: `${widthPct}%`,
            }}
          />
        </div>

        {/* Point marker for p_actual */}
        {pointPct !== null && (
          <div
            className="absolute top-0 -translate-x-1/2 flex flex-col items-center"
            style={{ left: `${pointPct}%` }}
            title={`P_actual: ${formatPercent(actual, 1)}`}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_8px_#ffffff] border-2 border-[#7B68EE]" />
          </div>
        )}
      </div>

      <div className="flex justify-between text-[10px] text-slate-400 font-mono">
        <span>0%</span>
        <span>Point Estimate: {formatPercent(actual, 1)}</span>
        <span>100%</span>
      </div>
    </div>
  );
}
