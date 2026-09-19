"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useDrainHealth, useDrainHealthDetail } from "@/hooks/useDrainHealth";
import { Leaderboard } from "@/components/DrainHealth/Leaderboard";
import { TrendChart } from "@/components/DrainHealth/TrendChart";
import { formatDate } from "@/lib/utils";
import {
  Activity,
  AlertTriangle,
  Flame,
  Calendar,
  Layers,
  TrendingUp,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

export default function DrainHealthPage() {
  const { drains, isLoading: isListLoading, mutate } = useDrainHealth();
  const [selectedSpotId, setSelectedSpotId] = useState<number | null>(null);

  // Set default selected spot to the lowest health drain once loaded
  useEffect(() => {
    if (drains.length > 0 && selectedSpotId === null) {
      const sorted = [...drains].sort((a, b) => a.health_score - b.health_score);
      setSelectedSpotId(sorted[0].spot_id);
    }
  }, [drains, selectedSpotId]);

  const { detail, isLoading: isDetailLoading } = useDrainHealthDetail(selectedSpotId);

  // Compute summary stats
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

    // Find earliest future or overdue predicted failure date
    const drainsWithFailures = drains
      .filter((d) => d.predicted_failure_date)
      .sort((a, b) =>
        (a.predicted_failure_date || "").localeCompare(b.predicted_failure_date || "")
      );

    const nextFailure =
      drainsWithFailures.length > 0
        ? {
            name: drainsWithFailures[0].name,
            date: drainsWithFailures[0].predicted_failure_date!,
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
    <div className="p-4 lg:p-6 space-y-5 max-w-[1600px] mx-auto w-full min-h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Top Banner & Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl lg:text-2xl font-bold text-white tracking-tight">
              Drain Health & Silt Accumulation Index
            </h1>
            <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-[#7B68EE]/20 text-[#b8a9ff] border border-[#7B68EE]/30">
              Ward G-South Prioritisation
            </span>
          </div>
          <p className="text-xs lg:text-sm text-slate-400 mt-1 max-w-2xl">
            Proactive maintenance scheduling powered by longitudinal residual tracking (Δ). Desilt drains before street flooding happens.
          </p>
        </div>

        <button
          onClick={() => mutate()}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#12122b] hover:bg-[#1a1a3e] border border-[#7B68EE]/30 text-slate-300 hover:text-white text-xs font-mono transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#b8a9ff]" />
          <span>Refresh Standings</span>
        </button>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Drains At Risk */}
        <div className="p-4 rounded-2xl bg-[#12122b] border border-[#7B68EE]/25 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              Drains At Risk
            </div>
            <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
              {stats.atRiskCount}{" "}
              <span className="text-xs text-slate-400 font-normal">/ {drains.length}</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {stats.overdueCount > 0
                ? `${stats.overdueCount} overdue for desilting`
                : "Degrading Δ capacity"}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Next Failure Forecast */}
        <div className="p-4 rounded-2xl bg-[#12122b] border border-[#7B68EE]/25 shadow-lg flex items-center justify-between">
          <div className="truncate pr-2">
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              Next Critical Failure
            </div>
            <div className="text-sm font-bold text-rose-400 truncate mt-1">
              {stats.nextFailure?.name || "None projected"}
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-rose-400" />
              <span>
                {stats.nextFailure?.date ? formatDate(stats.nextFailure.date) : "Beyond Horizon"}
              </span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
            <Flame className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Average Drain Health */}
        <div className="p-4 rounded-2xl bg-[#12122b] border border-[#7B68EE]/25 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              Ward Avg Health Index
            </div>
            <div className="text-2xl font-bold font-mono text-[#b8a9ff] mt-1">
              {stats.avgHealth.toFixed(1)}{" "}
              <span className="text-xs text-slate-400 font-normal">/ 100</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Learned zero-Δ benchmark
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#7B68EE]/15 border border-[#7B68EE]/30 flex items-center justify-center text-[#b8a9ff]">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Monitoring Coverage */}
        <div className="p-4 rounded-2xl bg-[#12122b] border border-[#7B68EE]/25 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              Tracked Outfalls
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
              {drains.length}{" "}
              <span className="text-xs text-slate-400 font-normal">Spots</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              53 Weeks continuous history
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Content Area: Left Leaderboard / Right Trend Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 items-stretch">
        <div className="lg:col-span-6 h-full min-h-[550px]">
          <Leaderboard
            drains={drains}
            selectedSpotId={selectedSpotId}
            onSelectSpot={(id) => setSelectedSpotId(id)}
          />
        </div>
        <div className="lg:col-span-6 h-full min-h-[550px]">
          <TrendChart detail={detail} isLoading={isDetailLoading} />
        </div>
      </div>
    </div>
  );
}
