"use client";

import React, { useState, useMemo } from "react";
import { DrainHealthEntry } from "@/lib/types";
import { FailureBadge } from "./FailureBadge";
import { formatDate } from "@/lib/utils";
import { IconSearch } from "@/components/Common/Icons";

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
      setSortAsc(true);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      {/* Header and Search */}
      <div className="p-3.5 border-b border-slate-100 bg-slate-50/70 space-y-2.5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold text-slate-900">Drain Leaderboard</h2>
            <p className="text-[11px] text-slate-500">Sorted by degradation risk</p>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            {sortedDrains.length} of {drains.length}
          </span>
        </div>

        <div className="relative">
          <IconSearch className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search drain spot..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0066cc]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto min-h-[320px]">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-50 border-b border-slate-100 text-[10px] text-slate-500 uppercase font-semibold tracking-wider sticky top-0 z-10">
            <tr>
              <th
                onClick={() => handleHeaderClick("name")}
                className="py-2.5 px-3 cursor-pointer hover:text-slate-900"
              >
                Location {sortField === "name" && (sortAsc ? "↑" : "↓")}
              </th>
              <th
                onClick={() => handleHeaderClick("health_score")}
                className="py-2.5 px-3 cursor-pointer hover:text-slate-900 text-right"
              >
                Health {sortField === "health_score" && (sortAsc ? "↑" : "↓")}
              </th>
              <th
                onClick={() => handleHeaderClick("avg_delta")}
                className="py-2.5 px-3 cursor-pointer hover:text-slate-900 text-right"
              >
                Avg Δ {sortField === "avg_delta" && (sortAsc ? "↑" : "↓")}
              </th>
              <th className="py-2.5 px-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedDrains.map((drain) => {
              const isSelected = selectedSpotId === drain.spot_id;
              const isLowHealth = drain.health_score < 60;

              return (
                <tr
                  key={drain.spot_id}
                  onClick={() => onSelectSpot(drain.spot_id)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-[#e8f2fc]"
                      : "hover:bg-slate-50/80"
                  }`}
                >
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-slate-900 truncate max-w-[130px]">
                      {drain.name}
                    </div>
                    {drain.predicted_failure_date && (
                      <div className="text-[10px] text-rose-600 font-mono mt-0.5">
                        Failure: {formatDate(drain.predicted_failure_date)}
                      </div>
                    )}
                  </td>

                  <td className="py-2.5 px-3 text-right font-mono font-medium">
                    <span className={isLowHealth ? "text-rose-600 font-bold" : "text-slate-800"}>
                      {drain.health_score.toFixed(1)}
                    </span>
                  </td>

                  <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                    +{drain.avg_delta.toFixed(3)}
                  </td>

                  <td className="py-2.5 px-3 text-center">
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
