"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MapIcon,
  ActivityIcon,
  BellIcon,
  InfoIcon,
  ShieldIcon,
  LayersIcon,
} from "@/components/Icons";
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
      label: "LIVE MAP",
      href: "/",
      icon: MapIcon,
    },
    {
      label: "DRAIN HEALTH",
      href: "/drain-health",
      icon: ActivityIcon,
    },
    {
      label: "ALERTS",
      href: "/alerts",
      icon: BellIcon,
    },
    {
      label: "ARCHITECTURE",
      href: "/about",
      icon: InfoIcon,
    },
  ];

  const legalItems = [
    { label: "TERMS OF SERVICE", href: "/terms" },
    { label: "PRIVACY POLICY", href: "/privacy" },
  ];

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed top-13 bottom-0 left-0 z-40 bg-[#ffffff] border-r border-[#d4dae3] transition-all duration-200 flex flex-col justify-between select-none",
          collapsed ? "w-[60px]" : "w-[240px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="p-2 space-y-4">
          <nav className="space-y-0.5">
            <div className="px-2.5 py-1 text-[10px] uppercase tracking-widest font-semibold text-[#5b6478]">
              {!collapsed && "OPERATIONAL MODULES"}
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 text-xs font-semibold tracking-tight transition-colors rounded-sm",
                    isActive
                      ? "bg-[#1e40af] text-white"
                      : "text-[#1a1f2e] hover:bg-[#f1f5f9] hover:text-[#1e40af]"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon
                    className={cn(
                      "w-4 h-4 shrink-0",
                      isActive ? "text-white" : "text-[#5b6478]"
                    )}
                  />
                  {!collapsed && (
                    <span className="truncate uppercase text-[11px] tracking-wide font-sans">
                      {item.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Rail Details */}
        <div className="p-3 border-t border-[#d4dae3] space-y-2 bg-[#f8fafc]">
          {!collapsed ? (
            <div className="space-y-1.5 text-[11px] font-mono text-[#5b6478]">
              <div className="flex items-center justify-between text-[#1a1f2e] font-semibold">
                <span>WARD G-SOUTH</span>
                <span>9.29 km²</span>
              </div>
              <div className="text-[10px] text-[#5b6478]">
                Worli · Lower Parel · Prabhadevi
              </div>
              <div className="pt-2 border-t border-[#e2e8f0] flex flex-col gap-1 text-[10px]">
                {legalItems.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="hover:text-[#1e40af] transition-colors"
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex justify-center text-[#5b6478]">
              <LayersIcon className="w-4 h-4" />
            </div>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex w-full items-center justify-center py-1 border border-[#d4dae3] bg-[#ffffff] hover:bg-[#f1f5f9] text-[#5b6478] hover:text-[#1a1f2e] text-[10px] font-mono transition-colors"
            title={collapsed ? "Expand rail" : "Collapse rail"}
          >
            {collapsed ? "»" : "« COLLAPSE"}
          </button>
        </div>
      </aside>
    </>
  );
}
