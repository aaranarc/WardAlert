"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useDrainHealth, useDrainHealthDetail } from "@/hooks/useDrainHealth";
import { Leaderboard } from "@/components/DrainHealth/Leaderboard";
import { TrendChart } from "@/components/DrainHealth/TrendChart";
import { formatDate } from "@/lib/utils";
import { RefreshIcon } from "@/components/Icons";

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
    <div className="p-3 lg:p-4 space-y-3 max-w-[1600px] mx-auto w-full min-h-[calc(100vh-3.25rem)] flex flex-col">
      {/* Top Header & Refresh */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#d4dae3]">
        <div>
          <h1 className="text-base font-bold text-[#1a1f2e] tracking-tight font-sans">
            DRAIN HEALTH & SILTATION INDEX
          </h1>
          <p className="text-xs text-[#5b6478]">
            Longitudinal degradation monitoring for proactive municipal desilting schedule across Ward G-South.
          </p>
        </div>

        <button
          onClick={() => mutate()}
          className="flex items-center gap-1.5 px-2.5 py-1 border border-[#d4dae3] bg-[#ffffff] hover:bg-[#f8fafc] text-[#1a1f2e] text-xs font-mono transition-colors"
        >
          <RefreshIcon className="w-3.5 h-3.5 text-[#1e40af]" />
          <span>REFRESH STANDINGS</span>
        </button>
      </div>

      {/* 4 KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs font-mono">
        <div className="p-2.5 bg-[#ffffff] border border-[#d4dae3] flex flex-col justify-between">
          <span className="text-[10px] text-[#5b6478] uppercase">DRAINS AT RISK</span>
          <div className="text-xl font-bold text-[#b45309] mt-1">
            {stats.atRiskCount} <span className="text-xs text-[#5b6478] font-normal">/ {drains.length}</span>
          </div>
          <span className="text-[10px] text-[#5b6478] mt-0.5">
            {stats.overdueCount > 0 ? `${stats.overdueCount} overdue for desilting` : "Degrading Δ capacity"}
          </span>
        </div>

        <div className="p-2.5 bg-[#ffffff] border border-[#d4dae3] flex flex-col justify-between">
          <span className="text-[10px] text-[#5b6478] uppercase">NEXT PROJECTED FAILURE</span>
          <div className="text-sm font-bold text-[#b91c1c] truncate mt-1">
            {stats.nextFailure?.name || "NONE PROJECTED"}
          </div>
          <span className="text-[10px] text-[#5b6478] mt-0.5">
            {stats.nextFailure?.date ? formatDate(stats.nextFailure.date) : "Safe horizon"}
          </span>
        </div>

        <div className="p-2.5 bg-[#ffffff] border border-[#d4dae3] flex flex-col justify-between">
          <span className="text-[10px] text-[#5b6478] uppercase">WARD AVG HEALTH INDEX</span>
          <div className="text-xl font-bold text-[#1e40af] mt-1">
            {stats.avgHealth.toFixed(1)} <span className="text-xs text-[#5b6478] font-normal">/ 100</span>
          </div>
          <span className="text-[10px] text-[#5b6478] mt-0.5">Learned zero-Δ benchmark</span>
        </div>

        <div className="p-2.5 bg-[#ffffff] border border-[#d4dae3] flex flex-col justify-between">
          <span className="text-[10px] text-[#5b6478] uppercase">MONITORED OUTFALLS</span>
          <div className="text-xl font-bold text-[#166534] mt-1">
            {drains.length} <span className="text-xs text-[#5b6478] font-normal">SPOTS</span>
          </div>
          <span className="text-[10px] text-[#5b6478] mt-0.5">53 weeks history</span>
        </div>
      </div>

      {/* Main Grid: Left Leaderboard / Right Trend Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 items-stretch">
        <div className="lg:col-span-6 h-full min-h-[500px]">
          <Leaderboard
            drains={drains}
            selectedSpotId={selectedSpotId}
            onSelectSpot={(id) => setSelectedSpotId(id)}
          />
        </div>
        <div className="lg:col-span-6 h-full min-h-[500px]">
          <TrendChart detail={detail} isLoading={isDetailLoading} />
        </div>
      </div>
    </div>
  );
}
