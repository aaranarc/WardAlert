"use client";

import React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Shield,
  Layers,
  Activity,
  Droplets,
  TrendingUp,
  ExternalLink,
  MapPin,
  Cpu,
  Code2,
  Terminal,
} from "lucide-react";

export default function AboutPage() {
  const workingFeatures = [
    {
      feature: "PostGIS schema, 10 tables + v_latest_risk",
      evidence: "database/init.sql; created on docker compose up",
    },
    {
      feature: "Idempotent data loading",
      evidence: "30 spots / 54 drains / 1096 days rain / 32 events / 1 boundary",
    },
    {
      feature: "Label matching",
      evidence: "32/32 documented flood events matched at similarity 1.000",
    },
    {
      feature: "Derived spatial features",
      evidence: "nearest_drain_m 22.8–1702.2 m; depression_depth_m 0–18.8 m",
    },
    {
      feature: "Feature engineering snapshots",
      evidence: "192 snapshots (32 real positives, 160 sampled negatives)",
    },
    {
      feature: "Model A (rain + terrain only)",
      evidence: "test AUC 0.8187",
    },
    {
      feature: "Model B (full context + drains + crowd)",
      evidence: "test AUC 0.8500, F1 0.50 vs Model A's 0.29",
    },
    {
      feature: "Dual-model residual Δ",
      evidence: "Model B beats A by +0.0313; training aborts if it does not",
    },
    {
      feature: "Learned thresholds (no guessing)",
      evidence: "Youden's J (J = 0.269), quartiles, p90 in thresholds.json",
    },
    {
      feature: "SHAP feature explanations",
      evidence: "Top 3 drivers with direction & attribution values per prediction",
    },
    {
      feature: "Bayesian confidence intervals",
      evidence: "Beta posterior credible interval [confidence_lower, confidence_upper]",
    },
    {
      feature: "Drain health index & degradation fit",
      evidence: "4650 predictions → 1590 weekly rows → 30 linear trends fitted",
    },
    {
      feature: "All 11 FastAPI REST endpoints",
      evidence: "Fully validated in docs/verification_run.md",
    },
    {
      feature: "4-language localized alert templates",
      evidence: "en / hi / hinglish / mr, fully translated with dynamic parameters",
    },
  ];

  const simulatedFeatures = [
    {
      feature: "Crowd reports",
      real: "Schema, PostGIS radius matching, the crowd_reports_500m_2h feature, both API endpoints.",
      notReal: "No live citizen WhatsApp webhook. The feature is 0 for historical training rows; value unlocks when real crowd reports flow.",
    },
    {
      feature: "WhatsApp alerts",
      real: "Dynamic message composition, 4 languages, alerts_sent audit trail, Twilio client integration.",
      notReal: "Without TWILIO_ACCOUNT_SID configured, messages log cleanly to the DB as 'simulated' status.",
    },
    {
      feature: "Hourly rainfall distribution",
      real: "Daily rainfall totals are real measured CHIRPS/ERA5 series (1096 days).",
      notReal: "Within-day distribution is a modelled Gaussian storm curve, not direct 1-minute gauge feeds.",
    },
    {
      feature: "SRTM Elevation coverage",
      real: "25 of 30 chronic spots fully covered by standard SRTM tile.",
      notReal: "5 spots south of 19.0°N use edge-clamped neighborhood window (tile N18E072 absent).",
    },
    {
      feature: "Negative flood labels",
      real: "Timestamps are real historical monsoon hours.",
      notReal: "'No flood occurred' is inferred from absence of BMC record, not sensor observations.",
    },
    {
      feature: "Drain health failure dates",
      real: "Mathematical formulation, linear trend fit, and threshold extrapolation are sound.",
      notReal: "Fitted on model residual output, not physical pipe sonar. No ground-truth municipal desilting record exists to validate dates against.",
    },
  ];

  const plannedFeatures = [
    {
      feature: "Live + forecast rainfall",
      why: "Highest-value gap. Historical record ends 31 Dec 2025; live prediction for today sees rain = 0.",
      notes: "Open-Meteo forecast API; RainfallSeries is the single insertion point.",
    },
    {
      feature: "Sub-daily observed rainfall",
      why: "Replaces the Gaussian assumption with direct gauge measurement.",
      notes: "BMC AWS telemetry or Open-Meteo hourly rain feeds.",
    },
    {
      feature: "Inbound WhatsApp Webhook",
      why: "Makes citizen crowd reports real and activates the crowd spatial feature live.",
      notes: "Twilio inbound webhook → POST /api/crowd-report.",
    },
    {
      feature: "Automated Prediction Cron",
      why: "Predictions run automatically on a timer rather than solely on-demand.",
      notes: "Background worker calling /api/predict/all every 15 minutes during monsoon.",
    },
  ];

  return (
    <div className="p-4 lg:p-8 space-y-8 max-w-6xl mx-auto w-full">
      {/* Hero */}
      <div className="p-6 lg:p-8 rounded-3xl bg-gradient-to-br from-[#12122b] via-[#151540] to-[#1c143d] border border-[#7B68EE]/30 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7B68EE]/20 border border-[#7B68EE]/40 text-[#b8a9ff] text-xs font-mono font-semibold">
            <span>MUSA CodeX 2026</span>
            <span>•</span>
            <span>Ward G/South, Mumbai</span>
          </div>
          <h1 className="text-2xl lg:text-4xl font-extrabold text-white tracking-tight">
            WardAlert: Hyperlocal Residual Flood Predictor
          </h1>
          <p className="text-slate-300 text-sm lg:text-base max-w-3xl leading-relaxed">
            Rainfall alone does not explain why Mumbai floods. Two spots a kilometre apart under the same cloudburst behave completely differently because one of them has a drain that is silting up. WardAlert calculates the mathematical residual <span className="font-mono text-[#b8a9ff] bg-[#7B68EE]/20 px-1.5 py-0.5 rounded">Δ = P_actual − P_rain</span> to isolate infrastructure failure from meteorology.
          </p>
        </div>
      </div>

      {/* Dual Model Residual Mathematical Formulation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-[#12122b] border border-cyan-500/30 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-cyan-400 font-bold uppercase">
              Model A (Baseline)
            </span>
            <Droplets className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-lg font-bold font-mono text-white">P_rain</div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Trained strictly on rainfall metrics (1h, 3h, 6h, 24h, 72h) and static terrain elevation. Test AUC: <strong className="text-cyan-300">0.8187</strong>.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[#12122b] border border-[#7B68EE]/40 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-[#b8a9ff] font-bold uppercase">
              Model B (Full Context)
            </span>
            <Layers className="w-4 h-4 text-[#b8a9ff]" />
          </div>
          <div className="text-lg font-bold font-mono text-white">P_actual</div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Trained on full spatial context: distance to stormwater drain, depression depth, and crowd signals. Test AUC: <strong className="text-[#b8a9ff]">0.8500</strong>.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[#12122b] border border-amber-500/30 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-amber-400 font-bold uppercase">
              The Residual Gap
            </span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-lg font-bold font-mono text-white">Δ = P_actual − P_rain</div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Quantifies unexplained flood risk. High Δ signals drain siltation and triggers desilting crews before road waterlogging occurs.
          </p>
        </div>
      </div>

      {/* Feature Status Table: Working on Real Data */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-bold text-white">
            Working on Real Data
          </h2>
        </div>

        <div className="bg-[#12122b] border border-emerald-500/20 rounded-2xl overflow-hidden shadow-lg">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead className="bg-[#0f1722] text-slate-400 text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 w-1/3">Feature</th>
                <th className="py-3 px-4">Verification & Evidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {workingFeatures.map((item, idx) => (
                <tr key={idx} className="hover:bg-[#18183c] transition-colors">
                  <td className="py-2.5 px-4 font-sans font-medium text-slate-200">
                    {item.feature}
                  </td>
                  <td className="py-2.5 px-4 text-emerald-300 font-mono text-[11px]">
                    {item.evidence}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Feature Status Table: Simulation / Partial */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-bold text-white">
            Simulation & Partial Coverage
          </h2>
        </div>

        <div className="bg-[#12122b] border border-amber-500/20 rounded-2xl overflow-hidden shadow-lg">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#1c1815] text-slate-400 font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 w-1/4 font-mono">Feature</th>
                <th className="py-3 px-4 w-3/8 text-emerald-400 font-mono">What is Real</th>
                <th className="py-3 px-4 w-3/8 text-amber-400 font-mono">What is Simulated / Gap</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {simulatedFeatures.map((item, idx) => (
                <tr key={idx} className="hover:bg-[#18183c] transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-200 font-mono">
                    {item.feature}
                  </td>
                  <td className="py-3 px-4 text-slate-300 text-xs leading-relaxed">
                    {item.real}
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-xs leading-relaxed">
                    {item.notReal}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Feature Status Table: Planned / Not Built */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <XCircle className="w-5 h-5 text-rose-400" />
          <h2 className="text-lg font-bold text-white">
            Planned & Future Roadmap
          </h2>
        </div>

        <div className="bg-[#12122b] border border-rose-500/20 rounded-2xl overflow-hidden shadow-lg">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#1e1014] text-slate-400 font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 w-1/4 font-mono">Feature</th>
                <th className="py-3 px-4 w-3/8 text-rose-300 font-mono">Why it Matters</th>
                <th className="py-3 px-4 w-3/8 text-slate-400 font-mono">Implementation Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {plannedFeatures.map((item, idx) => (
                <tr key={idx} className="hover:bg-[#18183c] transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-200 font-mono">
                    {item.feature}
                  </td>
                  <td className="py-3 px-4 text-slate-300 text-xs leading-relaxed">
                    {item.why}
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-xs leading-relaxed font-mono text-[11px]">
                    {item.notes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Honest Limitations Box */}
      <div className="p-6 rounded-3xl bg-[#101026] border border-[#7B68EE]/30 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-[#b8a9ff]" />
          <span>Honest Engineering & Scientific Disclosures</span>
        </h3>
        <ul className="space-y-3 text-xs text-slate-300 leading-relaxed list-disc list-inside">
          <li>
            <strong>32 documented flood events is a compact positive dataset:</strong> Model AUC 0.85 on test positives carries variance. Bayesian Beta posterior credible intervals are surfaced in the UI precisely so uncertainty is visible.
          </li>
          <li>
            <strong>Drain health is validated on methodology, not physical ground truth:</strong> Trends and linear extrapolation are mathematically sound, but no BMC desilting records exist to benchmark predicted failure dates against. It is an operational prioritization index.
          </li>
          <li>
            <strong>Predictions for today see rain = 0:</strong> Because historical rainfall data ends 31 Dec 2025, evaluating today returns low risk. For live demonstration, test against the recorded extreme cloudburst at <code className="text-[#b8a9ff] bg-slate-900 px-1 py-0.5 rounded">2025-07-15T10:30:00Z</code> at Hindmata Junction.
          </li>
        </ul>
      </div>
    </div>
  );
}
