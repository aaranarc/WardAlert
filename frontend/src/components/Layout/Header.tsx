"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { IconMenu } from "@/components/Common/Icons";

interface HeaderProps {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const [timeText, setTimeText] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const parts = new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).formatToParts(now);

      const weekday = parts.find((p) => p.type === "weekday")?.value || "";
      const day = parts.find((p) => p.type === "day")?.value || "";
      const month = parts.find((p) => p.type === "month")?.value || "";
      const hour = parts.find((p) => p.type === "hour")?.value || "";
      const minute = parts.find((p) => p.type === "minute")?.value || "";

      if (weekday && day && month && hour && minute) {
        setTimeText(`${weekday} ${day} ${month} · ${hour}:${minute} IST`);
      } else {
        setTimeText("—");
      }
    };

    updateTime();
    const timer = setInterval(updateTime, 10000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Left: teal logo (32px) + "WardAlert" (Poppins 600, 18px) + divider + "Ward G-South" (Poppins 400, 14px, gray-500) */}
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 lg:hidden transition-colors"
            aria-label="Toggle navigation"
          >
            <IconMenu className="w-5 h-5" />
          </button>
        )}
        <Link href="/" className="flex items-center gap-3">
          {/* Teal Logo (32px) */}
          <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white shrink-0 shadow-xs">
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              className="w-4 h-4"
            >
              <path d="M2 10c2.5-3 5-3 8 0s5.5 3 8 0" />
              <path d="M2 14c2.5-3 5-3 8 0s5.5 3 8 0" />
            </svg>
          </div>
          <span className="font-semibold text-[18px] text-slate-900 tracking-tight leading-none">
            WardAlert
          </span>
          <span className="text-slate-300 select-none">|</span>
          <span className="text-[14px] text-gray-500 font-normal leading-none">
            Ward G-South
          </span>
        </Link>
      </div>

      {/* Right: green pulse dot + "Live · Sun 20 Sep · 18:06 IST" */}
      <div className="flex items-center gap-2 text-slate-700 text-xs font-medium">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="text-xs sm:text-[13px] text-slate-700 font-medium">
          Live · {timeText}
        </span>
      </div>
    </header>
  );
}
