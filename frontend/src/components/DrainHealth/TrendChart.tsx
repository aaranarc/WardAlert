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
import { formatDate } from "@/lib/utils";
import { FailureBadge } from "./FailureBadge";

interface TrendChartProps {
  detail: DrainHealthDetail | null | undefined;
  isLoading: boolean;
}

export function TrendChart({ detail, isLoading }: TrendChartProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-[#ffffff] border border-[#d4dae3] p-6 text-[#5b6478] font-mono text-xs gap-2">
        <div className="w-5 h-5 border-2 border-[#1e40af] border-t-transparent animate-spin" />
        <span>LOADING LONGITUDINAL DRAIN TELEMETRY...</span>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-[#ffffff] border border-[#d4dae3] p-6 text-[#5b6478] font-mono text-xs text-center">
        <p className="font-bold text-[#1a1f2e] uppercase">SELECT A DRAIN SPOT FROM THE LEADERBOARD</p>
        <p className="text-[11px] text-[#5b6478] mt-1 max-w-sm">
          Inspect weekly residual Δ progression, linear degradation fit, and projected failure boundary.
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
    <div className="flex flex-col h-full bg-[#ffffff] border border-[#d4dae3] rounded-sm overflow-hidden">
      {/* Detail Header */}
      <div className="p-3 border-b border-[#d4dae3] bg-[#f8fafc] flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[#1a1f2e] font-sans">{detail.name}</h3>
            <FailureBadge
              status={detail.status}
              predictedFailureDate={detail.predicted_failure_date}
            />
          </div>
          <div className="text-[11px] text-[#5b6478] font-mono mt-0.5">
            Spot #{detail.spot_id} · {detail.weeks_tracked} Weeks Tracked · Critical Δ Limit: {detail.critical_delta.toFixed(3)}
          </div>
        </div>

        <div className="bg-[#ffffff] px-2.5 py-1 border border-[#d4dae3] text-right">
          <div className="text-[9px] text-[#5b6478] font-mono uppercase">DRAIN HEALTH</div>
          <div className="text-sm font-bold font-mono text-[#1e40af]">
            {detail.health_score.toFixed(1)} <span className="text-[10px] text-[#5b6478] font-normal">/ 100</span>
          </div>
        </div>
      </div>

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 border-b border-[#e2e8f0] bg-[#f8fafc] text-xs font-mono">
        <div className="p-2 bg-[#ffffff] border border-[#d4dae3]">
          <div className="text-[10px] text-[#5b6478] uppercase">CURRENT AVG Δ</div>
          <div className="text-sm font-bold text-[#1a1f2e]">
            +{detail.avg_delta.toFixed(4)}
          </div>
        </div>

        <div className="p-2 bg-[#ffffff] border border-[#d4dae3]">
          <div className="text-[10px] text-[#5b6478] uppercase">WEEKLY SLOPE</div>
          <div
            className={`text-sm font-bold ${
              detail.trend_slope && detail.trend_slope > 0 ? "text-[#b45309]" : "text-[#166534]"
            }`}
          >
            {detail.trend_slope !== null
              ? `${detail.trend_slope > 0 ? "+" : ""}${(detail.trend_slope * 100).toFixed(3)}%/wk`
              : "—"}
          </div>
        </div>

        <div className="p-2 bg-[#ffffff] border border-[#d4dae3]">
          <div className="text-[10px] text-[#5b6478] uppercase">CRITICAL LIMIT</div>
          <div className="text-sm font-bold text-[#b91c1c]">
            {detail.critical_delta.toFixed(4)}
          </div>
        </div>

        <div className="p-2 bg-[#ffffff] border border-[#d4dae3]">
          <div className="text-[10px] text-[#5b6478] uppercase">PROJECTED FAILURE</div>
          <div className="text-sm font-bold text-[#b91c1c] truncate" title={failureDateFormatted || "None Projected"}>
            {failureDateFormatted || "NONE"}
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="flex-1 p-3 min-h-[300px] flex flex-col justify-between">
        <div className="flex items-center justify-between text-[11px] font-mono text-[#5b6478] mb-1">
          <span className="font-semibold text-[#1a1f2e] uppercase">
            WEEKLY RESIDUAL Δ TIME SERIES
          </span>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1 text-[#1e40af]">
              <span className="w-2.5 h-0.5 bg-[#1e40af]" />
              Weekly Avg Δ
            </span>
            <span className="flex items-center gap-1 text-[#b45309]">
              <span className="w-2.5 h-0.5 border-t border-dashed border-[#b45309]" />
              Linear Trend
            </span>
            <span className="flex items-center gap-1 text-[#b91c1c]">
              <span className="w-2.5 h-0.5 bg-[#b91c1c]" />
              Critical Boundary
            </span>
          </div>
        </div>

        <div className="flex-1 w-full min-h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 10, right: 20, left: -15, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="2 2" stroke="#e2e8f0" />
              <XAxis
                dataKey="name"
                stroke="#5b6478"
                fontSize={10}
                tickLine={false}
                angle={-30}
                textAnchor="end"
                height={40}
              />
              <YAxis
                stroke="#5b6478"
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
                      <div className="bg-[#ffffff] border border-[#d4dae3] p-2.5 shadow-md text-xs font-mono">
                        <div className="font-bold text-[#1a1f2e] mb-1 pb-1 border-b border-[#e2e8f0]">
                          {data.name} (W{data.week}, {data.year})
                        </div>
                        <div className="space-y-0.5 text-[#1a1f2e]">
                          <p>
                            Avg Δ: <span className="text-[#1e40af] font-bold">+{data.avgDelta}</span>
                          </p>
                          <p>
                            Max Δ: <span className="text-[#5b6478]">+{data.maxDelta}</span>
                          </p>
                          {data.trend !== null && (
                            <p>
                              Linear Fit: <span className="text-[#b45309] font-bold">+{data.trend}</span>
                            </p>
                          )}
                          <p>
                            Health Score: <span className="text-[#166534] font-bold">{data.healthScore?.toFixed(1) || "—"}</span>
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
                stroke="#b91c1c"
                strokeDasharray="3 3"
                strokeWidth={1.5}
                label={{
                  value: `Critical (${criticalDelta.toFixed(3)})`,
                  fill: "#b91c1c",
                  fontSize: 10,
                  position: "insideTopRight",
                }}
              />
              <Area
                type="monotone"
                dataKey="avgDelta"
                fill="#dbeafe"
                stroke="#1e40af"
                strokeWidth={1.5}
                name="Avg Δ"
              />
              <Line
                type="monotone"
                dataKey="trend"
                stroke="#b45309"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                name="Linear Fit"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="p-2 bg-[#f8fafc] border border-[#d4dae3] text-[10px] text-[#5b6478] font-mono mt-1">
          METHODOLOGY NOTE: Residual Δ measures flood probability unexplained by rainfall. Consistent week-over-week upward slope indicates silt buildup. Linear extrapolation forecasts the date Δ crosses critical_delta, enabling proactive desilting before road waterlogging occurs.
        </div>
      </div>
    </div>
  );
}
