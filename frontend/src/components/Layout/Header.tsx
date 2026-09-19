"use client";

import React from "react";
import Link from "next/link";
import { StatusBar } from "./StatusBar";
import { Waves, Menu, ShieldAlert } from "lucide-react";

interface HeaderProps {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export function Header({ onToggleSidebar, isSidebarOpen }: HeaderProps) {
  return (
    <header className="h-14 bg-[#0d0d1a] border-b border-[#7B68EE]/20 px-4 flex items-center justify-between sticky top-0 z-30 select-none">
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 lg:hidden transition-colors"
            aria-label="Toggle Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#7B68EE] to-[#b8a9ff] flex items-center justify-center shadow-[0_0_12px_rgba(123,104,238,0.4)] group-hover:scale-105 transition-transform">
            <Waves className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold tracking-tight text-white flex items-center gap-1.5">
              WardAlert
              <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.2 rounded bg-[#7B68EE]/20 text-[#b8a9ff] border border-[#7B68EE]/30">
                G-South
              </span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono -mt-1 hidden sm:block">
              Mumbai Hyperlocal Residual Flood Predictor
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
