"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Map,
  Activity,
  Bell,
  Info,
  ChevronLeft,
  ChevronRight,
  Shield,
  Layers,
  BarChart3,
  Flame,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}

export function Sidebar({
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
}: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Flood Map",
      description: "Live 30-Spot Residual Risk",
      href: "/",
      icon: Map,
    },
    {
      label: "Drain Health",
      description: "Maintenance Leaderboard & Δ",
      href: "/drain-health",
      icon: Activity,
    },
    {
      label: "Alerts Log",
      description: "WhatsApp Broadcast & Audit",
      href: "/alerts",
      icon: Bell,
    },
    {
      label: "About & Docs",
      description: "Model Status & Architecture",
      href: "/about",
      icon: Info,
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed top-14 bottom-0 left-0 z-40 bg-[#0d0d1a]/95 backdrop-blur-md border-r border-[#7B68EE]/20 transition-all duration-300 flex flex-col justify-between select-none",
          collapsed ? "w-[72px]" : "w-[240px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="p-3 space-y-4">
          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative",
                    isActive
                      ? "bg-gradient-to-r from-[#7B68EE]/30 to-[#b8a9ff]/10 text-white border border-[#7B68EE]/50 shadow-[0_0_15px_rgba(123,104,238,0.25)]"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon
                    className={cn(
                      "w-5 h-5 shrink-0 transition-colors",
                      isActive ? "text-[#b8a9ff]" : "text-slate-400 group-hover:text-slate-200"
                    )}
                  />
                  {!collapsed && (
                    <div className="flex flex-col truncate">
                      <span className="truncate leading-tight font-semibold">
                        {item.label}
                      </span>
                      <span className="text-[11px] text-slate-400 truncate mt-0.5">
                        {item.description}
                      </span>
                    </div>
                  )}

                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#b8a9ff] rounded-r-full" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section */}
        <div className="p-3 border-t border-[#7B68EE]/15 space-y-3">
          {!collapsed ? (
            <div className="p-2.5 rounded-lg bg-[#12122b]/80 border border-[#7B68EE]/20 text-xs">
              <div className="flex items-center justify-between text-slate-400 font-mono mb-1">
                <span className="text-[10px] uppercase tracking-wider">Model Status</span>
                <span className="text-emerald-400 font-bold text-[10px]">ACTIVE</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-snug">
                Dual XGBoost residual <span className="text-[#b8a9ff] font-mono">P_act − P_rain</span>
              </p>
            </div>
          ) : (
            <div className="flex justify-center">
              <Shield className="w-5 h-5 text-[#b8a9ff]/60" />
            </div>
          )}

          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex w-full items-center justify-center py-1.5 px-2 rounded-lg bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors text-xs font-mono"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <div className="flex items-center gap-2">
                <ChevronLeft className="w-4 h-4" />
                <span>Collapse</span>
              </div>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
