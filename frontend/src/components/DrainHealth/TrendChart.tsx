"use client";

import React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import { DrainHealthDetail } from "@/lib/types";
import { formatDate, formatNumber } from "@/lib/utils";
import { FailureBadge } from "./FailureBadge";
import {
  Activity,
  Calendar,
  AlertTriangle,
  TrendingUp,
  Info,
  Layers,
} from "lucide-react";

interface TrendChartProps {
  detail: DrainHealthDetail | null | undefined;
  isLoading: boolean;
}

export function TrendChart({ detail, isLoading }: TrendChartProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[420px] bg-[#12122b] border border-[#7B68EE]/20 rounded-2xl p-6 text-slate-400 font-mono text-sm gap-3">
        <div className="w-8 h-8 border-2 border-[#7B68EE] border-t-transparent rounded-full animate-spin" />
        <span>Loading Longitudinal Drain Health Series...</span>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[420px] bg-[#12122b] border border-[#7B68EE]/20 rounded-2xl p-6 text-slate-400 font-mono text-sm text-center">
        <Activity className="w-10 h-10 text-[#7B68EE]/40 mb-3" />
        <p className="font-semibold text-slate-300">Select a drain spot from the leaderboard</p>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          Inspect weekly Δ residual trend progression, linear degradation fit, and failure horizon.
        </p>
      </div>
    );
  }

  // Build chart dataset from weekly points
  // Calculate trend line values: y = intercept + slope * t
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
      avgDelta: Number(pt.avg_delta.toFixed(4)),
      maxDelta: Number(pt.max_delta.toFixed(4)),
      trend: trendVal,
      healthScore: pt.health_score,
      predictions: pt.prediction_count,
    };
  });

  const criticalDelta = detail.critical_delta;
  const failureDateFormatted = detail.predicted_failure_date
    ? formatDate(detail.predicted_failure_date)
    : null;

  return (
    <div className="flex flex-col h-full bg-[#12122b] border border-[#7B68EE]/20 rounded-2xl overflow-hidden shadow-xl">
      {/* Detail Header */}
      <div className="p-4 border-b border-[#7B68EE]/20 bg-[#161638] flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white">{detail.name}</h3>
            <FailureBadge
              status={detail.status}
              predictedFailureDate={detail.predicted_failure_date}
            />
          </div>
          <div className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-2">
            <span>Spot #{detail.spot_id}</span>
            <span>•</span>
            <span>{detail.weeks_tracked} Weeks Tracked</span>
            <span>•</span>
            <span>Critical Δ Threshold: {detail.critical_delta.toFixed(3)}</span>
          </div>
        </div>

        {/* Health Score Pill */}
        <div className="flex items-center gap-3 bg-[#0d0d1a] px-3.5 py-1.5 rounded-xl border border-[#7B68EE]/30">
          <div className="text-right">
            <div className="text-[10px] text-slate-400 font-mono uppercase">Drain Health</div>
            <div className="text-base font-bold font-mono text-[#b8a9ff]">
              {detail.health_score.toFixed(1)} <span className="text-xs text-slate-400">/ 100</span>
            </div>
          </div>
        </div>
      </div>

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 border-b border-slate-800/80 bg-[#0e0e22]">
        <div className="p-2.5 rounded-xl bg-[#12122b] border border-slate-800 space-y-1">
          <div className="text-[10px] text-slate-400 font-mono">Current Avg Δ</div>
          <div className="text-sm font-bold font-mono text-white">
            +{detail.avg_delta.toFixed(4)}
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-[#12122b] border border-slate-800 space-y-1">
          <div className="text-[10px] text-slate-400 font-mono">Weekly Slope</div>
          <div
            className={`text-sm font-bold font-mono ${
              detail.trend_slope && detail.trend_slope > 0 ? "text-amber-400" : "text-emerald-400"
            }`}
          >
            {detail.trend_slope !== null
              ? `${detail.trend_slope > 0 ? "+" : ""}${(detail.trend_slope * 100).toFixed(3)}%/wk`
              : "—"}
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-[#12122b] border border-slate-800 space-y-1">
          <div className="text-[10px] text-slate-400 font-mono">Critical Δ Limit</div>
          <div className="text-sm font-bold font-mono text-rose-400">
            {detail.critical_delta.toFixed(4)}
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-[#12122b] border border-slate-800 space-y-1">
          <div className="text-[10px] text-slate-400 font-mono">Predicted Failure</div>
          <div className="text-sm font-bold font-mono text-rose-300 truncate">
            {failureDateFormatted || "None / Safe"}
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="flex-1 p-4 min-h-[320px] flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
          <span className="flex items-center gap-1.5 text-slate-300">
            <TrendingUp className="w-3.5 h-3.5 text-[#b8a9ff]" />
            Longitudinal Weekly Residual Δ Series
          </span>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1 text-[#b8a9ff]">
              <span className="w-2.5 h-0.5 bg-[#b8a9ff]" />
              Weekly Avg Δ
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <span className="w-2.5 h-0.5 border-t border-dashed border-amber-400" />
              Trend Fit
            </span>
            <span className="flex items-center gap-1 text-rose-400">
              <span className="w-2.5 h-0.5 bg-rose-400" />
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
                  <stop offset="5%" stopColor="#7B68EE" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#7B68EE" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" opacity={0.5} />
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
                      <div className="bg-[#12122b] border border-[#7B68EE]/40 p-3 rounded-xl shadow-2xl text-xs font-mono">
                        <div className="font-bold text-white mb-1.5 pb-1 border-b border-slate-700">
                          {data.name} (W{data.week}, {data.year})
                        </div>
                        <div className="space-y-1 text-slate-300">
                          <p>
                            Avg Δ: <span className="text-[#b8a9ff] font-bold">+{data.avgDelta}</span>
                          </p>
                          <p>
                            Max Δ: <span className="text-slate-200">+{data.maxDelta}</span>
                          </p>
                          {data.trend !== null && (
                            <p>
                              Linear Fit: <span className="text-amber-400 font-bold">+{data.trend}</span>
                            </p>
                          )}
                          <p>
                            Health Score: <span className="text-emerald-400 font-bold">{data.healthScore?.toFixed(1) || "—"}</span>
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Predictions sample: {data.predictions}
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {/* Critical threshold line */}
              <ReferenceLine
                y={criticalDelta}
                stroke="#ef4444"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `Critical Δ (${criticalDelta.toFixed(3)})`,
                  fill: "#ef4444",
                  fontSize: 10,
                  position: "insideTopRight",
                }}
              />
              <Area
                type="monotone"
                dataKey="avgDelta"
                fill="url(#deltaGradient)"
                stroke="#b8a9ff"
                strokeWidth={2}
                name="Avg Δ"
              />
              <Line
                type="monotone"
                dataKey="trend"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Trend Fit"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Methodology Note */}
        <div className="p-2.5 rounded-xl bg-[#0e0e22] border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2 mt-2">
          <Info className="w-3.5 h-3.5 text-[#b8a9ff] shrink-0 mt-0.5" />
          <span>
            <strong>Drain Health Methodology:</strong> Δ measures flood risk unexplained by rainfall. When Δ consistently climbs week-over-week, linear extrapolation forecasts the date Δ intersects learned <code>critical_delta</code>, signalling desilting before road flooding occurs.
          </span>
        </div>
      </div>
    </div>
  );
}
