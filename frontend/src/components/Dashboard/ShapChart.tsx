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
import { Layers } from "lucide-react";

interface ShapChartProps {
  factors: ShapFactor[] | null | undefined;
}

export function ShapChart({ factors }: ShapChartProps) {
  if (!factors || factors.length === 0) {
    return (
      <div className="p-3 rounded-xl bg-[#0e0e24] border border-[#7B68EE]/20 text-xs text-slate-400 font-mono text-center">
        No SHAP attribution data available
      </div>
    );
  }

  // Format data for Recharts horizontal bar chart
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
    <div className="p-3.5 rounded-xl bg-[#0e0e24] border border-[#7B68EE]/25 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-slate-200 font-medium">
          <Layers className="w-3.5 h-3.5 text-[#b8a9ff]" />
          <span>SHAP Feature Attribution (Top 3 Drivers)</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono">
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-2 h-2 rounded-sm bg-emerald-400" />
            Lowers Risk
          </span>
          <span className="flex items-center gap-1 text-rose-400">
            <span className="w-2 h-2 rounded-sm bg-rose-400" />
            Raises Risk
          </span>
        </div>
      </div>

      <div className="h-44 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
          >
            <XAxis
              type="number"
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              tickFormatter={(v) => v.toFixed(1)}
            />
            <YAxis
              type="category"
              dataKey="name"
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={130}
              tick={{ fill: "#cbd5e1" }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  return (
                    <div className="bg-[#12122b] border border-[#7B68EE]/40 p-2.5 rounded-lg shadow-xl text-xs font-mono">
                      <p className="font-bold text-white mb-1">{item.name}</p>
                      <p className="text-slate-300">
                        Feature Value: <span className="text-white font-bold">{item.value}</span>
                      </p>
                      <p className="text-slate-300">
                        SHAP Contribution:{" "}
                        <span
                          className={
                            item.isIncreases ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"
                          }
                        >
                          {item.shapValue > 0 ? `+${item.shapValue}` : item.shapValue}
                        </span>
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1 capitalize">
                        Direction: {item.direction?.replace("_", " ") || "—"}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <ReferenceLine x={0} stroke="#475569" strokeDasharray="3 3" />
            <Bar dataKey="shapValue" radius={[4, 4, 4, 4]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.isIncreases ? "#f43f5e" : "#10b981"}
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
