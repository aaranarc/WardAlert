import { RiskLevel, CauseLabel, DispatchType, DrainStatus } from "./types";

export const MAP_CENTER: [number, number] = [19.015, 72.825];
export const DEFAULT_ZOOM = 14;

export const RISK_COLORS: Record<RiskLevel | "unknown", string> = {
  low: "#166534",
  moderate: "#d97706",
  high: "#b45309",
  critical: "#b91c1c",
  unknown: "#64748b",
};

export const RISK_BG_COLORS: Record<RiskLevel | "unknown", string> = {
  low: "#f0fdf4",
  moderate: "#fffbeb",
  high: "#fff7ed",
  critical: "#fef2f2",
  unknown: "#f8fafc",
};

export const RISK_BORDER_COLORS: Record<RiskLevel | "unknown", string> = {
  low: "#bbf7d0",
  moderate: "#fde68a",
  high: "#fed7aa",
  critical: "#fecaca",
  unknown: "#e2e8f0",
};

export const CAUSE_DESCRIPTIONS: Record<CauseLabel, string> = {
  rainfall_driven: "Rainfall intensity exceeding local surface infiltration rate.",
  drainage_failure: "Stormwater conduit capacity degraded by siltation, obstruction, or hydraulic backflow.",
};

export const DISPATCH_DESCRIPTIONS: Record<DispatchType, string> = {
  pump_and_traffic: "Deploy dewatering suction pump units and position traffic marshals at low-lying access points.",
  desilting_crew: "Deploy emergency drain desilting and excavation crew to clear local stormwater conduit blockages.",
};

export const DRAIN_STATUS_COLORS: Record<DrainStatus | string, string> = {
  overdue: "#b91c1c",
  degrading: "#b45309",
  stable: "#1e40af",
  improving: "#166534",
};
