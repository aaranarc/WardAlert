"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useDrainHealth, useDrainHealthDetail } from "@/hooks/useDrainHealth";
import { Leaderboard } from "@/components/DrainHealth/Leaderboard";
import { TrendChart } from "@/components/DrainHealth/TrendChart";
import { formatDate } from "@/lib/utils";
import { IconRefresh } from "@/components/Common/Icons";

export default function DrainHealthPage() {
  const { drains, isLoading: isListLoading, mutate } = useDrainHealth();
  const [selectedSpotId, setSelectedSpotId] = useState<number | null>(null);

  useEffect(() => {
    if (drains.length > 0 && selectedSpotId === null) {
      const sorted = [...drains].sort((a, b) => a.health_score - b.health_score);
      setSelectedSpotId(sorted[0].spot_id);
    }
  }, [drains, selectedSpotId]);

  const { detail, isLoading: isDetailLoading } = useDrainHealthDetail(selectedSpotId);

  const stats = useMemo(() => {
    if (!drains || drains.length === 0) {
      return {
        atRiskCount: 0,
        overdueCount: 0,
        avgHealth: 0,
        nextFailure: null as { name: string; date: string } | null,
      };
    }

    const atRisk = drains.filter(
      (d) => d.status === "degrading" || d.status === "overdue"
    );
    const overdue = drains.filter((d) => d.status === "overdue");
    const avgScore =
      drains.reduce((acc, d) => acc + d.health_score, 0) / drains.length;

    const drainsWithFailures = drains
      .filter((d) => d.predicted_failure_date)
      .sort((a, b) =>
        (a.predicted_failure_date || "").localeCompare(b.predicted_failure_date || "")
      );

    const nextFailure =
      drainsWithFailures.length > 0
        ? {
            name: drainsWithFailures[0].name,
            date: drainsWithFailures[0].predicted_failure_date as string,
          }
        : null;

    return {
      atRiskCount: atRisk.length,
      overdueCount: overdue.length,
      avgHealth: avgScore,
      nextFailure,
    };
  }, [drains]);

  return (
    <div className="flex-1 bg-[#f8fafc] p-4 lg:p-6 space-y-5 max-w-[1600px] mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Drain Health Index
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Maintenance prioritization leaderboard and degradation trend models for Ward G/South.
          </p>
        </div>

        <button
          onClick={() => mutate()}
          className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium transition-colors flex items-center gap-1.5 w-fit"
          aria-label="Refresh drain health data"
        >
          <IconRefresh className="w-3.5 h-3.5 text-[#0066cc]" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="text-2xl font-bold font-mono text-slate-900">
            {stats.avgHealth ? stats.avgHealth.toFixed(1) : "-"}
          </div>
          <div className="text-xs font-semibold text-slate-800 mt-1">Average Ward Health</div>
          <div className="text-[10px] text-slate-400">Score out of 100 across 30 spots</div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="text-2xl font-bold font-mono text-amber-600">
            {stats.atRiskCount}
          </div>
          <div className="text-xs font-semibold text-slate-800 mt-1">Degrading Drains</div>
          <div className="text-[10px] text-slate-400">Upward Δ trajectory tracked</div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="text-2xl font-bold font-mono text-rose-600">
            {stats.overdueCount}
          </div>
          <div className="text-xs font-semibold text-slate-800 mt-1">Overdue for Desilting</div>
          <div className="text-[10px] text-slate-400">Passed critical threshold level</div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="text-sm font-bold text-slate-900 truncate mt-1">
            {stats.nextFailure ? stats.nextFailure.name : "None Projected"}
          </div>
          <div className="text-xs font-semibold text-rose-600 mt-0.5">
            {stats.nextFailure ? formatDate(stats.nextFailure.date) : "Drains within thresholds"}
          </div>
          <div className="text-[10px] text-slate-400">Next projected failure date</div>
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-5">
          <Leaderboard
            drains={drains}
            selectedSpotId={selectedSpotId}
            onSelectSpot={(id) => setSelectedSpotId(id)}
          />
        </div>

        <div className="lg:col-span-7">
          <TrendChart detail={detail ?? null} isLoading={isDetailLoading} />
        </div>
      </div>
    </div>
  );
}
