import { RiskLevel, CauseLabel, DispatchType, DrainStatus } from "./types";

export const MAP_CENTER: [number, number] = [19.015, 72.825];
export const DEFAULT_ZOOM = 14;

export const RISK_COLORS: Record<RiskLevel | "unknown", string> = {
  critical: "#ef4444",
  high: "#f59e0b",
  moderate: "#eab308",
  low: "#10b981",
  unknown: "#94a3b8",
};

export const RISK_BG_COLORS: Record<RiskLevel | "unknown", string> = {
  low: "rgba(74, 222, 128, 0.15)",
  moderate: "rgba(250, 204, 21, 0.15)",
  high: "rgba(251, 146, 60, 0.15)",
  critical: "rgba(239, 68, 68, 0.15)",
  unknown: "rgba(148, 163, 184, 0.15)",
};

export const RISK_BORDER_COLORS: Record<RiskLevel | "unknown", string> = {
  low: "rgba(74, 222, 128, 0.4)",
  moderate: "rgba(250, 204, 21, 0.4)",
  high: "rgba(251, 146, 60, 0.4)",
  critical: "rgba(239, 68, 68, 0.4)",
  unknown: "rgba(148, 163, 184, 0.4)",
};

export const CAUSE_DESCRIPTIONS: Record<CauseLabel, string> = {
  rainfall_driven: "Heavy Rainfall Exceeding Infiltration",
  drainage_failure: "Drainage Capacity Reduced / Silted / Backflow",
};

export const DISPATCH_DESCRIPTIONS: Record<DispatchType, string> = {
  pump_and_traffic: "Deploy dewatering pumps & dispatch traffic marshals to avoid waterlogged stretches.",
  desilting_crew: "Deploy emergency drain desilting crew & clear local silt / blockages.",
};

export const DRAIN_STATUS_COLORS: Record<DrainStatus | string, string> = {
  overdue: "#ef4444",
  degrading: "#fb923c",
  stable: "#38bdf8",
  improving: "#4ade80",
};
