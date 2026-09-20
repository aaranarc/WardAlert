"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

interface HeaderProps {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const [timeIST, setTimeIST] = useState<string>("");
  const [dateStr, setDateStr] = useState<string>("Live · Sun 20 Sep");

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const istTime = now.toLocaleTimeString("en-GB", {
        timeZone: "Asia/Kolkata",
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setTimeIST(`IST ${istTime}`);

      const formattedDate = now.toLocaleDateString("en-GB", {
        timeZone: "Asia/Kolkata",
        weekday: "short",
        day: "numeric",
        month: "short",
      });
      setDateStr(`Live · ${formattedDate}`);
    };

    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-16 bg-[#ffffff] border-b border-[#e5e7eb] px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Brand Identity & Location */}
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-1.5 border border-[#d4dae3] rounded text-[#1a1f2e] hover:bg-[#f1f5f9] lg:hidden transition-colors"
            aria-label="Toggle navigation rail"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        )}

        <Link href="/" className="flex items-center gap-2.5">
          {/* Circular teal logo, 32px */}
          <div className="w-8 h-8 rounded-full bg-[#0d9488] flex items-center justify-center text-white font-bold text-xs shadow-sm shrink-0">
            <svg
              className="w-4 h-4 text-white"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
            </svg>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-poppins font-semibold text-[18px] text-[#111827] leading-none tracking-tight">
              WardAlert
            </span>
            <span className="h-4 w-px bg-[#d1d5db]" aria-hidden="true" />
            <span className="font-poppins font-normal text-[14px] text-gray-500 leading-none">
              Ward G-South
            </span>
          </div>
        </Link>
      </div>

      {/* Right: green pulse dot + "Live · Sun 20 Sep" + "IST HH:MM:SS" */}
      <div className="flex items-center gap-2.5 text-xs text-gray-600">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
        </span>
        <span className="font-poppins font-medium text-gray-700 text-[13px]">
          {dateStr}
        </span>
        <span className="text-gray-300">·</span>
        <span className="font-mono text-gray-600 text-[12px] tabular-nums">
          {timeIST || "IST --:--:--"}
        </span>
      </div>
    </header>
  );
}
