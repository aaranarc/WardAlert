"use client";

import React, { useState } from "react";
import { useSpots } from "@/hooks/useSpots";
import { RISK_COLORS } from "@/lib/constants";
import { formatPercent, formatDateDMY } from "@/lib/utils";
import {
  IconRisk,
  IconWarning,
  IconLayers,
  IconCheck,
  IconClock,
  IconRefresh,
} from "@/components/Common/Icons";

export default function RiskAnalysisPage() {
  const { spots, activeDate, refreshPredictions, replayCloudburst } = useSpots();
  const [selectedDriver, setSelectedDriver] = useState<string>("all");
  const [isActing, setIsActing] = useState<boolean>(false);
  const [activeAction, setActiveAction] = useState<"refresh" | "cloudburst" | null>(null);

  const handleRefreshPredictions = async () => {
    setIsActing(true);
    setActiveAction("refresh");
    try {
      await refreshPredictions();
    } finally {
      setIsActing(false);
      setActiveAction(null);
    }
  };

  const handleReplayCloudburst = async () => {
    setIsActing(true);
    setActiveAction("cloudburst");
    try {
      await replayCloudburst();
    } finally {
      setIsActing(false);
      setActiveAction(null);
    }
  };

  const sortedSpots = [...spots].sort((a, b) => (b.p_actual || 0) - (a.p_actual || 0));

  const criticalCount = spots.filter((s) => s.risk_level === "critical").length;
  const highCount = spots.filter((s) => s.risk_level === "high").length;
  const moderateCount = spots.filter((s) => s.risk_level === "moderate").length;
  const validPActual = spots.filter((s) => s.p_actual != null);
  const avgRisk =
    validPActual.length > 0
      ? validPActual.reduce((acc, s) => acc + (s.p_actual || 0), 0) / validPActual.length
      : null;

  const globalShapFactors = React.useMemo(() => {
    const map: Record<string, { label: string; total: number }> = {};
    for (const spot of spots) {
      if (spot.shap_top3 && Array.isArray(spot.shap_top3)) {
        for (const factor of spot.shap_top3) {
          const key = factor.feature || factor.label;
          if (!map[key]) {
            map[key] = { label: factor.label || factor.feature, total: 0 };
          }
          map[key].total += Math.abs(factor.shap_value);
        }
      }
    }
    const items = Object.values(map);
    if (items.length === 0) return [];
    const sumAll = items.reduce((acc, curr) => acc + curr.total, 0);
    return items
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
      .map((item) => ({
        label: item.label,
        pct: sumAll > 0 ? Math.round((item.total / sumAll) * 100) : 0,
      }));
  }, [spots]);

  return (
    <div className="flex-1 bg-[#f8fafc] p-4 lg:p-6 space-y-5 max-w-[1600px] mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Risk Analysis
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Dual model evaluation, drainage failure attribution, and spot rankings across Ward G/South.
          </p>
        </div>

        {/* Replay Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {activeDate && (
            <div suppressHydrationWarning className="px-3 py-1.5 rounded-lg bg-[#e8f2fc] border border-[#0066cc]/25 text-[#0066cc] text-xs font-medium flex items-center gap-1.5 shadow-2xs">
              <IconClock className="w-3.5 h-3.5 shrink-0" />
              <span suppressHydrationWarning>
                Displaying Date: <strong suppressHydrationWarning className="font-semibold text-slate-900">{formatDateDMY(activeDate)}</strong>
              </span>
            </div>
          )}
          <button
            onClick={handleReplayCloudburst}
            disabled={isActing}
            className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-2xs"
            title="Replay 2025 Cloudburst event across all spots (14 July 2025)"
          >
            <IconRefresh className={`w-3.5 h-3.5 ${isActing && activeAction === "cloudburst" ? "animate-spin" : ""}`} />
            <span>{isActing && activeAction === "cloudburst" ? "Replaying..." : "Replay 2025 Cloudburst"}</span>
          </button>

          <button
            onClick={handleRefreshPredictions}
            disabled={isActing}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-2xs"
            title="Refresh moderate monsoon predictions across all 30 spots for 3 July 2023"
          >
            <IconRefresh className={`w-3.5 h-3.5 ${isActing && activeAction === "refresh" ? "animate-spin text-[#0066cc]" : ""}`} />
            <span>{isActing && activeAction === "refresh" ? "Refreshing..." : "Refresh Predictions"}</span>
          </button>
        </div>
      </div>

      {/* Top 4 Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-white border border-slate-200">
          <div className="text-2xl font-bold font-mono text-rose-600">{criticalCount}</div>
          <div className="text-xs font-semibold text-slate-900 mt-0.5">Critical Risk Spots</div>
          <div className="text-[10px] text-slate-400">P_actual &gt; 80%</div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200">
          <div className="text-2xl font-bold font-mono text-orange-600">{highCount}</div>
          <div className="text-xs font-semibold text-slate-900 mt-0.5">High Risk Spots</div>
          <div className="text-[10px] text-slate-400">P_actual 60% – 80%</div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200">
          <div className="text-2xl font-bold font-mono text-amber-600">{moderateCount}</div>
          <div className="text-xs font-semibold text-slate-900 mt-0.5">Moderate Risk Spots</div>
          <div className="text-[10px] text-slate-400">P_actual 40% – 60%</div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200">
          <div className="text-2xl font-bold font-mono text-slate-900">
            {avgRisk != null ? `${Math.round(avgRisk * 100)}%` : "—"}
          </div>
          <div className="text-xs font-semibold text-slate-900 mt-0.5">Ward Mean Risk</div>
          <div className="text-[10px] text-slate-400">Overall exposure index</div>
        </div>
      </div>

      {/* Model Lift Summary Gate */}
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
            </div>
          </div>
        </div>
      </div>

      {/* Main Two Columns: Location Table & Contributing Factors */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Location Ranking Table (7 of 12 columns) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-slate-900">Risk Ranking by Spot</h2>
              {activeDate && (
                <span suppressHydrationWarning className="text-[11px] text-[#0066cc] font-medium bg-[#e8f2fc] px-2 py-0.5 rounded-md border border-[#0066cc]/20">
                  {formatDateDMY(activeDate)}
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              {spots.length > 0 ? `${spots.length} Locations Monitored` : "—"}
            </span>
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
                {sortedSpots.map((spot) => {
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
              Feature importance distribution computed across monitored flood spots.
            </p>

            <div className="space-y-3 pt-1">
              {globalShapFactors.length > 0 ? (
                globalShapFactors.map((factor, idx) => {
                  const colors = ["bg-[#0066cc]", "bg-rose-500", "bg-amber-500", "bg-teal-500", "bg-slate-500"];
                  const barColor = colors[idx % colors.length];
                  return (
                    <div key={factor.label}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-700 font-medium capitalize">{factor.label}</span>
                        <span className="font-mono text-slate-900 font-semibold">{factor.pct}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className={`${barColor} h-full rounded-full`} style={{ width: `${factor.pct}%` }} />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-xs text-slate-400 py-3 text-center font-mono">
                  —
                </div>
              )}
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
