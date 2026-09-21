"use client";

import React from "react";
import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="flex-1 bg-[#f8fafc] p-4 lg:p-8 max-w-[860px] mx-auto w-full space-y-6 text-slate-800">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Privacy Policy
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Last updated: September 2026 (Draft for administrative review)
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6 text-xs leading-relaxed shadow-xs">
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-slate-900">1. Overview and Commitment</h2>
          <p>
            WardAlert is designed to protect citizen privacy while monitoring public infrastructure. The platform does not track user browsing habits, install tracking cookies, or sell municipal data to commercial third parties.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-slate-900">2. Information Handled by the Platform</h2>
          <p>
            The system processes public geographic and meteorological data:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-600 pl-2">
            <li>Public geographic coordinates of 30 BMC flood monitoring locations.</li>
            <li>Aggregated drainage geometries from OpenStreetMap.</li>
            <li>Historical rainfall totals from CHIRPS and ERA5 reanalysis.</li>
            <li>Simulated phone identifiers used strictly for broadcast testing.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-slate-900">3. Citizen Reports and Geolocation</h2>
          <p>
            When crowd reports are received through the API, incoming coordinates are snapped to the nearest monitored flood spot using PostGIS. Exact personal coordinates and personal device identifiers are not permanently stored.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-slate-900">4. Data Retention and Storage</h2>
          <p>
            Model predictions and drain health indexes are stored in municipal database instances. No personal identity files are created or maintained by the predictive models.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-slate-900">5. Updates to This Policy</h2>
          <p>
            This policy will be revised when transitioning from pilot simulation to live production deployment with the Brihanmumbai Municipal Corporation.
          </p>
        </section>
      </div>

      <div className="text-center text-xs text-slate-400">
        <Link href="/" className="text-[#0066cc] hover:underline">Return to Dashboard</Link>
      </div>
    </div>
  );
}
