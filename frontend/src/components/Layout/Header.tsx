"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatusBar } from "./StatusBar";
import { useSpots } from "@/hooks/useSpots";
import { RISK_COLORS } from "@/lib/constants";
import {
  IconMenu,
  IconSearch,
  IconChevronDown,
  IconCheck,
  IconAlert,
  IconLayers,
  IconClose,
} from "@/components/Common/Icons";

interface HeaderProps {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

const BMC_WARDS = [
  { code: "G/South", name: "Ward G/South (Elphinstone / Worli / Lower Parel)", status: "Active (Dual Models Live)", spots: 30, active: true },
  { code: "F/North", name: "Ward F/North (Sion / Matunga / King's Circle)", status: "Connected (AWS Telemetry)", spots: 24, active: false },
  { code: "H/West", name: "Ward H/West (Bandra / Khar / Milan Subway)", status: "Connected (AWS Telemetry)", spots: 18, active: false },
  { code: "K/East", name: "Ward K/East (Andheri East / Western Express)", status: "Ready for Ingestion", spots: 22, active: false },
  { code: "D", name: "Ward D (Grant Road / Nana Chowk / Tardeo)", status: "Ready for Ingestion", spots: 16, active: false },
];

export function Header({ onToggleSidebar }: HeaderProps) {
  const router = useRouter();
  const { spots } = useSpots();

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Ward Selector State
  const [selectedWard, setSelectedWard] = useState(BMC_WARDS[0]);
  const [isWardDropdownOpen, setIsWardDropdownOpen] = useState(false);
  const wardDropdownRef = useRef<HTMLDivElement>(null);

  // Officer Profile Modal State
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Filter spots based on search query
  const searchResults = React.useMemo(() => {
    if (!searchQuery.trim() || !spots) return [];
    const q = searchQuery.toLowerCase();
    return spots
      .filter((s) => s.name.toLowerCase().includes(q) || s.landmark?.toLowerCase().includes(q))
      .slice(0, 6);
  }, [searchQuery, spots]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
      if (wardDropdownRef.current && !wardDropdownRef.current.contains(event.target as Node)) {
        setIsWardDropdownOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectSearchResult = (spotId: number) => {
    setIsSearchOpen(false);
    setSearchQuery("");
    router.push(`/map?spot_id=${spotId}`);
  };

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

      {/* Global Dynamic Search Bar */}
      <div ref={searchContainerRef} className="hidden md:flex items-center flex-1 max-w-sm mx-6 relative">
        <div className="relative w-full">
          <IconSearch className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
            placeholder="Search spot, landmark or ward..."
            className="w-full pl-8 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0066cc] focus:bg-white transition-colors"
            aria-label="Search spots"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Live Search Autocomplete Dropdown */}
        {isSearchOpen && searchQuery.trim().length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
            <div className="p-2 border-b border-slate-100 text-[10px] uppercase font-semibold text-slate-400 tracking-wider flex justify-between items-center">
              <span>Matching Locations ({searchResults.length})</span>
              <span>Ward G/South</span>
            </div>
            {searchResults.length > 0 ? (
              <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                {searchResults.map((spot) => {
                  const risk = spot.risk_level || "low";
                  const color = RISK_COLORS[risk] || "#0066cc";
                  return (
                    <div
                      key={spot.spot_id}
                      onClick={() => handleSelectSearchResult(spot.spot_id)}
                      className="p-2.5 hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors text-left"
                    >
                      <div className="truncate max-w-[210px]">
                        <div className="text-xs font-semibold text-slate-900 truncate">
                          {spot.name}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {spot.landmark || "Ward G/South"}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider"
                          style={{ backgroundColor: `${color}15`, color }}
                        >
                          {risk}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-slate-500">
                No spots found matching "{searchQuery}"
              </div>
            )}
          </div>
        )}
      </div>

      {/* Authority Profile & Telemetry */}
      <div className="flex items-center gap-3">
        {/* Dynamic Ward Selector Pill & Dropdown */}
        <div ref={wardDropdownRef} className="relative hidden lg:block">
          <button
            type="button"
            onClick={() => setIsWardDropdownOpen(!isWardDropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#0066cc] animate-pulse" />
            <span>Mumbai ({selectedWard.code})</span>
            <IconChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isWardDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {isWardDropdownOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-72 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden p-1.5">
              <div className="px-2 py-1.5 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                BMC Administrative Jurisdictions
              </div>
              <div className="divide-y divide-slate-100 mt-1">
                {BMC_WARDS.map((ward) => (
                  <button
                    key={ward.code}
                    onClick={() => {
                      setSelectedWard(ward);
                      setIsWardDropdownOpen(false);
                    }}
                    className={`w-full text-left p-2 rounded-lg text-xs transition-colors flex items-center justify-between ${
                      selectedWard.code === ward.code
                        ? "bg-[#e8f2fc] text-[#0066cc] font-semibold"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div>
                      <div className="text-xs font-medium">{ward.name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{ward.status}</div>
                    </div>
                    {selectedWard.code === ward.code && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#0066cc] text-white shrink-0">
                        Active
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <StatusBar />

        {/* User Pill & Session Modal Trigger */}
        <div ref={profileRef} className="relative">
          <button
            type="button"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 pl-2 border-l border-slate-200 text-left cursor-pointer hover:opacity-85 transition-opacity"
            title="Click to view BMC Officer Credentials & Session"
          >
            <div className="w-7 h-7 rounded-full bg-slate-800 text-white text-[11px] font-semibold flex items-center justify-center">
              AK
            </div>
            <div className="hidden xl:flex flex-col text-left">
              <span className="text-xs font-medium text-slate-900 leading-tight">Admin</span>
              <span className="text-[10px] text-slate-400 leading-tight">BMC Authority</span>
            </div>
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-80 bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-4 space-y-3">
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-bold text-sm flex items-center justify-center">
                    AK
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Shri Ajay Kulkarni</div>
                    <div className="text-[11px] text-slate-500">Dy. Municipal Commissioner</div>
                  </div>
                </div>
                <button
                  onClick={() => setIsProfileOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Department:</span>
                  <span className="font-medium text-slate-800">Storm Water Drains (SWD)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Emergency Desk:</span>
                  <span className="font-medium text-slate-800">Ward G/South Operations</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Database Engine:</span>
                  <span className="font-mono text-[11px] text-emerald-700 font-semibold">Node.js Persistent JSON</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Data Integrity:</span>
                  <span className="font-mono text-[11px] text-[#0066cc] font-semibold">30 Spots | 480 Weeks</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-mono">Session: Valid until 20:00 IST</span>
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                  }}
                  className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
