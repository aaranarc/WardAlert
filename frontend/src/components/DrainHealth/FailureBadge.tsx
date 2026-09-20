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
      <span className="inline-block px-1.5 py-0.5 text-[10px] font-mono font-bold bg-[#fef2f2] text-[#b91c1c] border border-[#fecaca]">
        OVERDUE
      </span>
    );
  }

  if (normStatus === "degrading") {
    return (
      <span className="inline-block px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-[#fffbeb] text-[#b45309] border border-[#fde68a]">
        DEGRADING
      </span>
    );
  }

  if (normStatus === "improving") {
    return (
      <span className="inline-block px-1.5 py-0.5 text-[10px] font-mono font-medium bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0]">
        IMPROVING
      </span>
    );
  }

  return (
    <span className="inline-block px-1.5 py-0.5 text-[10px] font-mono font-medium bg-[#eff6ff] text-[#1e40af] border border-[#bfdbfe]">
      STABLE
    </span>
  );
}
