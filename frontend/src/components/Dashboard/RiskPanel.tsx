"use client";

import React, { useState } from "react";
import Link from "next/link";
import { SpotRisk, PredictionResponse } from "@/lib/types";
import { RISK_COLORS, RISK_BG_COLORS, RISK_BORDER_COLORS } from "@/lib/constants";
import { formatPercent, formatNumber, formatDateTime } from "@/lib/utils";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { ShapChart } from "./ShapChart";
import { DispatchCard } from "./DispatchCard";
import { usePredict } from "@/hooks/usePredict";
import {
  X,
  MapPin,
  TrendingUp,
  CloudRain,
  Activity,
  Layers,
  Sparkles,
  Bell,
  ArrowUpRight,
  RefreshCw,
  Calendar,
  AlertCircle,
} from "lucide-react";

interface RiskPanelProps {
  spot: SpotRisk | null;
  onClose: () => void;
  onSpotUpdated?: (updatedSpot: SpotRisk) => void;
}

export function RiskPanel({ spot, onClose, onSpotUpdated }: RiskPanelProps) {
  const { predict, isPredicting } = usePredict();
  const [livePrediction, setLivePrediction] = useState<PredictionResponse | null>(null);
  const [customTimestamp, setCustomTimestamp] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!spot) return null;

  // Use live prediction if just generated, else spot's existing prediction
  const activePActual = livePrediction?.p_actual ?? spot.p_actual;
  const activePRain = livePrediction?.p_rain ?? spot.p_rain;
  const activeDelta = livePrediction?.delta ?? spot.delta;
  const activeRiskLevel = livePrediction?.risk_level ?? spot.risk_level ?? "unknown";
  const activeCauseLabel = livePrediction?.cause_label ?? spot.cause_label;
  const activeDispatchType = livePrediction?.dispatch_type ?? spot.dispatch_type;
  const activeConfidenceLower = livePrediction?.confidence_lower ?? spot.confidence_lower;
  const activeConfidenceUpper = livePrediction?.confidence_upper ?? spot.confidence_upper;
  const activeShap = livePrediction?.shap_top3 ?? spot.shap_top3;
  const activePredictedFor = livePrediction?.predicted_for ?? spot.predicted_for;

  const riskColor = RISK_COLORS[activeRiskLevel] || "#94a3b8";

  const handleRunPrediction = async (timestamp?: string) => {
    setStatusMessage(null);
    const result = await predict(spot.spot_id, timestamp);
    if (result) {
      setLivePrediction(result);
      setStatusMessage(
        timestamp
          ? `Predicted for monsoon instant: ${timestamp}`
          : "Fresh prediction generated successfully!"
      );
      if (onSpotUpdated) {
        onSpotUpdated({
          ...spot,
          p_actual: result.p_actual,
          p_rain: result.p_rain,
          delta: result.delta,
          risk_level: result.risk_level,
          cause_label: result.cause_label,
          dispatch_type: result.dispatch_type,
          confidence_lower: result.confidence_lower,
          confidence_upper: result.confidence_upper,
          shap_top3: result.shap_top3,
          predicted_for: result.predicted_for,
        });
      }
    }
  };

  return (
    <div className="fixed top-14 right-0 bottom-0 w-full sm:w-[420px] bg-[#0d0d1a]/95 backdrop-blur-xl border-l border-[#7B68EE]/30 shadow-2xl z-30 flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-4 border-b border-[#7B68EE]/20 flex items-center justify-between bg-[#12122b]/90">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div
            className="w-3.5 h-3.5 rounded-full shrink-0 shadow-[0_0_10px]"
            style={{
              backgroundColor: riskColor,
              boxShadow: `0 0 10px ${riskColor}`,
            }}
          />
          <div className="truncate">
            <h2 className="text-base font-bold text-white truncate leading-tight">
              {spot.name}
            </h2>
            <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
              <span>Spot #{spot.spot_id}</span>
              <span>•</span>
              <span>
                {spot.lat.toFixed(4)}°N, {spot.lng.toFixed(4)}°E
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
          aria-label="Close risk panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Risk Level Badge & Timestamp */}
        <div className="flex items-center justify-between">
          <div
            className="px-3 py-1 rounded-lg text-xs font-mono font-bold uppercase tracking-wider border flex items-center gap-1.5"
            style={{
              backgroundColor: RISK_BG_COLORS[activeRiskLevel],
              borderColor: RISK_BORDER_COLORS[activeRiskLevel],
              color: riskColor,
            }}
          >
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: riskColor }}
            />
            {activeRiskLevel} Risk
          </div>

          <div className="text-[11px] text-slate-400 font-mono">
            {formatDateTime(activePredictedFor)}
          </div>
        </div>

        {/* Spot Physical Attributes */}
        <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-[#0e0e24] border border-slate-800 text-xs">
          <div>
            <div className="text-[10px] text-slate-400 font-mono">Elevation</div>
            <div className="text-white font-mono font-semibold">
              {spot.elevation_m !== null ? `${spot.elevation_m} m` : "—"}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-mono">Depression</div>
            <div className="text-white font-mono font-semibold">
              {spot.depression_depth_m !== null ? `${spot.depression_depth_m} m` : "—"}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-mono">Drain Dist</div>
            <div className="text-white font-mono font-semibold">
              {spot.nearest_drain_m !== null ? `${Math.round(spot.nearest_drain_m)} m` : "—"}
            </div>
          </div>
        </div>

        {/* Spot Notes if available */}
        {spot.notes && (
          <div className="p-2.5 rounded-xl bg-[#12122b]/80 border border-[#7B68EE]/20 text-xs text-slate-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-[#b8a9ff] shrink-0 mt-0.5" />
            <span className="leading-snug">{spot.notes}</span>
          </div>
        )}

        {/* Probabilities Comparison Cards */}
        <div className="grid grid-cols-3 gap-2.5">
          {/* P_actual */}
          <div className="p-3 rounded-xl bg-[#141432] border border-[#7B68EE]/30 space-y-1">
            <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between">
              <span>P_actual</span>
              <Activity className="w-3 h-3 text-[#b8a9ff]" />
            </div>
            <div className="text-xl font-bold font-mono text-white">
              {formatPercent(activePActual, 1)}
            </div>
            <div className="text-[9px] text-slate-400">Model B (Full)</div>
          </div>

          {/* P_rain */}
          <div className="p-3 rounded-xl bg-[#141432] border border-[#7B68EE]/30 space-y-1">
            <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between">
              <span>P_rain</span>
              <CloudRain className="w-3 h-3 text-cyan-400" />
            </div>
            <div className="text-xl font-bold font-mono text-white">
              {formatPercent(activePRain, 1)}
            </div>
            <div className="text-[9px] text-slate-400">Model A (Rain)</div>
          </div>

          {/* Residual Delta */}
          <div className="p-3 rounded-xl bg-[#141432] border border-[#7B68EE]/30 space-y-1">
            <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between">
              <span>Δ Residual</span>
              <TrendingUp className="w-3 h-3 text-amber-400" />
            </div>
            <div
              className={`text-xl font-bold font-mono ${
                activeDelta && activeDelta > 0.1
                  ? "text-amber-400"
                  : activeDelta && activeDelta > 0
                  ? "text-slate-200"
                  : "text-emerald-400"
              }`}
            >
              {activeDelta !== null && activeDelta !== undefined
                ? activeDelta > 0
                  ? `+${activeDelta.toFixed(3)}`
                  : activeDelta.toFixed(3)
                : "—"}
            </div>
            <div className="text-[9px] text-slate-400">Unexplained Risk</div>
          </div>
        </div>

        {/* Confidence Interval Badge */}
        <ConfidenceBadge
          lower={activeConfidenceLower}
          upper={activeConfidenceUpper}
          actual={activePActual}
        />

        {/* SHAP Explanation Chart */}
        <ShapChart factors={activeShap} />

        {/* Dispatch Action Protocol */}
        <DispatchCard
          dispatchType={activeDispatchType}
          causeLabel={activeCauseLabel}
        />

        {/* Live Predict & Historical Replay Simulator */}
        <div className="p-3.5 rounded-xl bg-[#12122b] border border-[#7B68EE]/30 space-y-2.5">
          <div className="flex items-center justify-between text-xs text-slate-200 font-semibold">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#b8a9ff]" />
              <span>Model Execution & Simulation</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => handleRunPrediction()}
              disabled={isPredicting}
              className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-[#7B68EE] to-[#9d8df1] hover:from-[#6c58e8] hover:to-[#8c78eb] text-white font-medium text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#7B68EE]/25 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPredicting ? "animate-spin" : ""}`} />
              <span>{isPredicting ? "Computing XGBoost & SHAP..." : "Predict Live for Spot"}</span>
            </button>

            {/* Historical Monsoon Demo shortcut */}
            <button
              onClick={() => handleRunPrediction("2025-07-15T10:30:00Z")}
              disabled={isPredicting}
              className="w-full py-2 px-3 rounded-lg bg-[#1a1a3e] hover:bg-[#252554] border border-[#7B68EE]/40 text-[#b8a9ff] hover:text-white font-mono text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              title="Test with extreme monsoon cloudburst recorded on 15 July 2025"
            >
              <Calendar className="w-3.5 h-3.5 text-[#b8a9ff]" />
              <span>Replay 2025 Monsoon Flood Event (15 Jul)</span>
            </button>
          </div>

          {statusMessage && (
            <div className="p-2 rounded bg-emerald-950/60 border border-emerald-800/60 text-[11px] text-emerald-300 font-mono">
              ✓ {statusMessage}
            </div>
          )}
        </div>
      </div>

      {/* Footer Dispatch Actions */}
      <div className="p-3 border-t border-[#7B68EE]/20 bg-[#12122b]/95 flex items-center gap-2">
        <Link
          href={`/alerts?spot_id=${spot.spot_id}`}
          className="flex-1 py-2 px-3 rounded-lg bg-[#7B68EE]/20 hover:bg-[#7B68EE]/30 border border-[#7B68EE]/40 text-[#b8a9ff] hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Dispatch WhatsApp Alert</span>
        </Link>
        <Link
          href={`/drain-health`}
          className="py-2 px-3 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-mono flex items-center justify-center gap-1 transition-colors"
          title="Inspect Drain Health Trend"
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Drain Δ</span>
        </Link>
      </div>
    </div>
  );
}
