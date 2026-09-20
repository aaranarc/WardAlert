"use client";

import React from "react";
import { DispatchType, CauseLabel } from "@/lib/types";
import { DISPATCH_DESCRIPTIONS } from "@/lib/constants";

interface DispatchCardProps {
  dispatchType: DispatchType | null | undefined;
  causeLabel: CauseLabel | null | undefined;
}

export function DispatchCard({ dispatchType, causeLabel }: DispatchCardProps) {
  if (!dispatchType) {
    return (
      <div className="p-3 bg-[#f8fafc] border border-[#d4dae3] text-xs text-[#5b6478] font-mono text-center">
        No active dispatch protocol assigned.
      </div>
    );
  }

  const isDesilting = dispatchType === "desilting_crew";
  const isDrainageFailure = causeLabel === "drainage_failure";

  return (
    <div
      className={`p-3.5 border rounded-sm ${
        isDesilting
          ? "bg-[#fffbeb] border-[#fde68a]"
          : "bg-[#eff6ff] border-[#bfdbfe]"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className="text-[10px] uppercase font-mono tracking-widest text-[#5b6478]">
            RECOMMENDED ACTION DIRECTIVE
          </div>
          <div className="text-sm font-bold text-[#1a1f2e] font-sans leading-tight mt-0.5">
            {isDesilting ? "Dispatch Desilting Crew" : "Dispatch Pump Truck & Traffic Marshals"}
          </div>
        </div>

        <span
          className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 border ${
            isDrainageFailure
              ? "bg-[#fef2f2] text-[#b91c1c] border-[#fecaca]"
              : "bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]"
          }`}
        >
          {isDrainageFailure ? "DRAINAGE FAILURE" : "RAINFALL DRIVEN"}
        </span>
      </div>

      <p className="text-xs text-[#1a1f2e] leading-relaxed mb-3">
        {DISPATCH_DESCRIPTIONS[dispatchType]}
      </p>

      {/* Operational action checklist */}
      <div className="pt-2 border-t border-[#d4dae3]/60 space-y-1 text-xs text-[#1a1f2e] font-sans">
        <div className="flex items-center gap-2 text-[11px]">
          <span className="w-1.5 h-1.5 bg-[#1e40af]" />
          <span>
            {isDesilting
              ? "Inspect nearby SWD outfalls and clear silt accumulation."
              : "Position mobile suction pumps and divert traffic from low-lying points."}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="w-1.5 h-1.5 bg-[#1e40af]" />
          <span>Issue automated localized alert to ward officer and active subscribers.</span>
        </div>
      </div>
    </div>
  );
}
