"use client";

import React, { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useSpots } from "@/hooks/useSpots";
import { usePredict } from "@/hooks/usePredict";
import { SpotRisk, RiskLevel } from "@/lib/types";
import { RiskPanel } from "@/components/Dashboard/RiskPanel";
import { RISK_COLORS } from "@/lib/constants";
import {
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  Flame,
  Calendar,
  Layers,
  MapPin,
  Sparkles,
} from "lucide-react";

// Dynamically import Leaflet FloodMap with SSR disabled
const FloodMap = dynamic(() => import("@/components/Map/FloodMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#0a0a0f] text-slate-400 font-mono gap-3">
      <div className="w-10 h-10 border-2 border-[#7B68EE] border-t-transparent rounded-full animate-spin" />
      <span className="text-sm">Initializing Ward G-South Spatial Grid...</span>
    </div>
  ),
});

export default function DashboardPage() {
  const { spots, isLoading, isError, mutate } = useSpots();
  const { predictAll, isPredicting } = usePredict();

  const [selectedSpot, setSelectedSpot] = useState<SpotRisk | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  // Filter spots by search and risk level
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

  // Risk distribution count
  const riskCounts = useMemo(() => {
    const counts = { critical: 0, high: 0, moderate: 0, low: 0, unknown: 0 };
    spots.forEach((s) => {
      if (s.risk_level && counts[s.risk_level] !== undefined) {
        counts[s.risk_level]++;
      } else {
        counts.unknown++;
      }
    });
    return counts;
  }, [spots]);

  // Handle batch prediction
  const handlePredictAll = async (timestamp?: string) => {
    setBannerMessage(
      timestamp
        ? `Running batch predictions for 2025 Monsoon instant: ${timestamp}...`
        : "Computing fresh dual-model predictions for all 30 spots..."
    );
    const results = await predictAll(timestamp);
    if (results) {
      await mutate();
      setBannerMessage(
        timestamp
          ? `✓ Replayed 2025 Monsoon event across all ${results.length} spots.`
          : `✓ Successfully updated all ${results.length} spot predictions.`
      );
      setTimeout(() => setBannerMessage(null), 6000);
    }
  };

  const handleSpotUpdated = (updatedSpot: SpotRisk) => {
    setSelectedSpot(updatedSpot);
    mutate();
  };

  return (
    <div className="relative w-full h-[calc(100vh-3.5rem)] overflow-hidden flex flex-col bg-[#0a0a0f]">
      {/* Top Floating Command Bar */}
      <div className="absolute top-3 left-3 right-3 lg:left-6 lg:right-6 z-20 pointer-events-none flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0d0d1a]/90 backdrop-blur-md p-2.5 rounded-xl border border-[#7B68EE]/30 shadow-2xl pointer-events-auto">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search 30 flood spots (e.g. Hindmata)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-[#12122b] border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-[#7B68EE] transition-colors font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Risk Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-mono">
            <button
              onClick={() => setRiskFilter("all")}
              className={`px-2.5 py-1 rounded-lg transition-all font-medium ${
                riskFilter === "all"
                  ? "bg-[#7B68EE] text-white shadow-[0_0_10px_rgba(123,104,238,0.4)]"
                  : "bg-[#12122b] text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              All ({spots.length})
            </button>
            {(["critical", "high", "moderate", "low"] as RiskLevel[]).map(
              (level) => {
                const count = riskCounts[level];
                const isActive = riskFilter === level;
                return (
                  <button
                    key={level}
                    onClick={() => setRiskFilter(isActive ? "all" : level)}
                    className={`px-2.5 py-1 rounded-lg capitalize transition-all flex items-center gap-1.5 ${
                      isActive
                        ? "bg-[#1f1f45] text-white border"
                        : "bg-[#12122b] text-slate-400 hover:text-slate-200 border border-slate-800/80"
                    }`}
                    style={{
                      borderColor: isActive ? RISK_COLORS[level] : undefined,
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: RISK_COLORS[level] }}
                    />
                    <span>{level}</span>
                    <span className="text-[10px] text-slate-400">({count})</span>
                  </button>
                );
              }
            )}
          </div>

          {/* Batch Actions & Historical Simulation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePredictAll()}
              disabled={isPredicting}
              className="py-1.5 px-3 rounded-lg bg-[#7B68EE]/20 hover:bg-[#7B68EE]/30 border border-[#7B68EE]/40 text-[#b8a9ff] hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              title="Run live inference on all 30 spots"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isPredicting ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Predict All</span>
            </button>

            <button
              onClick={() => handlePredictAll("2025-07-15T10:30:00Z")}
              disabled={isPredicting}
              className="py-1.5 px-3 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 hover:text-white text-xs font-mono font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-[0_0_12px_rgba(244,63,94,0.15)]"
              title="Replay historical extreme cloudburst on 15 July 2025"
            >
              <Calendar className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden md:inline">Replay 2025 Monsoon Flood</span>
              <span className="md:hidden">2025 Monsoon</span>
            </button>
          </div>
        </div>

        {/* Live Notification Banner */}
        {bannerMessage && (
          <div className="self-center bg-[#151538]/95 border border-[#7B68EE]/50 text-[#b8a9ff] px-4 py-2 rounded-xl text-xs font-mono shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200 pointer-events-auto flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{bannerMessage}</span>
          </div>
        )}
      </div>

      {/* Main Map View */}
      <div className="flex-1 w-full h-full relative">
        <FloodMap
          spots={filteredSpots}
          selectedSpot={selectedSpot}
          onSelectSpot={(spot) => setSelectedSpot(spot)}
        />

        {/* Bottom Left Map Legend */}
        <div className="absolute bottom-4 left-4 z-10 bg-[#0d0d1a]/90 backdrop-blur-md p-3 rounded-xl border border-[#7B68EE]/20 shadow-xl text-xs space-y-2 pointer-events-auto">
          <div className="font-bold text-white text-[11px] uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#b8a9ff]" />
            <span>Risk Index Legend</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
            {(["critical", "high", "moderate", "low"] as RiskLevel[]).map(
              (level) => (
                <div key={level} className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: RISK_COLORS[level] }}
                  />
                  <span className="capitalize text-slate-300">{level}</span>
                </div>
              )
            )}
          </div>
          <div className="pt-1.5 border-t border-slate-800 text-[10px] text-slate-400 font-mono">
            Ward G-South boundary (dashed)
          </div>
        </div>
      </div>

      {/* Risk Slide-in Panel */}
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
