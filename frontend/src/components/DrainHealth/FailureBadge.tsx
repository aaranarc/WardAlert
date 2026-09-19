"use client";

import React from "react";
import { DrainStatus } from "@/lib/types";
import { AlertOctagon, TrendingUp, TrendingDown, Minus, CheckCircle } from "lucide-react";

interface FailureBadgeProps {
  status: DrainStatus | string | null | undefined;
  predictedFailureDate?: string | null;
}

export function FailureBadge({ status, predictedFailureDate }: FailureBadgeProps) {
  const normStatus = (status || "stable").toLowerCase();

  if (normStatus === "overdue") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
        <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
        <span>OVERDUE</span>
      </span>
    );
  }

  if (normStatus === "degrading") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
        <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
        <span>DEGRADING</span>
      </span>
    );
  }

  if (normStatus === "improving") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
        <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
        <span>IMPROVING</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
      <Minus className="w-3.5 h-3.5 text-cyan-400" />
      <span>STABLE</span>
    </span>
  );
}
