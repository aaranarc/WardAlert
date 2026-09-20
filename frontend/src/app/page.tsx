"use client";

import React, { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useSpots } from "@/hooks/useSpots";
import { usePredict } from "@/hooks/usePredict";
import { SpotRisk, RiskLevel } from "@/lib/types";
import { RiskPanel } from "@/components/Dashboard/RiskPanel";
import { RISK_COLORS } from "@/lib/constants";
import { SearchIcon, RefreshIcon } from "@/components/Icons";

const FloodMap = dynamic(() => import("@/components/Map/FloodMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#f7f8fa] text-[#5b6478] font-mono text-xs gap-2">
      <div className="w-6 h-6 border-2 border-[#1e40af] border-t-transparent animate-spin" />
      <span>INITIALIZING WARD G-SOUTH SPATIAL LAYER...</span>
    </div>
  ),
});

export default function DashboardPage() {
  const { spots, isLoading, mutate } = useSpots();
  const { predictAll, isPredicting } = usePredict();

  const [selectedSpot, setSelectedSpot] = useState<SpotRisk | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  const filteredSpots = useMemo(() => {
    return spots.filter((spot) => {
      const matchesSearch = spot.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesRisk =
        riskFilter === "all" || spot.risk_level === riskFilter;
      return matchesSearch && matchesRisk;
    });
  }, [spots, searchQuery, riskFilter]);

  const riskCounts = useMemo(() => {
    const counts = { critical: 0, high: 0, moderate: 0, low: 0, unknown: 0, drainageFailure: 0 };
    spots.forEach((s) => {
      if (s.risk_level && counts[s.risk_level] !== undefined) {
        counts[s.risk_level]++;
      } else {
        counts.unknown++;
      }
      if (s.cause_label === "drainage_failure") {
        counts.drainageFailure++;
      }
    });
    return counts;
  }, [spots]);

  const handlePredictAll = async (timestamp?: string) => {
    setBannerMessage(
      timestamp
        ? `Running batch predictions for 2025 monsoon moment: ${timestamp}...`
        : "Computing fresh dual-model predictions for all 30 spots..."
    );
    const results = await predictAll(timestamp);
    if (results) {
      await mutate();
      setBannerMessage(
        timestamp
          ? `Simulated 2025 monsoon cloudburst event across all ${results.length} spots.`
          : `Updated all ${results.length} spot predictions.`
      );
      setTimeout(() => setBannerMessage(null), 6000);
    }
  };

  const handleSpotUpdated = (updatedSpot: SpotRisk) => {
    setSelectedSpot(updatedSpot);
    mutate();
  };

  return (
    <div className="relative w-full h-[calc(100vh-3.25rem)] overflow-hidden flex flex-col bg-[#f7f8fa]">
      {/* Top Operational Command Bar & KPI Strip */}
      <div className="bg-[#ffffff] border-b border-[#d4dae3] px-3 py-2 z-20 flex flex-col gap-2 shadow-sm">
        {/* Unadorned Monospace KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono border-b border-[#e2e8f0] pb-2">
          <div className="flex items-center justify-between px-2 py-1 bg-[#f8fafc] border border-[#d4dae3]">
            <span className="text-[#5b6478]">TOTAL SPOTS:</span>
            <span className="font-bold text-[#1a1f2e]">{spots.length}</span>
          </div>
          <div className="flex items-center justify-between px-2 py-1 bg-[#fef2f2] border border-[#fecaca]">
            <span className="text-[#b91c1c]">CRITICAL RISK:</span>
            <span className="font-bold text-[#b91c1c]">{riskCounts.critical}</span>
          </div>
          <div className="flex items-center justify-between px-2 py-1 bg-[#fffbeb] border border-[#fde68a]">
            <span className="text-[#b45309]">DRAIN FAILURES:</span>
            <span className="font-bold text-[#b45309]">{riskCounts.drainageFailure}</span>
          </div>
          <div className="flex items-center justify-between px-2 py-1 bg-[#f0fdf4] border border-[#bbf7d0]">
            <span className="text-[#166534]">SAFE / LOW:</span>
            <span className="font-bold text-[#166534]">{riskCounts.low}</span>
          </div>
        </div>

        {/* Filters & Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <SearchIcon className="w-3.5 h-3.5 text-[#5b6478] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter 30 spots (e.g. Hindmata)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1 text-xs bg-[#ffffff] border border-[#d4dae3] text-[#1a1f2e] placeholder-[#5b6478] focus:outline-none focus:border-[#1e40af] font-sans"
            />
          </div>

          {/* Risk Filter Buttons */}
          <div className="flex items-center gap-1 text-xs font-mono">
            <button
              onClick={() => setRiskFilter("all")}
              className={`px-2 py-1 transition-colors border ${
                riskFilter === "all"
                  ? "bg-[#1e40af] text-white border-[#1e40af]"
                  : "bg-[#ffffff] text-[#1a1f2e] border-[#d4dae3] hover:bg-[#f8fafc]"
              }`}
            >
              ALL ({spots.length})
            </button>
            {(["critical", "high", "moderate", "low"] as RiskLevel[]).map((level) => {
              const count = riskCounts[level];
              const isActive = riskFilter === level;
              return (
                <button
                  key={level}
                  onClick={() => setRiskFilter(isActive ? "all" : level)}
                  className={`px-2 py-1 uppercase transition-colors border flex items-center gap-1 ${
                    isActive
                      ? "bg-[#1e40af] text-white border-[#1e40af]"
                      : "bg-[#ffffff] text-[#1a1f2e] border-[#d4dae3] hover:bg-[#f8fafc]"
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: RISK_COLORS[level] }}
                  />
                  <span>{level}</span>
                  <span className="text-[10px] opacity-75">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Batch Actions */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handlePredictAll()}
              disabled={isPredicting}
              className="py-1 px-2.5 bg-[#1e40af] hover:bg-[#1d4ed8] text-white text-xs font-medium font-sans flex items-center gap-1 transition-colors disabled:opacity-50"
              title="Run inference across all 30 spots"
            >
              <RefreshIcon className={`w-3 h-3 ${isPredicting ? "animate-spin" : ""}`} />
              <span>Predict All</span>
            </button>

            <button
              onClick={() => handlePredictAll("2025-07-15T10:30:00Z")}
              disabled={isPredicting}
              className="py-1 px-2.5 bg-[#ffffff] hover:bg-[#fef2f2] border border-[#b91c1c] text-[#b91c1c] text-xs font-mono flex items-center gap-1 transition-colors disabled:opacity-50"
              title="Replay extreme cloudburst on 15 July 2025"
            >
              <span>[SIMULATION] Replay 2025 Monsoon</span>
            </button>
          </div>
        </div>

        {/* Live Notification Bar */}
        {bannerMessage && (
          <div className="bg-[#eff6ff] border border-[#bfdbfe] text-[#1e40af] px-3 py-1 text-xs font-mono flex items-center gap-2">
            <span>ℹ</span>
            <span>{bannerMessage}</span>
          </div>
        )}
      </div>

      {/* Main Map Area */}
      <div className="flex-1 w-full h-full relative">
        <FloodMap
          spots={filteredSpots}
          selectedSpot={selectedSpot}
          onSelectSpot={(spot) => setSelectedSpot(spot)}
        />

        {/* Map Legend */}
        <div className="absolute top-3 right-3 z-10 bg-[#ffffff] border border-[#d4dae3] p-2 text-xs space-y-1 shadow-sm pointer-events-auto">
          <div className="font-bold text-[#1a1f2e] text-[10px] uppercase tracking-wider font-mono">
            RISK TIER LEGEND
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] font-mono">
            {(["critical", "high", "moderate", "low"] as RiskLevel[]).map((level) => (
              <div key={level} className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: RISK_COLORS[level] }}
                />
                <span className="capitalize text-[#1a1f2e]">{level}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Slide-out Risk Detail Panel */}
      {selectedSpot && (
        <RiskPanel
          spot={selectedSpot}
          onClose={() => setSelectedSpot(null)}
          onSpotUpdated={handleSpotUpdated}
        />
      )}
    </div>
  );
}
