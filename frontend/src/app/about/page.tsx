"use client";

import React from "react";

export default function AboutPage() {
  const workingFeatures = [
    {
      feature: "PostGIS Schema (10 tables + v_latest_risk)",
      evidence: "database/init.sql initialized via PostgreSQL 16 + PostGIS container.",
    },
    {
      feature: "Idempotent Data Ingestion",
      evidence: "30 spots, 54 drainage lines, 1096 daily rain rows, 32 events, 1 boundary polygon.",
    },
    {
      feature: "Historical Flood Event Matching",
      evidence: "32 of 32 documented flood incidents matched at 1.000 string similarity.",
    },
    {
      feature: "Derived Spatial Physical Features",
      evidence: "nearest_drain_m (22.8 m to 1702.2 m), depression_depth_m (0.0 m to 18.8 m).",
    },
    {
      feature: "Feature Engineering Pipeline",
      evidence: "192 training snapshots (32 verified positives, 160 sampled negative hours).",
    },
    {
      feature: "Model A Baseline (Rain + Terrain)",
      evidence: "XGBoost classifier, Test ROC-AUC: 0.8187.",
    },
    {
      feature: "Model B Full Context (Drains + Silt + Crowd)",
      evidence: "XGBoost classifier, Test ROC-AUC: 0.8500, F1: 0.50 (vs Model A F1 0.29).",
    },
    {
      feature: "Dual-Model Residual Gap (Δ)",
      evidence: "Model B outperforms Model A by +0.0313 AUC. Training aborts if Delta <= 0.02.",
    },
    {
      feature: "Learned Operating Thresholds",
      evidence: "Youden J statistic (J = 0.269), risk quartiles, critical delta from p90 in thresholds.json.",
    },
    {
      feature: "TreeSHAP Explanations",
      evidence: "Top 3 feature drivers with direction and exact attribution value computed per spot.",
    },
    {
      feature: "Bayesian Uncertainty Intervals",
      evidence: "Beta posterior 95% credible interval [confidence_lower, confidence_upper].",
    },
    {
      feature: "Drain Health Siltation Index",
      evidence: "4650 predictions aggregated into 1590 weekly rows with 30 linear regression fits.",
    },
    {
      feature: "11 FastAPI REST Endpoints",
      evidence: "Validated in docs/verification_run.md and backend/tests.",
    },
    {
      feature: "4 Multilingual Alert Templates",
      evidence: "English, Hindi, Hinglish, Marathi localized templates with dynamic field mapping.",
    },
  ];

  const simulatedFeatures = [
    {
      feature: "Crowd Reports",
      real: "PostGIS radius matching, crowd_reports_500m_2h spatial feature, and REST endpoints.",
      simulated: "No live citizen webhook in historical training data. Value activates once real reports flow.",
    },
    {
      feature: "WhatsApp Outbound Alerts",
      real: "Dynamic message composition, 4 languages, alerts_sent audit trail, Twilio client integration.",
      simulated: "Without active Twilio credentials, messages log safely with SIMULATED status.",
    },
    {
      feature: "Hourly Rainfall Distribution",
      real: "Daily rainfall totals are real CHIRPS/ERA5 measured values across 1096 days.",
      simulated: "Within-day distribution uses a modeled Gaussian storm curve rather than 1-minute gauge feeds.",
    },
    {
      feature: "SRTM Elevation Coverage",
      real: "25 of 30 spots covered by primary NASA SRTM tile.",
      simulated: "5 spots south of 19.0° N use edge-clamped neighborhood elevation window.",
    },
    {
      feature: "Negative Flood Labels",
      real: "Timestamps are real historical monsoon hours.",
      simulated: "Absence of a news/BMC report is treated as no-flood event.",
    },
    {
      feature: "Drain Health Failure Dates",
      real: "Mathematical slope formulation, linear regression fit, and critical threshold extrapolation.",
      simulated: "Fitted on model residual output. No municipal desilting record exists to benchmark dates against.",
    },
  ];

  const plannedFeatures = [
    {
      feature: "Live & Forecast Rainfall Feeds",
      importance: "Highest-value gap. Historical reanalysis ends 31 Dec 2025; live prediction for today sees rain = 0.",
      notes: "Open-Meteo forecast API; RainfallSeries is single insertion point.",
    },
    {
      feature: "Sub-Daily Observed Rain Telemetry",
      importance: "Replaces the Gaussian assumption with direct AWS gauge observations.",
      notes: "Integration with BMC automatic weather station network.",
    },
    {
      feature: "Inbound Citizen WhatsApp Webhook",
      importance: "Activates the crowd report spatial feature live.",
      notes: "Twilio inbound webhook connected to POST /api/crowd-report.",
    },
    {
      feature: "Scheduled Background Prediction Cron",
      importance: "Runs predictions on a continuous timer rather than on-demand.",
      notes: "Cron runner executing POST /api/predict/all every 15 minutes during monsoon.",
    },
  ];

  return (
    <div className="p-3 lg:p-6 space-y-5 max-w-5xl mx-auto w-full font-sans text-xs">
      {/* Header */}
      <div className="p-4 bg-[#ffffff] border border-[#d4dae3] rounded-sm space-y-1">
        <div className="text-[10px] uppercase font-mono tracking-widest text-[#5b6478]">
          SYSTEM SPECIFICATION & ARCHITECTURE
        </div>
        <h1 className="text-lg font-bold text-[#1a1f2e] tracking-tight">
          WardAlert: Hyperlocal Residual Flood Predictor
        </h1>
        <p className="text-xs text-[#5b6478] leading-relaxed">
          Municipal flood dispatch and cause-attribution system for Mumbai Ward G-South. Built for BMC disaster management cells and MUSA CodeX 2026.
        </p>
      </div>

      {/* Dual Model Residual Methodology */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 font-mono">
        <div className="p-3 bg-[#ffffff] border border-[#d4dae3]">
          <div className="text-[10px] text-[#5b6478] uppercase font-bold">MODEL A (BASELINE)</div>
          <div className="text-sm font-bold text-[#1e40af] mt-1">P_rain</div>
          <p className="text-[11px] text-[#5b6478] mt-1 font-sans leading-snug">
            Trained strictly on rainfall metrics (1h, 3h, 6h, 24h, 72h) and terrain elevation. Test ROC-AUC: 0.8187.
          </p>
        </div>

        <div className="p-3 bg-[#ffffff] border border-[#d4dae3]">
          <div className="text-[10px] text-[#5b6478] uppercase font-bold">MODEL B (FULL CONTEXT)</div>
          <div className="text-sm font-bold text-[#1e40af] mt-1">P_actual</div>
          <p className="text-[11px] text-[#5b6478] mt-1 font-sans leading-snug">
            Incorporates stormwater drain distance, depression depth, and crowd reports. Test ROC-AUC: 0.8500.
          </p>
        </div>

        <div className="p-3 bg-[#ffffff] border border-[#d4dae3]">
          <div className="text-[10px] text-[#5b6478] uppercase font-bold">RESIDUAL GAP (Δ)</div>
          <div className="text-sm font-bold text-[#b45309] mt-1">Δ = P_actual - P_rain</div>
          <p className="text-[11px] text-[#5b6478] mt-1 font-sans leading-snug">
            Isolates unexplained risk. High Δ signals conduit siltation and triggers desilting crews before road waterlogging occurs.
          </p>
        </div>
      </div>

      {/* Table 1: Working Features */}
      <section className="space-y-1.5">
        <h2 className="text-xs font-bold text-[#1a1f2e] uppercase font-mono tracking-wider">
          1. WORKING ON REAL DATA (VERIFIED)
        </h2>
        <div className="bg-[#ffffff] border border-[#d4dae3] rounded-sm overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#f1f5f9] text-[#5b6478] font-mono text-[10px] uppercase border-b border-[#d4dae3]">
              <tr>
                <th className="py-2 px-3 w-1/3">FEATURE / MODULE</th>
                <th className="py-2 px-3">VERIFICATION & EVIDENCE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {workingFeatures.map((item, idx) => (
                <tr key={idx} className="hover:bg-[#f8fafc]">
                  <td className="py-2 px-3 font-semibold text-[#1a1f2e]">{item.feature}</td>
                  <td className="py-2 px-3 text-[#5b6478] font-mono text-[11px]">{item.evidence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Table 2: Simulated Features */}
      <section className="space-y-1.5">
        <h2 className="text-xs font-bold text-[#1a1f2e] uppercase font-mono tracking-wider">
          2. SIMULATION & PARTIAL COVERAGE
        </h2>
        <div className="bg-[#ffffff] border border-[#d4dae3] rounded-sm overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#f1f5f9] text-[#5b6478] font-mono text-[10px] uppercase border-b border-[#d4dae3]">
              <tr>
                <th className="py-2 px-3 w-1/4">FEATURE</th>
                <th className="py-2 px-3 w-3/8 text-[#166534]">WHAT IS REAL</th>
                <th className="py-2 px-3 w-3/8 text-[#b45309]">WHAT IS SIMULATED / GAP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {simulatedFeatures.map((item, idx) => (
                <tr key={idx} className="hover:bg-[#f8fafc]">
                  <td className="py-2 px-3 font-semibold text-[#1a1f2e] font-mono">{item.feature}</td>
                  <td className="py-2 px-3 text-[#1a1f2e] text-[11px]">{item.real}</td>
                  <td className="py-2 px-3 text-[#5b6478] text-[11px]">{item.simulated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Table 3: Planned Features */}
      <section className="space-y-1.5">
        <h2 className="text-xs font-bold text-[#1a1f2e] uppercase font-mono tracking-wider">
          3. PLANNED & ROADMAP GAPS
        </h2>
        <div className="bg-[#ffffff] border border-[#d4dae3] rounded-sm overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#f1f5f9] text-[#5b6478] font-mono text-[10px] uppercase border-b border-[#d4dae3]">
              <tr>
                <th className="py-2 px-3 w-1/4">FEATURE</th>
                <th className="py-2 px-3 w-3/8">OPERATIONAL REASON</th>
                <th className="py-2 px-3 w-3/8">IMPLEMENTATION NOTES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {plannedFeatures.map((item, idx) => (
                <tr key={idx} className="hover:bg-[#f8fafc]">
                  <td className="py-2 px-3 font-semibold text-[#1a1f2e] font-mono">{item.feature}</td>
                  <td className="py-2 px-3 text-[#1a1f2e] text-[11px]">{item.importance}</td>
                  <td className="py-2 px-3 text-[#5b6478] font-mono text-[11px]">{item.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Honest Limitations Box */}
      <div className="p-3.5 bg-[#f8fafc] border border-[#d4dae3] rounded-sm space-y-2">
        <h3 className="text-xs font-bold text-[#1a1f2e] uppercase font-mono">
          HONEST ENGINEERING DISCLOSURES
        </h3>
        <ul className="space-y-1.5 text-[11px] text-[#5b6478] list-disc list-inside leading-relaxed">
          <li>
            <strong className="text-[#1a1f2e]">Small positive event set (32 historical floods):</strong> Model AUC 0.85 on 8 test positives carries variance. Bayesian Beta posterior credible intervals are surfaced in the UI so uncertainty is transparent.
          </li>
          <li>
            <strong className="text-[#1a1f2e]">Drain health validated on methodology, not physical telemetry:</strong> Trend fits and linear failure forecasts are mathematically grounded on residual Δ, but no municipal desilting record exists to benchmark dates against.
          </li>
          <li>
            <strong className="text-[#1a1f2e]">Predictions for today see zero rainfall:</strong> Because historical rainfall reanalysis ends 31 Dec 2025, evaluating today returns low risk. For live demonstration, evaluate against the recorded monsoon cloudburst at <code className="font-mono text-[#1a1f2e] bg-[#ffffff] px-1 border border-[#d4dae3]">2025-07-15T10:30:00Z</code> at Hindmata Junction.
          </li>
        </ul>
      </div>
    </div>
  );
}
