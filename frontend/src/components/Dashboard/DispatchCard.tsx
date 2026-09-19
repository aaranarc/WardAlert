"use client";

import React from "react";
import { DispatchType, CauseLabel } from "@/lib/types";
import { DISPATCH_DESCRIPTIONS, CAUSE_DESCRIPTIONS } from "@/lib/constants";
import { Truck, AlertTriangle, Droplets, CheckCircle2, ShieldAlert } from "lucide-react";

interface DispatchCardProps {
  dispatchType: DispatchType | null | undefined;
  causeLabel: CauseLabel | null | undefined;
}

export function DispatchCard({ dispatchType, causeLabel }: DispatchCardProps) {
  if (!dispatchType) {
    return (
      <div className="p-3.5 rounded-xl bg-[#0e0e24] border border-[#7B68EE]/20 text-xs text-slate-400 font-mono text-center">
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
          ? "bg-gradient-to-br from-[#1a163a] to-[#201538] border-amber-500/40 shadow-[0_4px_20px_rgba(245,158,11,0.15)]"
          : "bg-gradient-to-br from-[#12163a] to-[#151c44] border-cyan-500/40 shadow-[0_4px_20px_rgba(56,189,248,0.15)]"
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2">
          <div
            className={`p-2 rounded-lg ${
              isDesilting ? "bg-amber-500/20 text-amber-300" : "bg-cyan-500/20 text-cyan-300"
            }`}
          >
            {isDesilting ? <Truck className="w-5 h-5" /> : <Droplets className="w-5 h-5" />}
          </div>
          <div>
            <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
              Recommended Protocol
            </div>
            <div className="text-sm font-bold text-white leading-tight">
              {isDesilting ? "Desilting Crew Deployment" : "Pump & Traffic Marshals"}
            </div>
          </div>
        </div>

        <span
          className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${
            isDrainageFailure
              ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
              : "bg-blue-500/20 text-blue-300 border-blue-500/30"
          }`}
        >
          {isDrainageFailure ? "Drainage Failure" : "Rainfall Driven"}
        </span>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed mb-3">
        {DISPATCH_DESCRIPTIONS[dispatchType] || "Standard monitoring protocol."}
      </p>

      {/* Operational action checklist */}
      <div className="pt-2.5 border-t border-slate-700/50 space-y-1.5 text-xs text-slate-300">
        <div className="flex items-center gap-2 text-[11px]">
          <CheckCircle2
            className={`w-3.5 h-3.5 shrink-0 ${isDesilting ? "text-amber-400" : "text-cyan-400"}`}
          />
          <span>
            {isDesilting
              ? "Inspect nearby SWD outfalls & clear silt accumulation"
              : "Position mobile suction pumps & divert low-lying traffic"}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <CheckCircle2
            className={`w-3.5 h-3.5 shrink-0 ${isDesilting ? "text-amber-400" : "text-cyan-400"}`}
          />
          <span>Issue automated localized WhatsApp alert to ward officer & citizens</span>
        </div>
      </div>
    </div>
  );
}
