"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ReferenceLine,
} from "recharts";
import { ShapFactor } from "@/lib/types";

interface ShapChartProps {
  factors: ShapFactor[] | null | undefined;
}

const FEATURE_DISPLAY_NAMES: Record<string, string> = {
  rain_1h: "rain_1h (1h rain)",
  rain_3h: "rain_3h (3h rain)",
  rain_24h: "rain_24h (24h rain)",
  antecedent_moisture: "antecedent_moisture",
  elevation_m: "elevation_m",
  depression_depth_m: "depression_depth_m",
  drain_distance_m: "drain_distance_m",
  monsoon_week: "monsoon_week",
  hour_of_day: "hour_of_day",
  crowd_reports_500m_2h: "crowd_reports_500m_2h",
};

export function ShapChart({ factors }: ShapChartProps) {
  if (!factors || factors.length === 0) {
    return (
      <div className="p-4 bg-[#f8fafc] border border-[#d4dae3] text-xs text-[#5b6478] font-mono text-center flex flex-col items-center justify-center min-h-[160px]">
        <span className="text-xl font-bold text-[#1a1f2e]">—</span>
        <span className="text-[11px] text-[#5b6478] mt-1">No SHAP attribution data</span>
      </div>
    );
  }

  const data = factors.map((f) => {
    const rawContribution = (f as any).contribution ?? f.shap_value ?? 0;
    const shapVal = Number(Number(rawContribution).toFixed(3));
    const isIncreases =
      f.direction === "increases_risk" ||
      (f.direction !== "decreases_risk" && shapVal > 0);

    return {
      featureName: f.feature,
      displayName: FEATURE_DISPLAY_NAMES[f.feature] || f.label || f.feature,
      shapValue: shapVal,
      value: f.value,
      direction: f.direction || (shapVal > 0 ? "increases_risk" : "decreases_risk"),
      isIncreases,
    };
  });

  return (
    <div className="p-3 bg-[#ffffff] border border-[#d4dae3] space-y-2 rounded-sm">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5b6478]">
          TREESHAP FEATURE ATTRIBUTION (TOP 3)
        </span>
        <div className="flex items-center gap-3 text-[10px] font-mono">
          <span className="flex items-center gap-1 text-[#166534]">
            <span className="w-2 h-2 bg-[#166534]" />
            Lowers Risk
          </span>
          <span className="flex items-center gap-1 text-[#b91c1c]">
            <span className="w-2 h-2 bg-[#b91c1c]" />
            Raises Risk
          </span>
        </div>
      </div>

      <div className="h-44 w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
          >
            <XAxis
              type="number"
              stroke="#5b6478"
              fontSize={10}
              tickLine={false}
              tickFormatter={(v) => v.toFixed(1)}
            />
            <YAxis
              type="category"
              dataKey="displayName"
              stroke="#1a1f2e"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={140}
              tick={{ fill: "#1a1f2e" }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  return (
                    <div className="bg-[#ffffff] border border-[#d4dae3] p-2.5 shadow-md text-xs font-mono">
                      <p className="font-bold text-[#1a1f2e] mb-1">{item.featureName}</p>
                      <p className="text-[#5b6478]">
                        Value: <span className="text-[#1a1f2e] font-bold">{item.value ?? "—"}</span>
                      </p>
                      <p className="text-[#5b6478]">
                        Contribution:{" "}
                        <span
                          className={
                            item.isIncreases ? "text-[#b91c1c] font-bold" : "text-[#166534] font-bold"
                          }
                        >
                          {item.shapValue > 0 ? `+${item.shapValue}` : item.shapValue}
                        </span>
                      </p>
                      <p className="text-[10px] text-[#5b6478] mt-1 uppercase">
                        Direction: {item.direction?.replace("_", " ") || "—"}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <ReferenceLine x={0} stroke="#d4dae3" />
            <Bar dataKey="shapValue" radius={0}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.isIncreases ? "#b91c1c" : "#166534"}
                  fillOpacity={0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
