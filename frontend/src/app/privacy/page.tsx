"use client";

import React from "react";
import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-4xl mx-auto w-full font-sans text-xs">
      <div className="p-4 bg-[#ffffff] border border-[#d4dae3] rounded-sm space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-[10px] uppercase font-mono tracking-widest text-[#5b6478]">
            DATA PRIVACY POLICY
          </div>
          <span className="px-1.5 py-0.5 bg-[#fffbeb] text-[#b45309] border border-[#fde68a] text-[10px] font-mono font-bold">
            DRAFT · REVIEW REQUIRED
          </span>
        </div>
        <h1 className="text-base font-bold text-[#1a1f2e] tracking-tight">
          WardAlert Operations Privacy Policy
        </h1>
        <p className="text-[#5b6478] text-xs">
          Last Updated: September 2026 · MUSA CodeX 2026 Research Prototype
        </p>
      </div>

      <div className="p-5 bg-[#ffffff] border border-[#d4dae3] rounded-sm space-y-4 leading-relaxed text-[#1a1f2e]">
        <section className="space-y-1.5">
          <h2 className="text-xs font-bold uppercase font-mono tracking-wider text-[#1a1f2e]">
            1. Data Minimization & Phone Number Hashing
          </h2>
          <p className="text-[#5b6478]">
            WardAlert enforces strict cryptographic data minimization. When a citizen subscribes to alerts via WhatsApp location sharing, their raw phone number is immediately converted to a one-way SHA-256 cryptographic hash (<code className="font-mono text-[#1a1f2e] bg-[#f1f5f9] px-1 border border-[#d4dae3]">phone_hash</code>). <strong>Zero plain-text phone numbers are stored in the database.</strong>
          </p>
        </section>

        <section className="space-y-1.5">
          <h2 className="text-xs font-bold uppercase font-mono tracking-wider text-[#1a1f2e]">
            2. Ephemeral Subscription Retention (7 to 30 Days)
          </h2>
          <p className="text-[#5b6478]">
            Citizen location subscriptions expire automatically after 7 days from last interaction. Lapsed subscriber records are purged within a maximum 30-day retention window. Users can immediately delete their subscription record at any time by texting <code className="font-mono text-[#1a1f2e] bg-[#f1f5f9] px-1 border border-[#d4dae3]">STOP</code>.
          </p>
        </section>

        <section className="space-y-1.5">
          <h2 className="text-xs font-bold uppercase font-mono tracking-wider text-[#1a1f2e]">
            3. No Data Commercialization
          </h2>
          <p className="text-[#5b6478]">
            No citizen information, location pins, or telemetry logs are ever sold, rented, or shared with commercial entities, third-party advertisers, or external marketing platforms.
          </p>
        </section>

        <section className="space-y-1.5">
          <h2 className="text-xs font-bold uppercase font-mono tracking-wider text-[#1a1f2e]">
            4. Citizen Crowd Reports
          </h2>
          <p className="text-[#5b6478]">
            When citizen waterlogging reports are submitted, only approximate coordinates, depth severity, and timestamp are recorded to feed spatial model validation. Raw reporter identities are never exposed in public dashboards.
          </p>
        </section>
      </div>

      <div className="text-center pt-2">
        <Link href="/" className="text-xs font-mono text-[#1e40af] hover:underline">
          ← Return to Operational Map
        </Link>
      </div>
    </div>
  );
}
