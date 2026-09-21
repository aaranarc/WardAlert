"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { useSpots } from "@/hooks/useSpots";
import { SpotRisk, RiskLevel } from "@/lib/types";
import { formatDateDMY } from "@/lib/utils";
import { RISK_COLORS } from "@/lib/constants";
import { RiskPanel } from "@/components/Dashboard/RiskPanel";
import {
  IconFilter,
  IconLayers,
  IconCheck,
  IconClock,
  IconRefresh,
} from "@/components/Common/Icons";

const FloodMap = dynamic(() => import("@/components/Map/FloodMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-400 font-sans gap-2.5">
      <div className="w-7 h-7 border-2 border-[#0066cc] border-t-transparent rounded-full animate-spin" />
      <span className="text-xs">Loading Spatial Map...</span>
    </div>
  ),
});

export default function MapPage() {
  const { spots, isLoading, activeDate, refreshPredictions, replayCloudburst } = useSpots();
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
  const [selectedSpot, setSelectedSpot] = useState<SpotRisk | null>(null);
  const [riskFilter, setRiskFilter] = useState<string>("all");

  const filteredSpots = spots.filter(
    (s) => riskFilter === "all" || s.risk_level === riskFilter
  );

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] relative bg-slate-100 overflow-hidden">
      {/* Top Floating Controls Bar */}
      <div className="absolute top-4 left-4 right-4 z-10 pointer-events-none flex flex-wrap items-center justify-between gap-3">
        <div className="bg-white/95 backdrop-blur-md p-2.5 rounded-xl border border-slate-200 shadow-xs pointer-events-auto flex items-center gap-3">
          <div>
            <h2 className="text-xs font-bold text-slate-900">Live Spatial Assessment</h2>
            <p className="text-[10px] text-slate-500">Mumbai Ward G/South boundary grid</p>
          </div>

          <div className="h-5 w-px bg-slate-200" />

          {/* Risk Filters */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setRiskFilter("all")}
              className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                riskFilter === "all"
                  ? "bg-[#0066cc] text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              All ({spots.length})
            </button>
            {(["critical", "high", "moderate", "low"] as RiskLevel[]).map((level) => (
              <button
                key={level}
                onClick={() => setRiskFilter(level)}
                className={`px-2 py-1 rounded-md text-[11px] font-medium capitalize transition-colors flex items-center gap-1 ${
                  riskFilter === level
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: RISK_COLORS[level] }}
                />
                <span>{level}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Replay / Refresh Controls */}
        <div className="bg-white/95 backdrop-blur-md p-1.5 rounded-xl border border-slate-200 shadow-xs pointer-events-auto flex items-center gap-2 flex-wrap">
          <div suppressHydrationWarning className="px-2.5 py-1 rounded-lg bg-[#e8f2fc] border border-[#0066cc]/25 text-[#0066cc] text-xs font-medium flex items-center gap-1.5">
            <IconClock className="w-3.5 h-3.5 shrink-0" />
            <span suppressHydrationWarning>
              Displaying Date: <strong suppressHydrationWarning className="font-semibold text-slate-900">{formatDateDMY(activeDate)}</strong>
            </span>
          </div>

          <button
            onClick={handleReplayCloudburst}
            disabled={isActing}
            className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-2xs"
            title="Replay 2025 Cloudburst event across all spots (14 July 2025)"
          >
            <IconRefresh className={`w-3 h-3 ${isActing && activeAction === "cloudburst" ? "animate-spin" : ""}`} />
            <span>{isActing && activeAction === "cloudburst" ? "Replaying..." : "Replay 2025 Cloudburst"}</span>
          </button>

          <button
            onClick={handleRefreshPredictions}
            disabled={isActing}
            className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-2xs"
            title="Refresh moderate monsoon predictions across all 30 spots for 3 July 2023"
          >
            <IconRefresh className={`w-3 h-3 ${isActing && activeAction === "refresh" ? "animate-spin text-[#0066cc]" : ""}`} />
            <span>{isActing && activeAction === "refresh" ? "Refreshing..." : "Refresh Predictions"}</span>
          </button>
        </div>

        {/* Layer Info Pill */}
        <div className="bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-200 shadow-xs pointer-events-auto text-[11px] text-slate-600 flex items-center gap-2">
          <IconLayers className="w-3.5 h-3.5 text-[#0066cc]" />
          <span>{spots.length > 0 ? `${spots.length} Chronic Spots Monitored` : "—"}</span>
        </div>
      </div>

      {/* Main Map */}
      <div className="w-full h-full">
        <FloodMap
          spots={filteredSpots}
          selectedSpot={selectedSpot}
          onSelectSpot={(spot) => setSelectedSpot(spot)}
        />
      </div>

      {/* Bottom Horizontal Spot Strip */}
      <div className="absolute bottom-4 left-4 right-4 z-10 pointer-events-none flex overflow-x-auto gap-2">
        <div className="bg-white/95 backdrop-blur-md p-2 rounded-xl border border-slate-200 shadow-xs pointer-events-auto flex items-center gap-2 max-w-full overflow-x-auto">
          {spots.slice(0, 6).map((spot) => {
            const isSelected = selectedSpot?.spot_id === spot.spot_id;
            return (
              <button
                key={spot.spot_id}
                onClick={() => setSelectedSpot(spot)}
                className={`px-3 py-1.5 rounded-lg text-left transition-colors whitespace-nowrap text-xs border ${
                  isSelected
                    ? "bg-[#e8f2fc] border-[#0066cc] text-[#0066cc]"
                    : "bg-white border-slate-200 text-slate-800 hover:bg-slate-50"
                }`}
              >
                <div className="font-semibold text-[11px] truncate max-w-[130px]">{spot.name}</div>
                <div className="text-[10px] text-slate-500 capitalize">
                  {spot.risk_level} risk
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Slide-in Detail Drawer */}
      {selectedSpot && (
        <div className="absolute top-4 right-4 bottom-4 w-full sm:w-[380px] z-20 overflow-y-auto">
          <RiskPanel
            spotId={selectedSpot.spot_id}
            onClose={() => setSelectedSpot(null)}
          />
        </div>
      )}
    </div>
  );
}
