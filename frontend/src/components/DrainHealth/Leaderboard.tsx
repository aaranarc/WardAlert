"use client";

import React, { useState, useMemo } from "react";
import { DrainHealthEntry } from "@/lib/types";
import { FailureBadge } from "./FailureBadge";
import { formatDate, formatNumber } from "@/lib/utils";
import { SearchIcon, ArrowUpDownIcon } from "@/components/Icons";

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

    if (search.trim()) {
      result = result.filter((d) =>
        d.name.toLowerCase().includes(search.toLowerCase())
      );
    }

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

  const getHealthTextColor = (score: number) => {
    if (score < 55) return "text-[#b91c1c]";
    if (score < 75) return "text-[#b45309]";
    return "text-[#166534]";
  };

  return (
    <div className="flex flex-col h-full bg-[#ffffff] border border-[#d4dae3] rounded-sm overflow-hidden">
      {/* Header & Search */}
      <div className="p-3 border-b border-[#d4dae3] bg-[#f8fafc] flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#1a1f2e] font-mono">
            DRAIN SILTATION & HEALTH LEADERBOARD
          </h2>
          <p className="text-[11px] text-[#5b6478] mt-0.5">
            Ranked by longitudinal residual accumulation (Worst condition first).
          </p>
        </div>

        <div className="relative w-full sm:w-56">
          <SearchIcon className="w-3.5 h-3.5 text-[#5b6478] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter drains..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-2.5 py-1 text-xs bg-[#ffffff] border border-[#d4dae3] text-[#1a1f2e] placeholder-[#5b6478] focus:outline-none focus:border-[#1e40af]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-xs border-collapse font-mono">
          <thead className="bg-[#f1f5f9] text-[#5b6478] text-[10px] uppercase tracking-wider sticky top-0 z-10 border-b border-[#d4dae3] select-none">
            <tr>
              <th className="py-2 px-2.5 w-10 text-center">#</th>
              <th
                onClick={() => handleHeaderClick("name")}
                className="py-2 px-2.5 cursor-pointer hover:text-[#1a1f2e] transition-colors"
              >
                <div className="flex items-center gap-1 font-sans">
                  <span>LOCATION</span>
                  <ArrowUpDownIcon className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleHeaderClick("health_score")}
                className="py-2 px-2.5 cursor-pointer hover:text-[#1a1f2e] transition-colors min-w-[100px]"
              >
                <div className="flex items-center gap-1">
                  <span>HEALTH</span>
                  <ArrowUpDownIcon className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleHeaderClick("avg_delta")}
                className="py-2 px-2.5 cursor-pointer hover:text-[#1a1f2e] transition-colors hidden sm:table-cell"
              >
                <div className="flex items-center gap-1">
                  <span>AVG Δ</span>
                  <ArrowUpDownIcon className="w-3 h-3" />
                </div>
              </th>
              <th className="py-2 px-2.5 hidden md:table-cell">SLOPE</th>
              <th className="py-2 px-2.5">PROJECTED FAILURE</th>
              <th className="py-2 px-2.5 text-right">STATUS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e2e8f0]">
            {sortedDrains.map((drain, idx) => {
              const isSelected = selectedSpotId === drain.spot_id;
              const slope = drain.trend_slope;
              const isSlopePositive = slope !== null && slope > 0.0001;
              const isSlopeNegative = slope !== null && slope < -0.0001;

              return (
                <tr
                  key={drain.spot_id}
                  onClick={() => onSelectSpot(drain.spot_id)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-[#eff6ff] text-[#1e40af] font-semibold border-l-2 border-l-[#1e40af]"
                      : "hover:bg-[#f8fafc] text-[#1a1f2e]"
                  }`}
                >
                  <td className="py-2 px-2.5 text-center text-[#5b6478] text-[11px]">
                    {idx + 1}
                  </td>

                  <td className="py-2 px-2.5 font-sans font-medium">
                    {drain.name}
                  </td>

                  <td className="py-2 px-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`font-bold ${getHealthTextColor(drain.health_score)}`}>
                        {drain.health_score.toFixed(1)}
                      </span>
                      <span className="text-[10px] text-[#5b6478]">/ 100</span>
                    </div>
                  </td>

                  <td className="py-2 px-2.5 hidden sm:table-cell">
                    +{formatNumber(drain.avg_delta, 3)}
                  </td>

                  <td className="py-2 px-2.5 hidden md:table-cell text-[11px]">
                    <span
                      className={
                        isSlopePositive
                          ? "text-[#b45309]"
                          : isSlopeNegative
                          ? "text-[#166534]"
                          : "text-[#5b6478]"
                      }
                    >
                      {slope !== null
                        ? `${slope > 0 ? "+" : ""}${(slope * 100).toFixed(2)}%/wk`
                        : "—"}
                    </span>
                  </td>

                  <td className="py-2 px-2.5 text-[11px]">
                    {drain.predicted_failure_date ? (
                      <span className="text-[#b91c1c] font-semibold">
                        {formatDate(drain.predicted_failure_date)}
                      </span>
                    ) : (
                      <span className="text-[#5b6478]">—</span>
                    )}
                  </td>

                  <td className="py-2 px-2.5 text-right">
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
