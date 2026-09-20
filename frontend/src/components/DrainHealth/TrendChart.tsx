"use client";

import React from "react";
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { DrainHealthDetail } from "@/lib/types";
import { FailureBadge } from "./FailureBadge";
import { formatDate } from "@/lib/utils";

interface TrendChartProps {
  detail: DrainHealthDetail | null;
  isLoading: boolean;
}

export function TrendChart({ detail, isLoading }: TrendChartProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[420px] bg-white border border-slate-200 rounded-xl p-6 text-slate-400 font-sans text-xs gap-2.5 shadow-xs">
        <div className="w-6 h-6 border-2 border-[#0066cc] border-t-transparent rounded-full animate-spin" />
        <span>Loading Longitudinal Drain Health Series...</span>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[420px] bg-white border border-slate-200 rounded-xl p-6 text-slate-400 font-sans text-xs text-center shadow-xs">
        <p className="font-semibold text-slate-700 text-sm">Select a drain spot from the leaderboard</p>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          Inspect weekly Δ residual trend progression, linear degradation fit, and failure horizon.
        </p>
      </div>
    );
  }

  const chartData = (detail.weekly || []).map((pt, idx) => {
    const t = idx;
    let trendVal = null;
    if (detail.trend_slope !== null && detail.trend_intercept !== null) {
      trendVal = Number((detail.trend_intercept + detail.trend_slope * t).toFixed(4));
    }

    const label = pt.week_start ? formatDate(pt.week_start) : `W${pt.week_number}`;

    return {
      name: label,
      week: pt.week_number,
      year: pt.year,
      avgDelta: Number((pt.avg_delta ?? 0).toFixed(4)),
      maxDelta: Number((pt.max_delta ?? 0).toFixed(4)),
      trend: trendVal,
      healthScore: pt.health_score,
      predictions: pt.prediction_count,
    };
  });

  const criticalDelta = detail.critical_delta ?? 0.5135;
  const failureDateFormatted = detail.predicted_failure_date
    ? formatDate(detail.predicted_failure_date)
    : null;

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      {/* Detail Header */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">{detail.name}</h3>
            <FailureBadge
              status={detail.status}
              predictedFailureDate={detail.predicted_failure_date}
            />
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-2">
            <span>Spot #{detail.spot_id}</span>
            <span>•</span>
            <span>{detail.weeks_tracked} Weeks Tracked</span>
            <span>•</span>
            <span>Critical Δ Threshold: {criticalDelta.toFixed(3)}</span>
          </div>
        </div>

        {/* Health Score Pill */}
        <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
          <div className="text-right">
            <div className="text-[9px] text-slate-400 uppercase font-semibold">Drain Health</div>
            <div className="text-sm font-bold font-mono text-[#0066cc]">
              {(detail.health_score ?? 0).toFixed(1)} <span className="text-[10px] text-slate-400">/ 100</span>
            </div>
          </div>
        </div>
      </div>

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 border-b border-slate-100 bg-white">
        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-0.5">
          <div className="text-[10px] text-slate-500 font-medium">Current Avg Δ</div>
          <div className="text-xs font-bold font-mono text-slate-900">
            +{(detail.avg_delta ?? 0).toFixed(4)}
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-0.5">
          <div className="text-[10px] text-slate-500 font-medium">Weekly Slope</div>
          <div
            className={`text-xs font-bold font-mono ${
              detail.trend_slope && detail.trend_slope > 0 ? "text-amber-600" : "text-emerald-600"
            }`}
          >
            {detail.trend_slope !== null
              ? `${detail.trend_slope > 0 ? "+" : ""}${(detail.trend_slope * 100).toFixed(3)}%/wk`
              : "Stable"}
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-0.5">
          <div className="text-[10px] text-slate-500 font-medium">Critical Δ Limit</div>
          <div className="text-xs font-bold font-mono text-rose-600">
            {criticalDelta.toFixed(4)}
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-0.5">
          <div className="text-[10px] text-slate-500 font-medium">Predicted Failure</div>
          <div className="text-xs font-bold font-mono text-slate-800 truncate">
            {failureDateFormatted || "Safe"}
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="flex-1 p-4 min-h-[320px] flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs font-sans text-slate-500 mb-2">
          <span className="font-semibold text-slate-800">
            Longitudinal Weekly Residual Δ Series
          </span>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1 text-[#0066cc]">
              <span className="w-2.5 h-0.5 bg-[#0066cc]" />
              Weekly Avg Δ
            </span>
            <span className="flex items-center gap-1 text-amber-600">
              <span className="w-2.5 h-0.5 border-t border-dashed border-amber-600" />
              Trend Fit
            </span>
            <span className="flex items-center gap-1 text-rose-600">
              <span className="w-2.5 h-0.5 bg-rose-600" />
              Critical Threshold
            </span>
          </div>
        </div>

        <div className="flex-1 w-full min-h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 10, right: 20, left: -10, bottom: 20 }}
            >
              <defs>
                <linearGradient id="deltaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0066cc" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#0066cc" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
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
                domain={[0, "auto"]}
                tickFormatter={(v) => v.toFixed(2)}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-md text-xs font-mono">
                        <div className="font-bold text-slate-900 mb-1.5 pb-1 border-b border-slate-100">
                          {data.name} (W{data.week}, {data.year})
                        </div>
                        <div className="space-y-1 text-slate-600">
                          <p>
                            Avg Δ: <span className="text-[#0066cc] font-bold">+{data.avgDelta}</span>
                          </p>
                          <p>
                            Max Δ: <span className="text-slate-800">+{data.maxDelta}</span>
                          </p>
                          {data.trend !== null && (
                            <p>
                              Linear Fit: <span className="text-amber-600 font-bold">+{data.trend}</span>
                            </p>
                          )}
                          <p>
                            Health Score: <span className="text-emerald-600 font-bold">{data.healthScore?.toFixed(1) || "N/A"}</span>
                          </p>
                        </div>
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
                  value: `Critical Δ (${criticalDelta.toFixed(3)})`,
                  fill: "#e11d48",
                  fontSize: 10,
                  position: "insideTopRight",
                }}
              />
              <Area
                type="monotone"
                dataKey="avgDelta"
                stroke="#0066cc"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#deltaGradient)"
                name="Weekly Avg Δ"
              />
              <Line
                type="monotone"
                dataKey="trend"
                stroke="#d97706"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                dot={false}
                name="Trend Fit"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
