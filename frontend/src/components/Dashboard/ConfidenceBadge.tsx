"use client";

import React from "react";
import { formatPercent } from "@/lib/utils";
import { IconCheck } from "@/components/Common/Icons";

interface ConfidenceBadgeProps {
  lower: number | null | undefined;
  upper: number | null | undefined;
  actual: number | null | undefined;
}

export function ConfidenceBadge({ lower, upper, actual }: ConfidenceBadgeProps) {
  if (lower === null || lower === undefined || upper === null || upper === undefined) {
    return (
      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500 font-mono">
        Credible Interval: <span className="text-slate-400">-</span>
      </div>
    );
  }

  const leftPct = Math.max(0, Math.min(100, lower * 100));
  const rightPct = Math.max(0, Math.min(100, upper * 100));
  const pointPct = actual !== null && actual !== undefined ? Math.max(0, Math.min(100, actual * 100)) : null;
  const widthPct = Math.max(2, rightPct - leftPct);

  return (
    <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
          <IconCheck className="w-3.5 h-3.5 text-[#0066cc]" />
          <span>Bayesian Credible Interval (95%)</span>
        </div>
        <span className="text-[11px] font-mono text-[#0066cc] bg-[#e8f2fc] px-2 py-0.5 rounded border border-[#0066cc]/20">
          [{formatPercent(lower, 1)} to {formatPercent(upper, 1)}]
        </span>
      </div>

      <div className="relative pt-1 pb-1">
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden relative border border-slate-200">
          <div
            className="absolute top-0 bottom-0 bg-[#0066cc]/30 rounded-full"
            style={{
              left: `${leftPct}%`,
              width: `${widthPct}%`,
            }}
          />
        </div>

        {pointPct !== null && (
          <div
            className="absolute top-0 -translate-x-1/2 flex flex-col items-center"
            style={{ left: `${pointPct}%` }}
            title={`P_actual: ${formatPercent(actual, 1)}`}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-[#0066cc] border-2 border-white shadow-xs" />
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
