"use client";

import React from "react";
import Link from "next/link";
import { StatusBar } from "./StatusBar";

interface HeaderProps {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export function Header({ onToggleSidebar, isSidebarOpen }: HeaderProps) {
  return (
    <header className="h-13 bg-[#ffffff] border-b border-[#d4dae3] px-4 flex items-center justify-between sticky top-0 z-30 select-none">
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-1.5 border border-[#d4dae3] rounded-sm text-[#1a1f2e] hover:bg-[#f1f5f9] lg:hidden transition-colors"
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
          <div className="w-7 h-7 bg-[#1e40af] text-white flex items-center justify-center font-bold text-xs rounded-sm">
            WA
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest font-semibold text-[#5b6478] leading-none">
              MCGM · DISASTER MANAGEMENT CELL
            </span>
            <span className="text-sm font-bold tracking-tight text-[#1a1f2e] leading-tight">
              WardAlert <span className="font-mono text-xs font-normal text-[#5b6478]">/ Ward G-South</span>
            </span>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <StatusBar />
      </div>
    </header>
  );
}
