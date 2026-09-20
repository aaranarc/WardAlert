"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { SpotRisk, PredictionResponse } from "@/lib/types";
import { RISK_COLORS, RISK_BG_COLORS, RISK_BORDER_COLORS } from "@/lib/constants";
import { formatPercent, formatDateTime } from "@/lib/utils";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { ShapChart } from "./ShapChart";
import { DispatchCard } from "./DispatchCard";
import { usePredict } from "@/hooks/usePredict";
import { CloseIcon, RefreshIcon } from "@/components/Icons";

interface RiskPanelProps {
  spot: SpotRisk | null;
  onClose: () => void;
  onSpotUpdated?: (updatedSpot: SpotRisk) => void;
}

export function RiskPanel({ spot, onClose, onSpotUpdated }: RiskPanelProps) {
  const { predict, isPredicting } = usePredict();
  const [livePrediction, setLivePrediction] = useState<PredictionResponse | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Automatically request live prediction & SHAP when spot is selected
  useEffect(() => {
    if (spot?.spot_id) {
      setLivePrediction(null);
      setStatusMessage(null);
      predict(spot.spot_id).then((result) => {
        if (result) {
          setLivePrediction(result);
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
      });
    }
  }, [spot?.spot_id]);

  if (!spot) return null;

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

  const riskColor = RISK_COLORS[activeRiskLevel] || "#64748b";

  const handleRunPrediction = async (timestamp?: string) => {
    setStatusMessage(null);
    const result = await predict(spot.spot_id, timestamp);
    if (result) {
      setLivePrediction(result);
      setStatusMessage(
        timestamp
          ? `Predicted for monsoon instant: ${timestamp}`
          : "Fresh dual-model prediction completed."
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
    <div className="fixed top-16 right-0 bottom-0 w-full sm:w-[480px] md:w-[720px] lg:w-[760px] bg-[#ffffff] border-l border-[#d4dae3] shadow-lg z-30 flex flex-col justify-between overflow-hidden">
      {/* Header */}
      <div className="p-3.5 border-b border-[#d4dae3] flex items-center justify-between bg-[#f8fafc]">
        <div className="overflow-hidden pr-2">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: riskColor }}
              aria-hidden="true"
            />
            <h2 className="text-sm font-bold text-[#1a1f2e] truncate leading-tight font-sans">
              {spot.name}
            </h2>
          </div>
          <div className="text-[11px] text-[#5b6478] font-mono mt-0.5">
            Spot #{spot.spot_id} · {spot.lat.toFixed(4)}° N, {spot.lng.toFixed(4)}° E
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 border border-[#d4dae3] bg-[#ffffff] hover:bg-[#f1f5f9] text-[#1a1f2e] transition-colors shrink-0"
          aria-label="Close detail pane"
        >
          <CloseIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {/* Risk Level Badge & Timestamp */}
        <div className="flex items-center justify-between">
          <div
            className="px-2.5 py-1 text-xs font-mono font-bold uppercase tracking-wider border rounded-sm"
            style={{
              backgroundColor: RISK_BG_COLORS[activeRiskLevel],
              borderColor: RISK_BORDER_COLORS[activeRiskLevel],
              color: riskColor,
            }}
          >
            {activeRiskLevel} RISK
          </div>

          <div className="text-[11px] text-[#5b6478] font-mono">
            {formatDateTime(activePredictedFor)}
          </div>
        </div>

        {/* Physical Metadata */}
        <div className="grid grid-cols-3 gap-2 p-2.5 bg-[#f8fafc] border border-[#d4dae3] text-xs font-mono">
          <div>
            <div className="text-[10px] uppercase text-[#5b6478]">ELEVATION</div>
            <div className="text-[#1a1f2e] font-bold">
              {spot.elevation_m !== null ? `${spot.elevation_m} m` : "—"}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-[#5b6478]">DEPRESSION</div>
            <div className="text-[#1a1f2e] font-bold">
              {spot.depression_depth_m !== null ? `${spot.depression_depth_m} m` : "—"}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-[#5b6478]">DRAIN DIST</div>
            <div className="text-[#1a1f2e] font-bold">
              {spot.nearest_drain_m !== null ? `${Math.round(spot.nearest_drain_m)} m` : "—"}
            </div>
          </div>
        </div>

        {spot.notes && (
          <div className="p-2.5 bg-[#f8fafc] border border-[#d4dae3] text-xs text-[#1a1f2e] leading-snug">
            <span className="font-semibold text-[#5b6478] uppercase text-[10px] block font-mono">BMC OBSERVER NOTE:</span>
            {spot.notes}
          </div>
        )}

        {/* Probabilities Comparison Cards */}
        <div className="grid grid-cols-3 gap-2">
          {/* P_actual */}
          <div className="p-2.5 bg-[#ffffff] border border-[#d4dae3]">
            <div className="text-[10px] text-[#5b6478] font-mono uppercase">
              P_ACTUAL
            </div>
            <div className="text-lg font-bold font-mono text-[#1a1f2e]">
              {formatPercent(activePActual, 1)}
            </div>
            <div className="text-[9px] text-[#5b6478] font-mono">Model B (Context)</div>
          </div>

          {/* P_rain */}
          <div className="p-2.5 bg-[#ffffff] border border-[#d4dae3]">
            <div className="text-[10px] text-[#5b6478] font-mono uppercase">
              P_RAIN
            </div>
            <div className="text-lg font-bold font-mono text-[#1a1f2e]">
              {formatPercent(activePRain, 1)}
            </div>
            <div className="text-[9px] text-[#5b6478] font-mono">Model A (Rain)</div>
          </div>

          {/* Residual Delta */}
          <div className="p-2.5 bg-[#ffffff] border border-[#d4dae3]">
            <div className="text-[10px] text-[#5b6478] font-mono uppercase">
              Δ RESIDUAL
            </div>
            <div
              className={`text-lg font-bold font-mono ${
                activeDelta && activeDelta > 0.1
                  ? "text-[#b45309]"
                  : activeDelta && activeDelta > 0
                  ? "text-[#1a1f2e]"
                  : "text-[#166534]"
              }`}
            >
              {activeDelta !== null && activeDelta !== undefined
                ? activeDelta > 0
                  ? `+${activeDelta.toFixed(3)}`
                  : activeDelta.toFixed(3)
                : "—"}
            </div>
            <div className="text-[9px] text-[#5b6478] font-mono">Unexplained Risk</div>
          </div>
        </div>

        {/* Confidence Interval Badge */}
        <ConfidenceBadge
          lower={activeConfidenceLower}
          upper={activeConfidenceUpper}
          actual={activePActual}
        />

        {/* Side-by-side SHAP Feature Attribution & Operational Guidance */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ShapChart factors={activeShap} />
          <DispatchCard
            dispatchType={activeDispatchType}
            causeLabel={activeCauseLabel}
          />
        </div>

        {/* Model Simulation Buttons */}
        <div className="p-3 bg-[#f8fafc] border border-[#d4dae3] space-y-2">
          <div className="text-[10px] uppercase font-mono tracking-wider font-semibold text-[#5b6478]">
            MODEL INFERENCE &amp; HISTORICAL REPLAY
          </div>

          <div className="flex flex-col gap-1.5">
            <button
              onClick={() => handleRunPrediction()}
              disabled={isPredicting}
              className="w-full py-1.5 px-3 bg-[#1e40af] hover:bg-[#1d4ed8] text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshIcon className={`w-3.5 h-3.5 ${isPredicting ? "animate-spin" : ""}`} />
              <span>{isPredicting ? "Computing XGBoost inference..." : "Run Live Model for Spot"}</span>
            </button>

            <button
              onClick={() => handleRunPrediction("2025-07-15T10:30:00Z")}
              disabled={isPredicting}
              className="w-full py-1.5 px-3 bg-[#ffffff] hover:bg-[#f1f5f9] border border-[#d4dae3] text-[#1a1f2e] font-mono text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              title="Replay extreme monsoon flood moment on 15 July 2025"
            >
              <span>[SIMULATION] Replay 2025 Monsoon Cloudburst</span>
            </button>
          </div>

          {statusMessage && (
            <div className="p-2 bg-[#f0fdf4] border border-[#bbf7d0] text-[11px] text-[#166534] font-mono">
              {statusMessage}
            </div>
          )}
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="p-3 border-t border-[#d4dae3] bg-[#ffffff] flex items-center gap-2">
        <Link
          href={`/alerts?spot_id=${spot.spot_id}`}
          className="flex-1 py-1.5 px-3 bg-[#1e40af] hover:bg-[#1d4ed8] text-white text-xs font-semibold text-center uppercase tracking-wider font-sans transition-colors"
        >
          Dispatch Alert
        </Link>
        <Link
          href={`/drain-health`}
          className="py-1.5 px-3 border border-[#d4dae3] bg-[#ffffff] hover:bg-[#f1f5f9] text-[#1a1f2e] text-xs font-mono text-center transition-colors"
        >
          Drain Trend
        </Link>
      </div>
    </div>
  );
}
