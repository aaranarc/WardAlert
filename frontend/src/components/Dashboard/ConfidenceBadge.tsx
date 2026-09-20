"use client";

import React from "react";
import { formatPercent } from "@/lib/utils";

interface ConfidenceBadgeProps {
  lower: number | null | undefined;
  upper: number | null | undefined;
  actual: number | null | undefined;
}

export function ConfidenceBadge({ lower, upper, actual }: ConfidenceBadgeProps) {
  if (lower === null || lower === undefined || upper === null || upper === undefined) {
    return (
      <div className="p-2.5 bg-[#f8fafc] border border-[#d4dae3] text-xs text-[#5b6478] font-mono">
        Credible Interval (95%): <span className="text-[#1a1f2e]">—</span>
      </div>
    );
  }

  const leftPct = Math.max(0, Math.min(100, lower * 100));
  const rightPct = Math.max(0, Math.min(100, upper * 100));
  const pointPct = actual !== null && actual !== undefined ? Math.max(0, Math.min(100, actual * 100)) : null;
  const widthPct = Math.max(2, rightPct - leftPct);

  return (
    <div className="p-3 bg-[#ffffff] border border-[#d4dae3] space-y-1.5 rounded-sm">
      <div className="flex items-center justify-between text-xs">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5b6478]">
          BAYESIAN CREDIBLE INTERVAL (95%)
        </span>
        <span className="text-[11px] font-mono text-[#1e40af] bg-[#dbeafe] px-1.5 py-0.2 border border-[#93c5fd]">
          [{formatPercent(lower, 1)} to {formatPercent(upper, 1)}]
        </span>
      </div>

      {/* Visual credible interval bar */}
      <div className="relative pt-1 pb-1">
        <div className="h-2 w-full bg-[#f1f5f9] border border-[#d4dae3] rounded-none relative">
          <div
            className="absolute top-0 bottom-0 bg-[#93c5fd] border-l border-r border-[#1e40af]"
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
            title={`Point estimate: ${formatPercent(actual, 1)}`}
          >
            <div className="w-2.5 h-2.5 bg-[#1e40af] border border-[#ffffff] shadow-sm" />
          </div>
        )}
      </div>

      <div className="flex justify-between text-[10px] text-[#5b6478] font-mono">
        <span>0%</span>
        <span>Point Estimate: {formatPercent(actual, 1)}</span>
        <span>100%</span>
      </div>
    </div>
  );
}
