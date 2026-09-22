"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSpots } from "@/hooks/useSpots";
import { useDrainHealth, useDrainHealthDetail } from "@/hooks/useDrainHealth";
import { Leaderboard } from "@/components/DrainHealth/Leaderboard";
import { TrendChart } from "@/components/DrainHealth/TrendChart";
import { formatDate, formatDateDMY } from "@/lib/utils";
import { IconRefresh, IconClock } from "@/components/Common/Icons";

export default function DrainHealthPage() {
  const { spots, activeDate, refreshPredictions, replayCloudburst } = useSpots();
  const { drains, isLoading: isListLoading, mutate } = useDrainHealth();
  const [selectedSpotId, setSelectedSpotId] = useState<number | null>(null);
  const [isActing, setIsActing] = useState<boolean>(false);
  const [activeAction, setActiveAction] = useState<"refresh" | "cloudburst" | null>(null);

  useEffect(() => {
    if (drains.length > 0 && selectedSpotId === null) {
      const sorted = [...drains].sort((a, b) => a.health_score - b.health_score);
      setSelectedSpotId(sorted[0].spot_id);
    }
  }, [drains, selectedSpotId]);

  const { detail, isLoading: isDetailLoading, mutate: mutateDetail } = useDrainHealthDetail(selectedSpotId);

  const handleRefreshPredictions = async () => {
    setIsActing(true);
    setActiveAction("refresh");
    try {
      await refreshPredictions();
      await Promise.all([mutate(), mutateDetail()]);
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
      await Promise.all([mutate(), mutateDetail()]);
    } finally {
      setIsActing(false);
      setActiveAction(null);
    }
  };

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
            spot_id: drainsWithFailures[0].spot_id,
          }
        : null;

    return {
      atRiskCount: atRisk.length,
      overdueCount: overdue.length,
      avgHealth: avgScore,
      nextFailure,
      nextFailureSpotId: nextFailure ? nextFailure.spot_id : null,
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

      {/* Summary KPI Cards with dynamic inspection handlers */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => {
            if (drains.length > 0) {
              const lowest = [...drains].sort((a, b) => a.health_score - b.health_score)[0];
              if (lowest) setSelectedSpotId(lowest.spot_id);
            }
          }}
          className="p-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 shadow-xs text-left transition-all cursor-pointer group"
          title="Click to inspect drain with lowest health score"
        >
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold font-mono text-slate-900">
              {stats.avgHealth ? stats.avgHealth.toFixed(1) : "-"}
            </div>
            <span className="text-slate-400 text-xs group-hover:translate-x-0.5 transition-transform">›</span>
          </div>
          <div className="text-xs font-semibold text-slate-800 mt-1">Average Ward Health</div>
          <div className="text-[10px] text-slate-400">Score out of 100 across 30 spots</div>
        </button>

        <button
          type="button"
          onClick={() => {
            const firstDegrading = drains.find((d) => d.status === "degrading");
            if (firstDegrading) setSelectedSpotId(firstDegrading.spot_id);
          }}
          className="p-3.5 rounded-xl bg-white hover:bg-amber-50/50 border border-slate-200 hover:border-amber-200 shadow-xs text-left transition-all cursor-pointer group"
          title="Click to inspect top degrading drain"
        >
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold font-mono text-amber-600">
              {stats.atRiskCount}
            </div>
            <span className="text-slate-400 text-xs group-hover:translate-x-0.5 transition-transform">›</span>
          </div>
          <div className="text-xs font-semibold text-slate-800 mt-1">Degrading Drains</div>
          <div className="text-[10px] text-slate-400">Inspect upward trajectory</div>
        </button>

        <button
          type="button"
          onClick={() => {
            const firstOverdue = drains.find((d) => d.status === "overdue");
            if (firstOverdue) setSelectedSpotId(firstOverdue.spot_id);
          }}
          className="p-3.5 rounded-xl bg-white hover:bg-rose-50/50 border border-slate-200 hover:border-rose-200 shadow-xs text-left transition-all cursor-pointer group"
          title="Click to inspect overdue drain"
        >
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold font-mono text-rose-600">
              {stats.overdueCount}
            </div>
            <span className="text-slate-400 text-xs group-hover:translate-x-0.5 transition-transform">›</span>
          </div>
          <div className="text-xs font-semibold text-slate-800 mt-1">Overdue for Desilting</div>
          <div className="text-[10px] text-slate-400">Passed critical threshold level</div>
        </button>

        <button
          type="button"
          onClick={() => {
            if (stats.nextFailureSpotId) {
              setSelectedSpotId(stats.nextFailureSpotId);
            }
          }}
          className="p-3.5 rounded-xl bg-white hover:bg-rose-50/50 border border-slate-200 hover:border-rose-200 shadow-xs text-left transition-all cursor-pointer group"
          title="Click to inspect next projected failure spot"
        >
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-slate-900 truncate mt-1 max-w-[170px]">
              {stats.nextFailure ? stats.nextFailure.name : "None Projected"}
            </div>
            <span className="text-slate-400 text-xs group-hover:translate-x-0.5 transition-transform">›</span>
          </div>
          <div className="text-xs font-semibold text-rose-600 mt-0.5">
            {stats.nextFailure ? formatDate(stats.nextFailure.date) : "Drains within thresholds"}
          </div>
          <div className="text-[10px] text-slate-400">Next projected failure date</div>
        </button>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-5">
          <Leaderboard
            drains={drains}
            selectedSpotId={selectedSpotId}
            onSelectSpot={(id) => setSelectedSpotId(id)}
            activeDate={activeDate}
            spots={spots}
          />
        </div>

        <div className="lg:col-span-7">
          <TrendChart
            detail={detail ?? null}
            isLoading={isDetailLoading}
            onDesilted={() => {
              mutate();
              mutateDetail();
            }}
          />
        </div>
      </div>
    </div>
  );
}
