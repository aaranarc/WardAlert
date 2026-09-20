"use client";

import React, { useState } from "react";
import { useSpots } from "@/hooks/useSpots";
import { RISK_COLORS } from "@/lib/constants";
import { formatPercent } from "@/lib/utils";
import {
  IconRisk,
  IconWarning,
  IconLayers,
  IconCheck,
} from "@/components/Common/Icons";

export default function RiskAnalysisPage() {
  const { spots } = useSpots();
  const [selectedDriver, setSelectedDriver] = useState<string>("all");

  const sortedSpots = [...spots].sort((a, b) => (b.p_actual || 0) - (a.p_actual || 0));

  return (
    <div className="flex-1 bg-[#f8fafc] p-4 lg:p-6 space-y-5 max-w-[1600px] mx-auto w-full">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Risk Analysis
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Dual model evaluation, drainage failure attribution, and spot rankings across Ward G/South.
        </p>
      </div>

      {/* Top 4 Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-white border border-slate-200">
          <div className="text-2xl font-bold font-mono text-rose-600">5</div>
          <div className="text-xs font-semibold text-slate-800 mt-1">Critical Spots</div>
          <div className="text-[10px] text-slate-400">Immediate action needed</div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200">
          <div className="text-2xl font-bold font-mono text-orange-600">8</div>
          <div className="text-xs font-semibold text-slate-800 mt-1">High Risk Spots</div>
          <div className="text-[10px] text-slate-400">Drainage bottleneck zones</div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200">
          <div className="text-2xl font-bold font-mono text-amber-600">11</div>
          <div className="text-xs font-semibold text-slate-800 mt-1">Moderate Risk Spots</div>
          <div className="text-[10px] text-slate-400">Watch on rainfall spikes</div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200">
          <div className="text-2xl font-bold font-mono text-[#0066cc]">42%</div>
          <div className="text-xs font-semibold text-slate-800 mt-1">Ward Average Risk</div>
          <div className="text-[10px] text-slate-400">Composite dual model mean</div>
        </div>
      </div>

      {/* Dual Model Validation Proof Banner */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-xs font-bold text-slate-900">Dual Model Lift Gate</h2>
            <p className="text-[11px] text-slate-500">
              Model B must outperform Model A to validate drainage signal significance.
            </p>
          </div>
          <div className="text-[10px] font-mono text-emerald-700 font-semibold px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 w-fit">
            Gate Passed: Lift +0.0313 AUC
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <div className="text-xs font-semibold text-slate-700">Model A (Rainfall Baseline)</div>
            <div className="text-[10px] text-slate-500">Inputs: Rainfall series and SRTM elevation only</div>
            <div className="flex items-center gap-4 mt-2 font-mono text-xs">
              <div>
                <span className="text-slate-400 text-[10px]">Test AUC:</span>{" "}
                <span className="font-bold text-slate-800">0.8187</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px]">F1 Score:</span>{" "}
                <span className="font-bold text-slate-800">0.2857</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#e8f2fc] border border-[#0066cc]/20">
            <div className="text-xs font-semibold text-[#0066cc]">Model B (Full Context)</div>
            <div className="text-[10px] text-slate-600">Inputs: Rain, elevation, drain distance, crowd reports</div>
            <div className="flex items-center gap-4 mt-2 font-mono text-xs">
              <div>
                <span className="text-slate-500 text-[10px]">Test AUC:</span>{" "}
                <span className="font-bold text-[#0066cc]">0.8500</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px]">F1 Score:</span>{" "}
                <span className="font-bold text-[#0066cc]">0.5000</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Two Columns: Location Table & Contributing Factors */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Location Ranking Table (7 of 12 columns) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
            <h2 className="text-xs font-bold text-slate-900">Risk Ranking by Spot</h2>
            <span className="text-[11px] text-slate-400 font-mono">30 Locations Monitored</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Location</th>
                  <th className="py-2.5 px-3">Risk Level</th>
                  <th className="py-2.5 px-3">P_actual</th>
                  <th className="py-2.5 px-3">Δ Signal</th>
                  <th className="py-2.5 px-3">Key Driver</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedSpots.slice(0, 15).map((spot) => {
                  const risk = spot.risk_level || "low";
                  const color = RISK_COLORS[risk] || "#16a34a";
                  const deltaVal = spot.delta ?? 0;

                  return (
                    <tr key={spot.spot_id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-900 truncate max-w-[160px]">
                        {spot.name}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide inline-block"
                          style={{ backgroundColor: `${color}15`, color }}
                        >
                          {risk}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-800">
                        {formatPercent(spot.p_actual)}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-xs font-semibold">
                        <span className={deltaVal > 0 ? "text-rose-600" : "text-emerald-600"}>
                          {deltaVal > 0 ? `+${(deltaVal * 100).toFixed(0)}%` : `${(deltaVal * 100).toFixed(0)}%`}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                        {spot.cause_label === "drainage_failure" ? "Drain Failure" : "Rain Intensity"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: SHAP Drivers & Risk Distribution (5 of 12 columns) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Top Contributing Factors Card */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3 shadow-xs">
            <h2 className="text-xs font-bold text-slate-900">
              Top Contributing Factors (SHAP Global)
            </h2>
            <p className="text-[11px] text-slate-500">
              Feature importance distribution computed across the 192 training snapshots.
            </p>

            <div className="space-y-3 pt-1">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-700 font-medium">Drainage Proximity</span>
                  <span className="font-mono text-slate-900 font-semibold">32%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-[#0066cc] h-full rounded-full" style={{ width: "32%" }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-700 font-medium">Rainfall Intensity</span>
                  <span className="font-mono text-slate-900 font-semibold">24%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-rose-500 h-full rounded-full" style={{ width: "24%" }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-700 font-medium">Depression Depth</span>
                  <span className="font-mono text-slate-900 font-semibold">18%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: "18%" }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-700 font-medium">Citizen Reports (500m)</span>
                  <span className="font-mono text-slate-900 font-semibold">14%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-teal-500 h-full rounded-full" style={{ width: "14%" }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-700 font-medium">Topographic Elevation</span>
                  <span className="font-mono text-slate-900 font-semibold">12%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-slate-400 h-full rounded-full" style={{ width: "12%" }} />
                </div>
              </div>
            </div>
          </div>

          {/* Operational Guidance Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <h3 className="text-xs font-bold text-slate-900">Operational Guidance</h3>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              When Δ is positive, flooding is driven by blocked drainage rather than rainfall volume. Deploy desilting machinery to the highlighted chronic bottlenecks first.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
