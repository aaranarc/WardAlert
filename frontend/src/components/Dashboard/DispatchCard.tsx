"use client";

import React from "react";
import { DispatchType, CauseLabel } from "@/lib/types";
import { DISPATCH_DESCRIPTIONS } from "@/lib/constants";
import { IconTruck, IconWarning, IconCheck } from "@/components/Common/Icons";

interface DispatchCardProps {
  dispatchType: DispatchType | null | undefined;
  causeLabel: CauseLabel | null | undefined;
}

export function DispatchCard({ dispatchType, causeLabel }: DispatchCardProps) {
  if (!dispatchType) {
    return (
      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 font-mono text-center">
        No active dispatch protocol generated
      </div>
    );
  }

  const isDesilting = dispatchType === "desilting_crew";
  const isDrainageFailure = causeLabel === "drainage_failure";

  return (
    <div
      className={`p-4 rounded-xl border transition-all ${
        isDesilting
          ? "bg-amber-50/50 border-amber-200 shadow-xs"
          : "bg-sky-50/50 border-sky-200 shadow-xs"
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2">
          <div
            className={`p-2 rounded-lg ${
              isDesilting ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700"
            }`}
          >
            {isDesilting ? <IconTruck className="w-5 h-5" /> : <IconWarning className="w-5 h-5" />}
          </div>
          <div>
            <div className="text-[10px] uppercase font-mono tracking-wider text-slate-500">
              Recommended Protocol
            </div>
            <div className="text-sm font-bold text-slate-900 leading-tight">
              {isDesilting ? "Desilting Crew Deployment" : "Pump & Traffic Marshals"}
            </div>
          </div>
        </div>

        <span
          className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${
            isDrainageFailure
              ? "bg-rose-50 text-rose-700 border-rose-200"
              : "bg-blue-50 text-blue-700 border-blue-200"
          }`}
        >
          {isDrainageFailure ? "Drainage Failure" : "Rainfall Driven"}
        </span>
      </div>

      <p className="text-xs text-slate-600 leading-relaxed mb-3">
        {DISPATCH_DESCRIPTIONS[dispatchType] || "Standard monitoring protocol."}
      </p>

      {/* Operational action checklist */}
      <div className="pt-2.5 border-t border-slate-200/80 space-y-1.5 text-xs text-slate-700">
        <div className="flex items-center gap-2 text-[11px]">
          <IconCheck
            className={`w-3.5 h-3.5 shrink-0 ${isDesilting ? "text-amber-600" : "text-sky-600"}`}
          />
          <span>
            {isDesilting
              ? "Inspect nearby SWD outfalls and clear silt accumulation"
              : "Position mobile suction pumps and divert low-lying traffic"}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <IconCheck
            className={`w-3.5 h-3.5 shrink-0 ${isDesilting ? "text-amber-600" : "text-sky-600"}`}
          />
          <span>Issue automated localized WhatsApp alert to ward officer and citizens</span>
        </div>
      </div>
    </div>
  );
}
