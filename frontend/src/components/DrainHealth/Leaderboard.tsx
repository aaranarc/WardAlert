"use client";

import React, { useState, useMemo } from "react";
import { DrainHealthEntry } from "@/lib/types";
import { FailureBadge } from "./FailureBadge";
import { formatDate, formatNumber } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  ArrowUpDown,
  Calendar,
  AlertTriangle,
  Flame,
} from "lucide-react";

interface LeaderboardProps {
  drains: DrainHealthEntry[];
  selectedSpotId: number | null;
  onSelectSpot: (spotId: number) => void;
}

export function Leaderboard({
  drains,
  selectedSpotId,
  onSelectSpot,
}: LeaderboardProps) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<"health_score" | "avg_delta" | "name">("health_score");
  const [sortAsc, setSortAsc] = useState(true);

  const sortedDrains = useMemo(() => {
    let result = [...drains];

    // Filter
    if (search.trim()) {
      result = result.filter((d) =>
        d.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortField === "health_score") {
        return sortAsc ? a.health_score - b.health_score : b.health_score - a.health_score;
      }
      if (sortField === "avg_delta") {
        return sortAsc ? a.avg_delta - b.avg_delta : b.avg_delta - a.avg_delta;
      }
      if (sortField === "name") {
        return sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      }
      return 0;
    });

    return result;
  }, [drains, search, sortField, sortAsc]);

  const handleHeaderClick = (field: "health_score" | "avg_delta" | "name") => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === "health_score" ? true : false);
    }
  };

  const getHealthColor = (score: number) => {
    if (score < 55) return "bg-rose-500";
    if (score < 75) return "bg-amber-500";
    return "bg-emerald-500";
  };

  const getHealthTextColor = (score: number) => {
    if (score < 55) return "text-rose-400";
    if (score < 75) return "text-amber-400";
    return "text-emerald-400";
  };

  return (
    <div className="flex flex-col h-full bg-[#12122b] border border-[#7B68EE]/20 rounded-2xl overflow-hidden shadow-xl">
      {/* Header & Search */}
      <div className="p-4 border-b border-[#7B68EE]/20 bg-[#161638] flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-white font-sans flex items-center gap-2">
            <span>Drain Silt & Health Leaderboard</span>
            <span className="text-[10px] font-mono text-slate-400 font-normal">
              (Sorted by Health ASC — Worst First)
            </span>
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Ranked by learned Δ residual accumulation over historical weeks.
          </p>
        </div>

        <div className="relative w-full sm:w-60">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter drains by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1 text-xs rounded-lg bg-[#0d0d1a] border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-[#7B68EE] font-sans"
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-[#0e0e22] text-slate-400 font-mono text-[11px] sticky top-0 z-10 border-b border-[#7B68EE]/20 select-none">
            <tr>
              <th className="py-2.5 px-3 w-12 text-center">Rank</th>
              <th
                onClick={() => handleHeaderClick("name")}
                className="py-2.5 px-3 cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Spot Location</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleHeaderClick("health_score")}
                className="py-2.5 px-3 cursor-pointer hover:text-white transition-colors min-w-[120px]"
              >
                <div className="flex items-center gap-1">
                  <span>Health Score</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleHeaderClick("avg_delta")}
                className="py-2.5 px-3 cursor-pointer hover:text-white transition-colors hidden sm:table-cell"
              >
                <div className="flex items-center gap-1">
                  <span>Avg Δ</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-2.5 px-3 hidden md:table-cell">Trend Slope</th>
              <th className="py-2.5 px-3">Predicted Failure</th>
              <th className="py-2.5 px-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {sortedDrains.map((drain, idx) => {
              const isSelected = selectedSpotId === drain.spot_id;
              const slope = drain.trend_slope;
              const isSlopePositive = slope !== null && slope > 0.0001;
              const isSlopeNegative = slope !== null && slope < -0.0001;

              return (
                <tr
                  key={drain.spot_id}
                  onClick={() => onSelectSpot(drain.spot_id)}
                  className={`cursor-pointer transition-all ${
                    isSelected
                      ? "bg-[#211f4c] text-white font-semibold border-l-4 border-l-[#b8a9ff]"
                      : "hover:bg-[#18183c] text-slate-300"
                  }`}
                >
                  {/* Rank */}
                  <td className="py-3 px-3 text-center text-slate-400 text-[11px]">
                    #{idx + 1}
                  </td>

                  {/* Name */}
                  <td className="py-3 px-3 font-sans font-medium text-slate-200">
                    <div className="flex items-center gap-1.5">
                      <span>{drain.name}</span>
                    </div>
                  </td>

                  {/* Health Score */}
                  <td className="py-3 px-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className={`font-bold ${getHealthTextColor(drain.health_score)}`}>
                          {drain.health_score.toFixed(1)}
                        </span>
                        <span className="text-[10px] text-slate-400">/ 100</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getHealthColor(drain.health_score)} rounded-full`}
                          style={{ width: `${Math.max(5, Math.min(100, drain.health_score))}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Avg Delta */}
                  <td className="py-3 px-3 hidden sm:table-cell text-slate-300">
                    {formatNumber(drain.avg_delta, 3)}
                  </td>

                  {/* Trend Slope */}
                  <td className="py-3 px-3 hidden md:table-cell text-[11px]">
                    <div className="flex items-center gap-1">
                      {isSlopePositive ? (
                        <TrendingUp className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      ) : isSlopeNegative ? (
                        <TrendingDown className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <Minus className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                      <span
                        className={
                          isSlopePositive
                            ? "text-amber-300"
                            : isSlopeNegative
                            ? "text-emerald-300"
                            : "text-slate-400"
                        }
                      >
                        {slope !== null
                          ? `${slope > 0 ? "+" : ""}${(slope * 100).toFixed(2)}%/wk`
                          : "—"}
                      </span>
                    </div>
                  </td>

                  {/* Predicted Failure Date */}
                  <td className="py-3 px-3 text-xs">
                    {drain.predicted_failure_date ? (
                      <span className="text-rose-300 font-semibold flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-rose-400" />
                        {formatDate(drain.predicted_failure_date)}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="py-3 px-3 text-right">
                    <FailureBadge
                      status={drain.status}
                      predictedFailureDate={drain.predicted_failure_date}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
