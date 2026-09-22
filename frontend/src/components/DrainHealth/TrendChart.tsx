"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ComposedChart,
  LineChart,
  BarChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { DrainHealthDetail, DesiltResponse } from "@/lib/types";
import { FailureBadge } from "./FailureBadge";
import { formatDate } from "@/lib/utils";
import { api } from "@/lib/api";
import { IconCheck, IconTruck, IconWarning } from "@/components/Common/Icons";

interface TrendChartProps {
  detail: DrainHealthDetail | null;
  isLoading: boolean;
  onDesilted?: () => void;
}

export function TrendChart({ detail, isLoading, onDesilted }: TrendChartProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [viewMode, setViewMode] = useState<"delta" | "health" | "spread">("delta");
  const [isDesilting, setIsDesilting] = useState(false);
  const [actionNotice, setActionNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [desiltResult, setDesiltResult] = useState<DesiltResponse | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setActionNotice(null);
    setDesiltResult(null);
  }, [detail?.spot_id]);

  const handleDesilt = async () => {
    if (!detail) return;
    setIsDesilting(true);
    setActionNotice(null);
    try {
      const res = await api.desiltDrain(detail.spot_id);
      setDesiltResult(res);
      setActionNotice({
        type: "success",
        text:
          res.message ||
          `Desilting logged for ${res.spot_name || detail.name}. Projected drain health: ${res.projected_health.toFixed(1)}/100. Historical residuals preserved.`,
      });
      if (onDesilted) {
        onDesilted();
      }
    } catch (err: any) {
      setActionNotice({
        type: "error",
        text: err?.message || "Failed to record desilting service. Please check network.",
      });
    } finally {
      setIsDesilting(false);
    }
  };

  const handleExportCSV = () => {
    if (!detail || !detail.weekly) return;
    const headers = "Spot_ID,Spot_Name,Week_Number,Year,Week_Start,Avg_Delta,Max_Delta,Health_Score\n";
    const rows = detail.weekly
      .map(
        (w) =>
          `${detail.spot_id},"${detail.name}",${w.week_number},${w.year},${w.week_start || ""},${w.avg_delta},${w.max_delta},${w.health_score}`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `drain_health_spot_${detail.spot_id}_telemetry.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const latestDesiltEvent = detail?.desilt_events && detail.desilt_events.length > 0
    ? detail.desilt_events[detail.desilt_events.length - 1]
    : null;

  const hasDesilted = Boolean(desiltResult || latestDesiltEvent);
  const projectedResidual = desiltResult?.projected_residual ?? latestDesiltEvent?.projected_residual ?? 0.0200;
  const projectedHealth =
    desiltResult?.projected_health ??
    (latestDesiltEvent
      ? Number((100 * (1 - latestDesiltEvent.projected_residual / 0.300)).toFixed(1))
      : 93.3);
  const projectedSlope = desiltResult?.projected_slope ?? -0.0050;
  const predictedFailure = desiltResult?.predicted_failure || (hasDesilted ? "Monsoon Ready" : null);

  const allDesiltLabels = useMemo(() => {
    const labels: string[] = [];
    if (detail?.desilt_events) {
      for (const ev of detail.desilt_events) {
        const l = formatDate(ev.desilted_at);
        if (!labels.includes(l)) labels.push(l);
      }
    }
    if (desiltResult?.desilted_at) {
      const l = formatDate(desiltResult.desilted_at);
      if (!labels.includes(l)) labels.push(l);
    }
    return labels;
  }, [detail?.desilt_events, desiltResult]);

  const chartData = useMemo(() => {
    if (!detail) return [];
    const list = detail.weekly || (detail as any).weekly_history || [];
    if (!Array.isArray(list) || list.length === 0) return [];

    const historical = list.map((pt: any, idx: number) => {
      const t = idx;
      let trendVal = null;
      const slope = detail.trend_slope ?? (detail as any).regression_slope ?? null;
      const intercept = detail.trend_intercept ?? 0.02;
      if (slope !== null && intercept !== null) {
        trendVal = Number((intercept + slope * t).toFixed(4));
        if (trendVal < 0) trendVal = 0;
      }

      const weekNum = pt.week_number ?? (list.length - idx);
      const label = pt.week_start ? formatDate(pt.week_start) : `W${weekNum}`;

      return {
        name: label,
        week: weekNum,
        year: pt.year ?? 2025,
        avgDelta: Number((pt.avg_delta ?? pt.actual_delta ?? 0).toFixed(4)),
        maxDelta: Number((pt.max_delta ?? (pt.avg_delta ?? pt.actual_delta ?? 0) * 1.35).toFixed(4)),
        trend: trendVal !== null ? Math.max(0, trendVal) : pt.trend_delta ?? null,
        healthScore: Number((pt.health_score ?? detail.health_score ?? 85).toFixed(1)),
        predictions: pt.prediction_count ?? 14,
        note: pt.note,
        recoveryResidual: null as number | null,
        recoveryHealth: null as number | null,
        isProjection: false,
        isDesiltMarker: false,
      };
    });

    if (!hasDesilted) {
      return historical;
    }

    const desiltDateStr = desiltResult?.desilted_at || latestDesiltEvent?.desilted_at || new Date().toISOString();
    const desiltMarkerLabel = formatDate(desiltDateStr);

    const anchorPoint = {
      name: desiltMarkerLabel,
      week: "Desilt",
      year: new Date(desiltDateStr).getFullYear(),
      avgDelta: null,
      maxDelta: null,
      trend: null,
      healthScore: null,
      recoveryResidual: 0.0200,
      recoveryHealth: 93.3,
      predictions: 0,
      note: "Desilted (Capacity Reset)",
      isProjection: true,
      isDesiltMarker: true,
    };

    const projectionPoints =
      detail.forward_projection && detail.forward_projection.length > 0
        ? detail.forward_projection.map((fp) => ({
            name: formatDate(fp.date_str),
            week: `+${fp.week_offset}w`,
            year: new Date(fp.date_str).getFullYear(),
            avgDelta: null,
            maxDelta: null,
            trend: null,
            healthScore: null,
            recoveryResidual: fp.projected_residual,
            recoveryHealth: fp.projected_health,
            predictions: 0,
            note: `W+${fp.week_offset} Recovery`,
            isProjection: true,
            isDesiltMarker: false,
          }))
        : [0.020, 0.022, 0.025, 0.030, 0.045, 0.065, 0.090, 0.120].map((res, i) => {
            const offset = i + 1;
            const dt = new Date(Date.now() + offset * 7 * 24 * 3600 * 1000);
            return {
              name: formatDate(dt.toISOString()),
              week: `+${offset}w`,
              year: dt.getFullYear(),
              avgDelta: null,
              maxDelta: null,
              trend: null,
              healthScore: null,
              recoveryResidual: res,
              recoveryHealth: Number((100 * (1 - res / 0.300)).toFixed(1)),
              predictions: 0,
              note: `W+${offset} Recovery`,
              isProjection: true,
              isDesiltMarker: false,
            };
          });

    return [...historical, anchorPoint, ...projectionPoints];
  }, [detail, hasDesilted, desiltResult, latestDesiltEvent]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[460px] bg-white border border-slate-200 rounded-xl p-6 text-slate-400 font-sans text-xs gap-2.5 shadow-xs">
        <div className="w-6 h-6 border-2 border-[#0066cc] border-t-transparent rounded-full animate-spin" />
        <span>Loading Longitudinal Drain Health Series...</span>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[460px] bg-white border border-slate-200 rounded-xl p-6 text-slate-400 font-sans text-xs text-center shadow-xs">
        <p className="font-semibold text-slate-700 text-sm">Select a drain spot from the leaderboard</p>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          Inspect weekly residual trend progression, linear degradation fit, and failure horizon.
        </p>
      </div>
    );
  }

  const criticalDelta = detail.critical_delta ?? 0.3000;
  const failureDateFormatted = detail.predicted_failure_date
    ? formatDate(detail.predicted_failure_date)
    : null;

  return (
    <div className="flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      {/* Detail Header */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">{detail.name}</h3>
            <FailureBadge
              status={hasDesilted ? "improving" : detail.status}
              predictedFailureDate={hasDesilted ? null : detail.predicted_failure_date}
            />
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-2">
            <span>Spot #{detail.spot_id}</span>
            <span>•</span>
            <span>{detail.weeks_tracked} Weeks Tracked</span>
            <span>•</span>
            <span>Critical Threshold: {criticalDelta.toFixed(3)}</span>
          </div>
        </div>

        {/* Health Score Pill & Actions */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
            <div className="text-right">
              <div className="text-[9px] text-slate-400 uppercase font-semibold">Drain Health</div>
              <div className="text-sm font-bold font-mono text-[#0066cc]">
                {(hasDesilted ? projectedHealth : (detail.health_score ?? 0)).toFixed(1)}{" "}
                <span className="text-[10px] text-slate-400">/ 100</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleDesilt}
            disabled={isDesilting}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-2xs"
            title="Log emergency desilting crew service to restore hydraulic capacity"
          >
            <IconTruck className={`w-3.5 h-3.5 ${isDesilting ? "animate-spin" : ""}`} />
            <span>{isDesilting ? "Logging..." : "Log Desilting"}</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-2 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-xs font-medium transition-colors shadow-2xs"
            title="Download longitudinal telemetry CSV"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionNotice && (
        <div
          className={`px-4 py-2.5 border-b text-xs font-medium flex items-center justify-between ${
            actionNotice.type === "success"
              ? "bg-emerald-50 border-emerald-100 text-emerald-800"
              : "bg-rose-50 border-rose-100 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-1.5">
            {actionNotice.type === "success" ? (
              <IconCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            ) : (
              <IconWarning className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            )}
            <span>{actionNotice.text}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className={`text-sm ml-2 ${
              actionNotice.type === "success"
                ? "text-emerald-500 hover:text-emerald-800"
                : "text-rose-500 hover:text-rose-800"
            }`}
          >
            ✕
          </button>
        </div>
      )}

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 border-b border-slate-100 bg-white">
        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-0.5">
          <div className="text-[10px] text-slate-500 font-medium">Current Avg Residual</div>
          <div className="text-xs font-bold font-mono text-slate-900">
            {hasDesilted ? `+${projectedResidual.toFixed(4)}` : `+${(detail.avg_delta ?? 0).toFixed(4)}`}
          </div>
          {hasDesilted && (
            <div className="text-[9px] text-sky-600 font-medium leading-tight">
              (post-desilt projection)
            </div>
          )}
        </div>

        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-0.5">
          <div className="text-[10px] text-slate-500 font-medium">Weekly Slope</div>
          <div
            className={`text-xs font-bold font-mono ${
              hasDesilted
                ? "text-emerald-600"
                : detail.trend_slope && detail.trend_slope > 0
                ? "text-amber-600"
                : "text-emerald-600"
            }`}
          >
            {hasDesilted
              ? `${projectedSlope > 0 ? "+" : ""}${projectedSlope.toFixed(4)}/wk`
              : detail.trend_slope !== null
              ? `${detail.trend_slope > 0 ? "+" : ""}${(detail.trend_slope * 100).toFixed(3)}%/wk`
              : "Stable"}
          </div>
          {hasDesilted && (
            <div className="text-[9px] text-emerald-600 font-medium leading-tight">
              (recovery projection)
            </div>
          )}
        </div>

        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-0.5">
          <div className="text-[10px] text-slate-500 font-medium">Critical Limit</div>
          <div className="text-xs font-bold font-mono text-rose-600">
            {criticalDelta.toFixed(4)}
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-0.5">
          <div className="text-[10px] text-slate-500 font-medium">Predicted Failure</div>
          <div className="text-xs font-bold font-mono text-slate-800 truncate">
            {hasDesilted ? (predictedFailure || "Monsoon Ready") : (failureDateFormatted || "Monsoon Ready (Safe)")}
          </div>
          {hasDesilted && (
            <div className="text-[9px] text-emerald-600 font-medium leading-tight">
              (hydraulic reset)
            </div>
          )}
        </div>
      </div>

      {/* Chart Canvas Header & Mode Switcher */}
      <div className="p-4 flex flex-col justify-between space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <span className="font-bold text-slate-900 block">
              {viewMode === "delta"
                ? "Longitudinal Weekly Residual Series"
                : viewMode === "health"
                ? "Hydraulic Health Score Decay Curve"
                : "Weekly Residual Variance (Average vs Peak)"}
            </span>
            <span className="text-[10px] text-slate-400">
              53-week monsoon baseline • Observation points recorded weekly
            </span>
          </div>

          {/* View Mode Switcher Pills */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px]">
            <button
              onClick={() => setViewMode("delta")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                viewMode === "delta"
                  ? "bg-white text-[#0066cc] shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Residual Signal
            </button>
            <button
              onClick={() => setViewMode("health")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                viewMode === "health"
                  ? "bg-white text-[#0066cc] shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Health Score
            </button>
            <button
              onClick={() => setViewMode("spread")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                viewMode === "spread"
                  ? "bg-white text-[#0066cc] shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Peak Variance
            </button>
          </div>
        </div>

        {/* Legend Indicators */}
        <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-1">
          {viewMode === "delta" && (
            <>
              <span className="flex items-center gap-1 text-[#0066cc]">
                <span className="w-2.5 h-0.5 bg-[#0066cc]" />
                Weekly Avg Residual
              </span>
              <span className="flex items-center gap-1 text-amber-600">
                <span className="w-2.5 h-0.5 border-t border-dashed border-amber-600" />
                Linear Fit
              </span>
              <span className="flex items-center gap-1 text-rose-600">
                <span className="w-2.5 h-0.5 bg-rose-600" />
                Critical Threshold ({criticalDelta.toFixed(3)})
              </span>
              {hasDesilted && (
                <span className="flex items-center gap-1 text-sky-600 font-medium">
                  <span className="w-2.5 h-0.5 border-t-2 border-dashed border-sky-500" />
                  Recovery Projection (8 wks)
                </span>
              )}
            </>
          )}
          {viewMode === "health" && (
            <>
              <span className="flex items-center gap-1 text-emerald-600">
                <span className="w-2.5 h-0.5 bg-emerald-600" />
                Health Score (0 to 100)
              </span>
              <span className="flex items-center gap-1 text-amber-600">
                <span className="w-2.5 h-0.5 border-t border-dashed border-amber-500" />
                Degradation Warning (70)
              </span>
              <span className="flex items-center gap-1 text-rose-600">
                <span className="w-2.5 h-0.5 border-t border-dashed border-rose-500" />
                Overdue Critical (55)
              </span>
              {hasDesilted && (
                <span className="flex items-center gap-1 text-emerald-600 font-medium">
                  <span className="w-2.5 h-0.5 border-t-2 border-dashed border-emerald-500" />
                  Recovery Projection
                </span>
              )}
            </>
          )}
          {viewMode === "spread" && (
            <>
              <span className="flex items-center gap-1 text-[#0066cc]">
                <span className="w-2.5 h-2 rounded-2xs bg-[#0066cc]" />
                Weekly Average Residual
              </span>
              <span className="flex items-center gap-1 text-indigo-400">
                <span className="w-2.5 h-2 rounded-2xs bg-indigo-300" />
                Peak Rain Residual
              </span>
            </>
          )}
        </div>

        {/* Chart Canvas with explicit pixel height */}
        <div className="w-full h-[330px] pt-1">
          {isMounted && chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              {viewMode === "delta" ? (
                <ComposedChart
                  data={chartData}
                  margin={{ top: 10, right: 20, left: -10, bottom: 20 }}
                >
                  <defs>
                    <linearGradient id="deltaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0066cc" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#0066cc" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    fontSize={10}
                    tickLine={false}
                    angle={-30}
                    textAnchor="end"
                    height={40}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={10}
                    tickLine={false}
                    domain={[0, (dataMax: number) => Math.max(0.65, Number(((dataMax || 0) + 0.05).toFixed(2)))]}
                    tickFormatter={(v) => Number(v).toFixed(2)}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white/95 backdrop-blur-sm border border-slate-200 p-3 rounded-xl shadow-md text-xs font-mono">
                            <div className="font-bold text-slate-900 mb-1.5 pb-1 border-b border-slate-100 flex items-center justify-between gap-3">
                              <span>{data.name} {data.week ? `(${data.week})` : ""}</span>
                              {data.note && (
                                <span
                                  className={`text-[9px] px-1.5 py-0.5 rounded font-sans ${
                                    data.isProjection
                                      ? "bg-sky-100 text-sky-800"
                                      : "bg-emerald-100 text-emerald-800"
                                  }`}
                                >
                                  {data.note}
                                </span>
                              )}
                            </div>
                            {data.isProjection ? (
                              <div className="space-y-1 text-slate-600">
                                <p>
                                  Projected Residual:{" "}
                                  <span className="text-sky-600 font-bold">
                                    +{Number(data.recoveryResidual || 0).toFixed(4)}
                                  </span>
                                </p>
                                <p>
                                  Projected Health:{" "}
                                  <span className="text-emerald-600 font-bold">
                                    {Number(data.recoveryHealth || 0).toFixed(1)} / 100
                                  </span>
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-1 text-slate-600">
                                <p>
                                  Avg Residual: <span className="text-[#0066cc] font-bold">+{data.avgDelta}</span>
                                </p>
                                <p>
                                  Peak Residual: <span className="text-slate-800">+{data.maxDelta}</span>
                                </p>
                                {data.trend !== null && (
                                  <p>
                                    Linear Trend: <span className="text-amber-600 font-bold">+{data.trend}</span>
                                  </p>
                                )}
                                <p>
                                  Health Score:{" "}
                                  <span className="text-emerald-600 font-bold">
                                    {data.healthScore?.toFixed(1) || "N/A"}
                                  </span>
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine
                    y={criticalDelta}
                    stroke="#e11d48"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: `Critical Limit (${criticalDelta.toFixed(3)})`,
                      fill: "#e11d48",
                      fontSize: 10,
                      position: "insideTopRight",
                    }}
                  />
                  {allDesiltLabels.map((lbl, idx) => (
                    <ReferenceLine
                      key={`desilt-ref-delta-${idx}`}
                      x={lbl}
                      stroke="#64748b"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                      label={{
                        value: "Desilted",
                        fill: "#475569",
                        fontSize: 10,
                        position: "top",
                      }}
                    />
                  ))}
                  <Area
                    type="monotone"
                    dataKey="avgDelta"
                    stroke="#0066cc"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#deltaGradient)"
                    name="Weekly Avg Residual"
                  />
                  <Line
                    type="monotone"
                    dataKey="trend"
                    stroke="#d97706"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    dot={false}
                    name="Linear Fit"
                  />
                  {hasDesilted && (
                    <Line
                      type="monotone"
                      dataKey="recoveryResidual"
                      stroke="#0284c7"
                      strokeDasharray="4 4"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#0284c7" }}
                      activeDot={{ r: 5, fill: "#0284c7" }}
                      name="Recovery Projection"
                      connectNulls={false}
                    />
                  )}
                </ComposedChart>
              ) : viewMode === "health" ? (
                <LineChart
                  data={chartData}
                  margin={{ top: 10, right: 20, left: -10, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    fontSize={10}
                    tickLine={false}
                    angle={-30}
                    textAnchor="end"
                    height={40}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={10}
                    tickLine={false}
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white/95 backdrop-blur-sm border border-slate-200 p-3 rounded-xl shadow-md text-xs font-mono">
                            <div className="font-bold text-slate-900 mb-1 pb-1 border-b border-slate-100 flex items-center justify-between gap-3">
                              <span>{data.name} {data.week ? `(${data.week})` : ""}</span>
                              {data.note && (
                                <span
                                  className={`text-[9px] px-1.5 py-0.5 rounded font-sans ${
                                    data.isProjection
                                      ? "bg-sky-100 text-sky-800"
                                      : "bg-emerald-100 text-emerald-800"
                                  }`}
                                >
                                  {data.note}
                                </span>
                              )}
                            </div>
                            {data.isProjection ? (
                              <div className="space-y-1 text-slate-600">
                                <p className="text-emerald-700 font-bold text-sm">
                                  Projected Health: {Number(data.recoveryHealth || 0).toFixed(1)} / 100
                                </p>
                                <p className="text-[10px] text-slate-500 mt-1">
                                  Status: Forward Recovery Projection
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-1 text-slate-600">
                                <p className="text-emerald-700 font-bold text-sm">
                                  Health Score: {data.healthScore?.toFixed(1)} / 100
                                </p>
                                <p className="text-[10px] text-slate-500 mt-1">
                                  Status:{" "}
                                  {data.healthScore >= 70
                                    ? "Stable"
                                    : data.healthScore >= 55
                                    ? "Degrading"
                                    : "Overdue"}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine
                    y={70}
                    stroke="#f59e0b"
                    strokeDasharray="3 3"
                    label={{ value: "Degrading (70)", fill: "#f59e0b", fontSize: 10, position: "insideTopLeft" }}
                  />
                  <ReferenceLine
                    y={55}
                    stroke="#e11d48"
                    strokeDasharray="3 3"
                    label={{ value: "Overdue (55)", fill: "#e11d48", fontSize: 10, position: "insideBottomLeft" }}
                  />
                  {allDesiltLabels.map((lbl, idx) => (
                    <ReferenceLine
                      key={`desilt-ref-health-${idx}`}
                      x={lbl}
                      stroke="#64748b"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                      label={{
                        value: "Desilted",
                        fill: "#475569",
                        fontSize: 10,
                        position: "top",
                      }}
                    />
                  ))}
                  <Line
                    type="monotone"
                    dataKey="healthScore"
                    stroke="#059669"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#059669" }}
                    activeDot={{ r: 5 }}
                    name="Health Score"
                  />
                  {hasDesilted && (
                    <Line
                      type="monotone"
                      dataKey="recoveryHealth"
                      stroke="#10b981"
                      strokeDasharray="4 4"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#10b981" }}
                      activeDot={{ r: 5, fill: "#10b981" }}
                      name="Recovery Projection"
                      connectNulls={false}
                    />
                  )}
                </LineChart>
              ) : (
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 20, left: -10, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    fontSize={10}
                    tickLine={false}
                    angle={-30}
                    textAnchor="end"
                    height={40}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={10}
                    tickLine={false}
                    tickFormatter={(v) => Number(v).toFixed(2)}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        if (data.isProjection) return null;
                        return (
                          <div className="bg-white/95 backdrop-blur-sm border border-slate-200 p-3 rounded-xl shadow-md text-xs font-mono">
                            <div className="font-bold text-slate-900 mb-1 pb-1 border-b border-slate-100">
                              {data.name} (W{data.week})
                            </div>
                            <p className="text-[#0066cc] font-bold">Avg Residual: +{data.avgDelta}</p>
                            <p className="text-indigo-600 font-bold">Peak Residual: +{data.maxDelta}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {allDesiltLabels.map((lbl, idx) => (
                    <ReferenceLine
                      key={`desilt-ref-bar-${idx}`}
                      x={lbl}
                      stroke="#64748b"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                      label={{
                        value: "Desilted",
                        fill: "#475569",
                        fontSize: 10,
                        position: "top",
                      }}
                    />
                  ))}
                  <Bar dataKey="avgDelta" fill="#0066cc" name="Average Residual" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="maxDelta" fill="#818cf8" name="Peak Residual" radius={[3, 3, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50/50 rounded-xl text-xs text-slate-400">
              <div className="w-5 h-5 border-2 border-[#0066cc] border-t-transparent rounded-full animate-spin mb-2" />
              <span>Rendering series canvas...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
