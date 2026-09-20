"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconDashboard,
  IconMap,
  IconRisk,
  IconDrain,
  IconAlert,
  IconReport,
  IconChevronLeft,
  IconChevronRight,
} from "@/components/Common/Icons";
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
      label: "Dashboard",
      href: "/",
      icon: IconDashboard,
    },
    {
      label: "Live Map",
      href: "/map",
      icon: IconMap,
    },
    {
      label: "Risk Analysis",
      href: "/risk-analysis",
      icon: IconRisk,
    },
    {
      label: "Drain Health",
      href: "/drain-health",
      icon: IconDrain,
    },
    {
      label: "Alerts & Dispatches",
      href: "/alerts",
      icon: IconAlert,
    },
    {
      label: "System & Architecture",
      href: "/about",
      icon: IconReport,
    },
  ];

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed top-14 bottom-0 left-0 z-40 bg-white border-r border-slate-200 transition-all duration-200 flex flex-col justify-between select-none",
          collapsed ? "w-[68px]" : "w-[220px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="p-3">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors group",
                    isActive
                      ? "bg-[#e8f2fc] text-[#0066cc]"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon
                    className={cn(
                      "w-4 h-4 shrink-0 transition-colors",
                      isActive ? "text-[#0066cc]" : "text-slate-400 group-hover:text-slate-600"
                    )}
                  />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Area with Civic Motif */}
        <div className="p-3 border-t border-slate-100 space-y-3">
          {!collapsed && (
            <div className="px-2 py-1 text-center">
              {/* Clean Municipal Skyline Motif */}
              <svg viewBox="0 0 120 30" fill="none" stroke="#94a3b8" strokeWidth="1" className="w-24 h-6 mx-auto mb-1 opacity-70">
                <path d="M5 28 H115" />
                <path d="M12 28 V16 H20 V28" />
                <path d="M22 28 V10 H32 V28" />
                <path d="M34 28 V14 H40 V28" />
                <path d="M42 28 V6 H54 V28" />
                <path d="M56 28 V18 H66 V28" />
                <path d="M68 28 V8 H80 V28" />
                <path d="M82 28 V15 H90 V28" />
                <path d="M92 28 V12 H102 V28" />
                <circle cx="48" cy="4" r="1.5" />
                <circle cx="74" cy="5" r="1.5" />
              </svg>
              <div className="text-[10px] font-semibold text-slate-700 tracking-tight">
                Mumbai Ward G/South
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5">
                Safer Communities. Stronger Mumbai.
              </div>
            </div>
          )}

          {/* Desktop Collapse Button */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex w-full items-center justify-center py-1.5 px-2 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors text-xs"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand navigation sidebar" : "Collapse navigation sidebar"}
          >
            {collapsed ? (
              <IconChevronRight className="w-3.5 h-3.5" />
            ) : (
              <div className="flex items-center gap-1.5">
                <IconChevronLeft className="w-3.5 h-3.5" />
                <span className="text-[11px]">Collapse</span>
              </div>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
