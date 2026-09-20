"use client";

import React, { useState } from "react";
import { Header } from "@/components/Layout/Header";
import { Sidebar } from "@/components/Layout/Sidebar";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-[#f7f8fa]">
      <Header
        onToggleSidebar={() => setMobileOpen(!mobileOpen)}
        isSidebarOpen={mobileOpen}
      />
      <div className="flex flex-1 relative overflow-hidden">
        <Sidebar
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
        />
        <main
          className={cn(
            "flex-1 flex flex-col transition-all duration-200 min-h-[calc(100vh-4rem)]",
            collapsed ? "lg:pl-[60px]" : "lg:pl-[240px]"
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
