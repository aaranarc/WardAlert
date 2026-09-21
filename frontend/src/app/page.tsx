"use client";

import React, { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSpots } from "@/hooks/useSpots";
import { usePredict } from "@/hooks/usePredict";
import { SpotRisk, RiskLevel } from "@/lib/types";
import { HERO_TIMESTAMP } from "@/lib/api";
import { formatDateDMY } from "@/lib/utils";
import { RiskPanel } from "@/components/Dashboard/RiskPanel";
import {
  IconWarning,
  IconCheck,
  IconClock,
  IconLayers,
  IconArrowRight,
  IconRefresh,
  IconSend,
} from "@/components/Common/Icons";

// Dynamically import Leaflet FloodMap with SSR disabled
const FloodMap = dynamic(() => import("@/components/Map/FloodMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-400 font-sans gap-2.5">
      <div className="w-7 h-7 border-2 border-[#0066cc] border-t-transparent rounded-full animate-spin" />
      <span className="text-xs">Loading Ward G/South Spatial Grid...</span>
    </div>
  ),
});

export default function DashboardPage() {
  const { spots, isLoading, isError, mutate, activeDate, refreshPredictions, replayCloudburst } = useSpots();
  const { predictAll, isPredicting } = usePredict();

  const [selectedSpotId, setSelectedSpotId] = useState<number | null>(null);
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  // Risk distribution count
  const riskCounts = useMemo(() => {
    const counts = { critical: 0, high: 0, moderate: 0, low: 0 };
    spots.forEach((s) => {
      const level = s.risk_level as RiskLevel;
      if (level && counts[level] !== undefined) {
        counts[level]++;
      }
    });
    return counts;
  }, [spots]);

  // Selected spot
  const selectedSpot = useMemo(
    () => spots.find((s) => s.spot_id === selectedSpotId) ?? null,
    [spots, selectedSpotId]
  );

  // Filtered spots for map
  const filteredSpots = useMemo(() => {
    return spots.filter((spot) => {
      return riskFilter === "all" || spot.risk_level === riskFilter;
    });
  }, [spots, riskFilter]);

  const [isMonsoonMode, setIsMonsoonMode] = useState<boolean>(true);
  const [isActing, setIsActing] = useState<boolean>(false);
  const [activeAction, setActiveAction] = useState<"refresh" | "cloudburst" | null>(null);

  const handleRefreshPredictions = async () => {
    setIsActing(true);
    setActiveAction("refresh");
    try {
      const res = await refreshPredictions();
      if (res && res.length > 0) {
        setIsMonsoonMode(false);
        const formatted = formatDateDMY(res[0].predicted_for);
        setBannerMessage(`Loaded historical prediction data for ${formatted} across all ${res.length} spots.`);
        setTimeout(() => setBannerMessage(null), 6000);
      }
    } finally {
      setIsActing(false);
      setActiveAction(null);
    }
  };

  const handleReplayCloudburst = async () => {
    setIsActing(true);
    setActiveAction("cloudburst");
    try {
      const res = await replayCloudburst();
      if (res && res.length > 0) {
        setIsMonsoonMode(true);
        setBannerMessage("2025 Cloudburst replayed (15 July 2025): Severe waterlogging risk across all 30 spots.");
        setTimeout(() => setBannerMessage(null), 6000);
      }
    } finally {
      setIsActing(false);
      setActiveAction(null);
    }
  };

  const handleSpotUpdated = async (updatedSpot: SpotRisk) => {
    await mutate(
      (current) =>
        current
          ? current.map((s) => (s.spot_id === updatedSpot.spot_id ? { ...s, ...updatedSpot } : s))
          : [updatedSpot],
      false
    );
    await mutate();
  };

  // Top alert spots from real data
  const topAlertSpots = useMemo(() => {
    return [...spots]
      .filter((s) => s.p_actual != null)
      .sort((a, b) => (b.p_actual || 0) - (a.p_actual || 0))
      .slice(0, 4);
  }, [spots]);

  // Dynamic quick insights from real data
  const positiveDeltaSpots = useMemo(() => {
    return spots.filter((s) => s.delta != null && s.delta > 0);
  }, [spots]);

  const desiltingSpots = useMemo(() => {
    return spots.filter((s) => s.dispatch_type === "desilting_crew");
  }, [spots]);

  return (
    <div className="flex-1 bg-[#f8fafc] p-4 lg:p-6 space-y-5 max-w-[1600px] mx-auto w-full">
      {/* Top Greeting and Telemetry Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Good Afternoon, Admin
            </h1>
            {isMonsoonMode && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-700 border border-rose-200">
                Monsoon Simulation
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Latest flood risk overview for Mumbai Ward G/South.
          </p>
        </div>

        {/* Replay Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {activeDate && (
            <div className="px-3 py-1.5 rounded-lg bg-[#e8f2fc] border border-[#0066cc]/25 text-[#0066cc] text-xs font-medium flex items-center gap-1.5 shadow-2xs">
              <IconClock className="w-3.5 h-3.5 shrink-0" />
              <span>
                Displaying Date: <strong className="font-semibold text-slate-900">{formatDateDMY(activeDate)}</strong>
              </span>
            </div>
          )}
          <button
            onClick={handleReplayCloudburst}
            disabled={isActing}
            className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-2xs"
            title="Replay 2025 Cloudburst event across all spots (15 July 2025)"
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

      {/* Notification Banner */}
      {bannerMessage && (
        <div className="p-3 bg-white border border-[#0066cc]/30 rounded-xl text-xs text-[#0066cc] font-medium flex items-center justify-between shadow-xs">
          <span>{bannerMessage}</span>
          <button onClick={() => setBannerMessage(null)} className="text-slate-400 hover:text-slate-700 text-sm">✕</button>
        </div>
      )}

      {/* Top 4 Metrics Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Critical */}
        <button
          onClick={() => setRiskFilter(riskFilter === "critical" ? "all" : "critical")}
          className={`p-3.5 rounded-xl text-left transition-all border ${
            riskFilter === "critical"
              ? "bg-rose-50/80 border-rose-300 ring-2 ring-rose-400/30"
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
              <IconWarning className="w-4 h-4" />
            </div>
            <span className="text-xs text-slate-400">›</span>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-2">
            {spots.length > 0 ? riskCounts.critical : "—"}
          </div>
          <div className="text-xs font-semibold text-rose-700 mt-0.5">Critical Spots</div>
          <div className="text-[10px] text-slate-400">
            {spots.length > 0 ? `out of ${spots.length} monitored` : "—"}
          </div>
        </button>

        {/* High Risk */}
        <button
          onClick={() => setRiskFilter(riskFilter === "high" ? "all" : "high")}
          className={`p-3.5 rounded-xl text-left transition-all border ${
            riskFilter === "high"
              ? "bg-amber-50/80 border-amber-300 ring-2 ring-amber-400/30"
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
              <IconWarning className="w-4 h-4" />
            </div>
            <span className="text-xs text-slate-400">›</span>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-2">
            {spots.length > 0 ? riskCounts.high : "—"}
          </div>
          <div className="text-xs font-semibold text-orange-700 mt-0.5">High Risk</div>
          <div className="text-[10px] text-slate-400">
            {spots.length > 0 ? `out of ${spots.length} monitored` : "—"}
          </div>
        </button>

        {/* Moderate Risk */}
        <button
          onClick={() => setRiskFilter(riskFilter === "moderate" ? "all" : "moderate")}
          className={`p-3.5 rounded-xl text-left transition-all border ${
            riskFilter === "moderate"
              ? "bg-yellow-50/80 border-yellow-300 ring-2 ring-yellow-400/30"
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <IconWarning className="w-4 h-4" />
            </div>
            <span className="text-xs text-slate-400">›</span>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-2">
            {spots.length > 0 ? riskCounts.moderate : "—"}
          </div>
          <div className="text-xs font-semibold text-amber-800 mt-0.5">Moderate Risk</div>
          <div className="text-[10px] text-slate-400">
            {spots.length > 0 ? `out of ${spots.length} monitored` : "—"}
          </div>
        </button>

        {/* Low Risk */}
        <button
          onClick={() => setRiskFilter(riskFilter === "low" ? "all" : "low")}
          className={`p-3.5 rounded-xl text-left transition-all border ${
            riskFilter === "low"
              ? "bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-400/30"
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <IconCheck className="w-4 h-4" />
            </div>
            <span className="text-xs text-slate-400">›</span>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-2">
            {spots.length > 0 ? riskCounts.low : "—"}
          </div>
          <div className="text-xs font-semibold text-emerald-700 mt-0.5">Low Risk</div>
          <div className="text-[10px] text-slate-400">
            {spots.length > 0 ? `out of ${spots.length} monitored` : "—"}
          </div>
        </button>
      </div>

      {/* Main Core Grid (Map on Left, Risk Panel on Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Section: Map + Insight Cards (7 of 12 columns) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Live Flood Risk Map Container */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-900">Live Flood Risk Map</span>
                <div className="flex items-center gap-2 text-[10px] font-medium">
                  <span className="flex items-center gap-1 text-slate-600">
                    <span className="w-2 h-2 rounded-full bg-rose-500" /> Critical
                  </span>
                  <span className="flex items-center gap-1 text-slate-600">
                    <span className="w-2 h-2 rounded-full bg-orange-500" /> High
                  </span>
                  <span className="flex items-center gap-1 text-slate-600">
                    <span className="w-2 h-2 rounded-full bg-amber-500" /> Moderate
                  </span>
                  <span className="flex items-center gap-1 text-slate-600">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Low
                  </span>
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-[#0066cc] font-medium px-2 py-0.5 rounded-md bg-[#e8f2fc]">
                <IconLayers className="w-3 h-3" />
                <span>Ward G/South Boundary</span>
              </div>
            </div>

            {/* Embedded Leaflet Map */}
            <div className="w-full h-[400px] relative">
              <FloodMap
                spots={filteredSpots}
                selectedSpot={selectedSpot}
                onSelectSpot={(spot) => setSelectedSpotId(spot.spot_id)}
              />
            </div>
          </div>

          {/* 3 Informative Cards under Map (Recent Alerts, Quick Insights, Input Layers) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Recent Alerts */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Recent Alerts</span>
                <Link href="/alerts" className="text-[10px] text-[#0066cc] font-medium hover:underline">
                  View all →
                </Link>
              </div>
              <div className="space-y-2">
                {topAlertSpots.length > 0 ? (
                  topAlertSpots.map((s) => {
                    const level = s.risk_level || "low";
                    const badgeClass =
                      level === "critical"
                        ? "bg-rose-100 text-rose-700"
                        : level === "high"
                        ? "bg-orange-100 text-orange-700"
                        : level === "moderate"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-100 text-emerald-700";
                    return (
                      <div key={s.spot_id} className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-800 font-medium truncate max-w-[110px]">{s.name}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold capitalize ${badgeClass}`}>
                          {level}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-xs text-slate-400 py-2 text-center font-mono">—</div>
                )}
              </div>
            </div>

            {/* Quick Insights */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2.5">
              <span className="text-xs font-bold text-slate-900 block">Quick Insights</span>
              <div className="space-y-2 text-[11px]">
                <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="font-semibold text-slate-900">
                    {spots.length > 0 ? `Δ positive at ${positiveDeltaSpots.length} spots:` : "—"}
                  </span>
                  <p className="text-slate-500 text-[10px] mt-0.5">
                    {positiveDeltaSpots.length > 0
                      ? "Drainage bottlenecks detected."
                      : "Drainage networks operating within baseline."}
                  </p>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="font-semibold text-slate-900">
                    {spots.length > 0 ? `${desiltingSpots.length} spots need desilting:` : "—"}
                  </span>
                  <p className="text-slate-500 text-[10px] mt-0.5">
                    {desiltingSpots.length > 0
                      ? "Priority desilting crew dispatch advised."
                      : "Standard maintenance intervals sufficient."}
                  </p>
                </div>
              </div>
            </div>

            {/* Input Data Layers */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2.5">
              <span className="text-xs font-bold text-slate-900 block">Input Data Layers</span>
              <div className="space-y-1.5 text-[11px] text-slate-600">
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span>Rainfall</span>
                  <span className="font-mono text-[10px] text-slate-400">CHIRPS/ERA5</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span>Elevation</span>
                  <span className="font-mono text-[10px] text-slate-400">SRTM 30m</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span>Drainage</span>
                  <span className="font-mono text-[10px] text-slate-400">54 OSM lines</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span>Flood Events</span>
                  <span className="font-mono text-[10px] text-slate-400">32 BMC events</span>
                </div>
              </div>
            </div>
          </div>

          {/* Citizen WhatsApp Subscription Banner */}
          <div className="p-3.5 rounded-xl bg-[#0f3554] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
                <IconSend className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-xs font-semibold">WhatsApp Citizen Alerts</div>
                <div className="text-[11px] text-slate-300">
                  Receive hyperlocal flood updates in English, Hindi, and Marathi.
                </div>
              </div>
            </div>
            <Link
              href="/alerts"
              className="text-xs bg-white text-[#0f3554] font-semibold px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors text-center shrink-0"
            >
              Test Dispatch
            </Link>
          </div>
        </div>

        {/* Right Section: Risk Details Panel (5 of 12 columns) */}
        <div className="lg:col-span-5 sticky top-20">
          <RiskPanel
            spotId={selectedSpotId}
            onClose={() => setSelectedSpotId(null)}
            onSpotUpdated={handleSpotUpdated}
          />
        </div>
      </div>
    </div>
  );
}
