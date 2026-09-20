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

export function ShapChart({ factors }: ShapChartProps) {
  if (!factors || factors.length === 0) {
    return (
      <div className="p-3 bg-[#f8fafc] border border-[#d4dae3] text-xs text-[#5b6478] font-mono text-center">
        No SHAP feature attribution data available for this prediction.
      </div>
    );
  }

  const data = factors.map((f) => ({
    name: f.label || f.feature,
    feature: f.feature,
    shapValue: Number(f.shap_value.toFixed(3)),
    value: f.value,
    direction: f.direction,
    isIncreases:
      f.direction === "increases_risk" ||
      (f.direction !== "decreases_risk" && f.shap_value > 0),
  }));

  return (
    <div className="p-3 bg-[#ffffff] border border-[#d4dae3] space-y-2 rounded-sm">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5b6478]">
          TREESHAP FEATURE ATTRIBUTION (TOP 3 DRIVERS)
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
              dataKey="name"
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
                      <p className="font-bold text-[#1a1f2e] mb-1">{item.name}</p>
                      <p className="text-[#5b6478]">
                        Feature Value: <span className="text-[#1a1f2e] font-bold">{item.value}</span>
                      </p>
                      <p className="text-[#5b6478]">
                        SHAP Contribution:{" "}
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
