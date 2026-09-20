"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { SpotRisk, PredictionResponse } from "@/lib/types";
import { RISK_COLORS } from "@/lib/constants";
import { formatPercent } from "@/lib/utils";
import { usePredict } from "@/hooks/usePredict";
import {
  IconClose,
  IconWarning,
  IconTruck,
  IconRefresh,
  IconAlert,
  IconChevronRight,
  IconClock,
} from "@/components/Common/Icons";

interface RiskPanelProps {
  spot: SpotRisk | null;
  onClose: () => void;
  onSpotUpdated?: (updatedSpot: SpotRisk) => void;
}

export function RiskPanel({ spot, onClose, onSpotUpdated }: RiskPanelProps) {
  const { predict, isPredicting } = usePredict();
  const [livePrediction, setLivePrediction] = useState<PredictionResponse | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastCalculatedTime, setLastCalculatedTime] = useState<string | null>(null);

  useEffect(() => {
    setLivePrediction(null);
    setStatusMessage(null);
    setErrorMessage(null);
  }, [spot?.spot_id, spot?.p_actual, spot?.predicted_for]);

  if (!spot) return null;

  if (spot.p_actual == null && livePrediction?.p_actual == null) {
    console.warn(`[RiskPanel] Spot #${spot.spot_id} (${spot.name}) missing p_actual from backend`);
  }

  const activePActual = livePrediction?.p_actual ?? spot.p_actual;
  const activePRain = livePrediction?.p_rain ?? spot.p_rain;
  const activeDelta = livePrediction?.delta ?? spot.delta;
  const activeRiskLevel = livePrediction?.risk_level ?? spot.risk_level ?? "low";
  const activeCauseLabel = livePrediction?.cause_label ?? spot.cause_label ?? "rainfall_driven";
  const activeDispatchType = livePrediction?.dispatch_type ?? spot.dispatch_type ?? "pump_and_traffic";
  const activeConfidenceLower = livePrediction?.confidence_lower ?? spot.confidence_lower;
  const activeConfidenceUpper = livePrediction?.confidence_upper ?? spot.confidence_upper;
  const activeShap = livePrediction?.shap_top3 ?? spot.shap_top3 ?? [];

  const riskColor = RISK_COLORS[activeRiskLevel] || "#16a34a";
  const riskPercentNum = activePActual != null ? Math.round(activePActual * 100) : null;

  const handleRunPrediction = async (timestamp?: string) => {
    setStatusMessage(null);
    setErrorMessage(null);
    const ts = timestamp || new Date().toISOString();
    try {
      const result = await predict(spot.spot_id, ts);
      if (result) {
        setLivePrediction(result);
        setLastCalculatedTime(
          new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
        );
        setStatusMessage(
          timestamp
            ? `2025 Cloudburst Replay: Risk ${Math.round(result.p_actual * 100)}%`
            : `Live Recalculated: ${Math.round(result.p_actual * 100)}% (Δ ${result.delta >= 0 ? "+" : ""}${Math.round(result.delta * 100)}%)`
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
      } else {
        setErrorMessage("Failed to calculate prediction for this spot.");
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Prediction request failed.");
    }
  };

  // SVG Circular Meter calculations
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    riskPercentNum != null
      ? circumference - (riskPercentNum / 100) * circumference
      : circumference;

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col shadow-xs">
      {/* Panel Top Navigation */}
      <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
        <button
          onClick={onClose}
          className="text-xs text-[#0066cc] font-medium hover:underline flex items-center gap-1"
        >
          <span className="text-xs">←</span>
          <span>Back to Map</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            aria-label="Close details"
          >
            <IconClose className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Header Info */}
      <div className="p-4 border-b border-slate-100 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
            style={{ backgroundColor: `${riskColor}15`, color: riskColor }}
          >
            <IconWarning className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 leading-tight">
              {spot.name}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Ward G/South, Mumbai
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <span
            className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full tracking-wide"
            style={{ backgroundColor: `${riskColor}18`, color: riskColor }}
          >
            {activeRiskLevel}
          </span>
          <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live</span>
          </div>
        </div>
      </div>

      {/* Main Circular Score and Probabilities */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
        {/* Circular Meter */}
        <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="8"
            />
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={riskColor}
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-xl font-bold font-mono text-slate-900 leading-none">
              {riskPercentNum != null ? `${riskPercentNum}%` : "—"}
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5 leading-none">
              Flood Risk
            </span>
          </div>
        </div>

        {/* Probability Breakdown Column */}
        <div className="flex-1 grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
          <div className="text-center">
            <div className="text-[10px] text-slate-500">P_rain</div>
            <div className="text-xs font-bold font-mono text-slate-800 mt-0.5">
              {formatPercent(activePRain)}
            </div>
            <div className="text-[9px] text-slate-400">(Rain + Terrain)</div>
          </div>

          <div className="text-center border-x border-slate-200">
            <div className="text-[10px] text-slate-500">P_actual</div>
            <div className="text-xs font-bold font-mono text-slate-800 mt-0.5">
              {formatPercent(activePActual)}
            </div>
            <div className="text-[9px] text-slate-400">(Full Context)</div>
          </div>

          <div className="text-center">
            <div className="text-[10px] text-slate-500">Δ Signal</div>
            <div
              className={`text-xs font-bold font-mono mt-0.5 ${
                activeDelta != null && activeDelta > 0 ? "text-rose-600" : "text-emerald-600"
              }`}
            >
              {activeDelta != null
                ? (activeDelta > 0 ? `+${(activeDelta * 100).toFixed(0)}%` : `${(activeDelta * 100).toFixed(0)}%`)
                : "—"}
            </div>
            <div className="text-[9px] text-slate-400">(Drainage Gap)</div>
          </div>
        </div>
      </div>

      {/* Cause Classification & Bayesian Confidence */}
      <div className="p-4 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/40">
        <div className="p-2.5 rounded-lg bg-white border border-slate-200">
          <div className="text-[10px] text-slate-500 font-medium">Likely Cause</div>
          <div className="text-xs font-bold text-slate-900 mt-0.5 capitalize">
            {activeCauseLabel === "drainage_failure" ? "Drainage Failure" : "Rainfall Driven"}
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-white border border-slate-200">
          <div className="text-[10px] text-slate-500 font-medium">Confidence Interval</div>
          <div className="text-xs font-bold font-mono text-slate-900 mt-0.5">
            {activeConfidenceLower != null && activeConfidenceUpper != null
              ? `${formatPercent(activeConfidenceLower)} to ${formatPercent(activeConfidenceUpper)}`
              : "—"}
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1.5 overflow-hidden">
            <div
              className="bg-[#0066cc] h-full rounded-full"
              style={{
                width: `${activeConfidenceUpper != null ? Math.min(100, Math.max(10, activeConfidenceUpper * 100)) : 0}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* SHAP Feature Drivers */}
      <div className="p-4 border-b border-slate-100 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-900">
            Top Feature Drivers (SHAP)
          </span>
          <span className="text-[10px] text-slate-400 font-mono">XGBoost Explainer</span>
        </div>

        <div className="space-y-2">
          {activeShap.length > 0 ? (
            activeShap.map((factor, i) => {
              const val = Math.abs(factor.shap_value);
              const barWidth = Math.min(100, Math.round(val * 45));
              const isPositive = factor.direction === "increases_risk";

              return (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-700 font-medium truncate max-w-[180px]">
                      {factor.label}
                    </span>
                    <span className={`font-mono text-[10px] font-semibold ${isPositive ? "text-rose-600" : "text-emerald-600"}`}>
                      {isPositive ? `+${val.toFixed(2)}` : `-${val.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        i === 0 ? "bg-rose-500" : i === 1 ? "bg-amber-500" : "bg-[#0066cc]"
                      }`}
                      style={{ width: `${Math.max(8, barWidth)}%` }}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-xs text-slate-400 py-2 text-center">
              SHAP feature drivers loading...
            </div>
          )}
        </div>
      </div>

      {/* Recommended Dispatch */}
      <div className="p-4 border-b border-slate-100 bg-[#f8fafc]">
        <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <IconTruck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-medium">Recommended Dispatch</div>
              <div className="text-xs font-bold text-slate-900">
                {activeDispatchType === "desilting_crew"
                  ? "Desilting Crew + Traffic Marshals"
                  : "Deploy Dewatering Pumps"}
              </div>
            </div>
          </div>
          <Link
            href="/alerts"
            className="text-xs text-[#0066cc] font-semibold hover:underline flex items-center gap-0.5 shrink-0"
          >
            <span>Alert</span>
            <IconChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Simulation Controls */}
      <div className="p-4 space-y-2.5 bg-slate-50/60 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-700">Model Simulation</span>
          {lastCalculatedTime && (
            <span className="text-[10px] text-slate-400 font-mono">
              calc: {lastCalculatedTime}
            </span>
          )}
        </div>

        {statusMessage && (
          <div className="p-2 rounded-lg bg-[#e8f2fc] border border-[#0066cc]/20 text-[11px] text-[#0066cc] font-medium flex items-center gap-1.5 animate-fadeIn">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0066cc] animate-ping" />
            <span className="truncate">{statusMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-[11px] text-rose-700 font-medium">
            {errorMessage}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => handleRunPrediction("2025-07-15T10:30:00Z")}
            disabled={isPredicting}
            className="flex-1 py-1.5 px-2.5 rounded-lg bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-medium transition-colors disabled:opacity-50 text-center shadow-2xs flex items-center justify-center gap-1"
            title="Simulate 75mm/h cloudburst and 4.2m high tide for this spot"
          >
            {isPredicting ? <IconRefresh className="w-3 h-3 animate-spin" /> : null}
            <span>Replay 2025 Cloudburst</span>
          </button>
          <button
            onClick={() => handleRunPrediction()}
            disabled={isPredicting}
            className="py-1.5 px-3 rounded-lg bg-[#0066cc] hover:bg-[#0055b3] text-white text-[11px] font-medium transition-colors disabled:opacity-50 flex items-center gap-1 shadow-2xs"
            title="Recalculate dual models with live telemetry"
          >
            <IconRefresh className={`w-3 h-3 ${isPredicting ? "animate-spin" : ""}`} />
            <span>{isPredicting ? "Computing..." : "Recalculate"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
