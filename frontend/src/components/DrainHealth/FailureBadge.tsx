"use client";

import React from "react";
import { DrainStatus } from "@/lib/types";

interface FailureBadgeProps {
  status: DrainStatus | string | null | undefined;
  predictedFailureDate?: string | null;
}

export function FailureBadge({ status }: FailureBadgeProps) {
  const normStatus = (status || "stable").toLowerCase();

  if (normStatus === "overdue") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
        <span>OVERDUE</span>
      </span>
    );
  }

  if (normStatus === "degrading") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-amber-50 text-amber-800 border border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
        <span>DEGRADING</span>
      </span>
    );
  }

  if (normStatus === "improving") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
        <span>IMPROVING</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
      <span>STABLE</span>
    </span>
  );
}
