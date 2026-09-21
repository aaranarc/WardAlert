"use client";

import React from "react";
import Link from "next/link";
import { IconCheck, IconWarning, IconLayers } from "@/components/Common/Icons";

export default function AboutPage() {
  const workingFeatures = [
    {
      feature: "PostGIS schema and 10 spatial tables",
      evidence: "database/init.sql with EPSG:4326 and UTM 43N metric projection",
    },
    {
      feature: "Idempotent data ingestion",
      evidence: "30 spots, 54 drainage lines, 1096 days rainfall, 32 events, 1 boundary",
    },
    {
      feature: "Ground truth label matching",
      evidence: "32 of 32 documented flood events matched to spots at 1.000 similarity",
    },
    {
      feature: "Derived spatial features",
      evidence: "nearest_drain_m: 22.8 to 1702.2 m; depression_depth_m: 0 to 18.8 m",
    },
    {
      feature: "Training snapshots",
      evidence: "192 snapshots (32 real positives and 160 sampled negatives)",
    },
    {
      feature: "Model A (Rainfall baseline)",
      evidence: "Test AUC 0.8187 with F1 0.2857",
    },
    {
      feature: "Model B (Full context with drainage)",
      evidence: "Test AUC 0.8500 with F1 0.5000",
    },
    {
      feature: "Dual model residual delta",
      evidence: "Model B beats Model A by +0.0313 AUC lift to confirm drainage signal",
    },
    {
      feature: "Learned operational thresholds",
      evidence: "Youden J index = 0.269, quartiles, and p90 saved in thresholds.json",
    },
    {
      feature: "SHAP tree explainers",
      evidence: "Top 3 drivers with direction computed per prediction call",
    },
    {
      feature: "Bayesian confidence intervals",
      evidence: "Beta posterior credible interval bounds calculated for uncertainty",
    },
    {
      feature: "Drain health longitudinal index",
      evidence: "1590 weekly rows scored with linear degradation extrapolation",
    },
  ];

  const simulatedFeatures = [
    {
      name: "Crowd Citizen Reports",
      real: "PostGIS radius snapping and 500m 2h aggregation logic.",
      simulated: "No live public reporting channel yet. Historical training rows default to 0.",
    },
    {
      name: "WhatsApp Citizen Broadcast",
      real: "4-language templates (English, Hindi, Marathi, Hinglish) and audit trail.",
      simulated: "Without Twilio credentials, messages record as simulated in the ledger.",
    },
    {
      name: "Sub-daily Rainfall Curve",
      real: "Daily totals are measured from CHIRPS and ERA5 via Open-Meteo.",
      simulated: "Hourly curves within the day use a modeled Gaussian distribution.",
    },
    {
      name: "Drain Degradation Baseline",
      real: "Linear fit and critical delta threshold extrapolation are mathematically sound.",
      simulated: "Validation is on model outputs because no BMC desilting log was published.",
    },
  ];

  return (
    <div className="flex-1 bg-[#f8fafc] p-4 lg:p-6 space-y-6 max-w-[1200px] mx-auto w-full">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          System Architecture and Data Provenance
        </h1>
        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
          WardAlert is a municipal flood dispatch and cause-attribution system for Mumbai Ward G-South. Built for BMC disaster management cells.
        </p>
      </div>

      {/* Core Principle Card */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 space-y-3 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900">The Core Idea: Dual Model Residual</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Rainfall alone does not explain why Mumbai floods unevenly. Two spots one kilometer apart under the same cloudburst behave differently when one has a clogged drainage segment.
        </p>
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 font-mono text-xs text-slate-800 space-y-1">
          <p className="font-semibold text-[#0066cc]">Δ = P_actual - P_rain</p>
          <p className="text-slate-600 text-[11px]">
            Where P_rain sees only rainfall and elevation, and P_actual sees drainage distance and citizen reports.
          </p>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          The difference (Δ) represents flood risk that weather alone cannot account for. A positive Δ signals a localized drainage choke point, directing crews to desilt rather than simply deploy pumps.
        </p>
      </div>

      {/* Verified Features Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-900">Verified Pipeline Layers</h2>
          <span className="text-[10px] font-mono text-emerald-700 font-semibold px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200">
            All 12 Layers Verified
          </span>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {workingFeatures.map((item, i) => (
            <div key={i} className="p-3 sm:flex sm:items-center sm:justify-between hover:bg-slate-50/60 transition-colors">
              <div className="flex items-center gap-2 font-medium text-slate-900">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>{item.feature}</span>
              </div>
              <div className="text-[11px] font-mono text-slate-500 mt-1 sm:mt-0 sm:text-right">
                {item.evidence}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Simulated or Partial Capabilities */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 bg-slate-50/70">
          <h2 className="text-xs font-bold text-slate-900">Simulated and Partial Implementations</h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Disclosures on which features run on historical telemetry versus simulation.
          </p>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {simulatedFeatures.map((item, i) => (
            <div key={i} className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1 text-xs">
              <h3 className="font-semibold text-slate-900">{item.name}</h3>
              <p className="text-[11px] text-slate-700">
                <span className="font-medium text-slate-500">Real logic:</span> {item.real}
              </p>
              <p className="text-[11px] text-slate-500">
                <span className="font-medium text-amber-700">Simulation:</span> {item.simulated}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Legal Links */}
      <div className="p-4 text-center text-xs text-slate-400 space-x-4">
        <Link href="/terms" className="hover:text-slate-700 underline">Terms of Service</Link>
        <span>•</span>
        <Link href="/privacy" className="hover:text-slate-700 underline">Privacy Policy</Link>
      </div>
    </div>
  );
}
