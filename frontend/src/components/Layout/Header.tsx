"use client";

import React from "react";
import Link from "next/link";
import { StatusBar } from "./StatusBar";
import { IconMenu, IconSearch, IconChevronDown } from "@/components/Common/Icons";

interface HeaderProps {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  return (
    <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Brand & Toggle */}
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
        <Link href="/" className="flex items-center gap-2.5">
          {/* Restrained Brand Wave Mark */}
          <div className="w-7 h-7 rounded-lg bg-[#0066cc] flex items-center justify-center text-white">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
              <path d="M2 10c2.5-3 5-3 8 0s5.5 3 8 0" />
              <path d="M2 14c2.5-3 5-3 8 0s5.5 3 8 0" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-semibold tracking-tight text-slate-900 text-sm leading-tight">
              WardAlert
            </span>
            <span className="text-[10px] text-slate-400 font-normal hidden sm:block">
              Smarter Flood Insights. Safer Mumbai.
            </span>
          </div>
        </Link>
      </div>

      {/* Global Location / Search Bar */}
      <div className="hidden md:flex items-center flex-1 max-w-sm mx-6">
        <div className="relative w-full">
          <IconSearch className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search location, ward or spot..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0066cc] focus:bg-white transition-colors"
            aria-label="Search spots"
          />
        </div>
      </div>

      {/* Authority Profile & Telemetry */}
      <div className="flex items-center gap-3">
        {/* Ward Selector Pill */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-[#0066cc]" />
          <span>Mumbai (Ward G/South)</span>
          <IconChevronDown className="w-3 h-3 text-slate-400" />
        </div>

        <StatusBar />

        {/* User Pill */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-7 h-7 rounded-full bg-slate-800 text-white text-[11px] font-semibold flex items-center justify-center">
            AK
          </div>
          <div className="hidden xl:flex flex-col text-left">
            <span className="text-xs font-medium text-slate-900 leading-tight">Admin</span>
            <span className="text-[10px] text-slate-400 leading-tight">BMC Authority</span>
          </div>
        </div>
      </div>
    </header>
  );
}
