export interface ShapFactor {
  feature: string;
  label: string;
  value: number;
  shap_value: number;
  direction: "increases_risk" | "decreases_risk" | string;
}

export type RiskLevel = "low" | "moderate" | "high" | "critical";
export type CauseLabel = "rainfall_driven" | "drainage_failure";
export type DispatchType = "pump_and_traffic" | "desilting_crew";
export type DrainStatus = "overdue" | "degrading" | "stable" | "improving";

export interface SpotRisk {
  spot_id: number;
  name: string;
  lat: number;
  lng: number;
  elevation_m: number | null;
  depression_depth_m: number | null;
  nearest_drain_m: number | null;
  notes: string | null;
  predicted_for: string | null;
  p_rain: number | null;
  p_actual: number | null;
  delta: number | null;
  risk_level: RiskLevel | null;
  cause_label: CauseLabel | null;
  dispatch_type: DispatchType | null;
  confidence_lower: number | null;
  confidence_upper: number | null;
  shap_top3: ShapFactor[] | null;
}

export interface SpotHistoryPoint {
  predicted_for: string;
  p_rain: number;
  p_actual: number;
  delta: number;
  risk_level: string;
}

export interface SpotDetail extends SpotRisk {
  history: SpotHistoryPoint[];
}

export interface PredictRequest {
  spot_id: number;
  timestamp?: string | null;
}

export interface PredictionResponse {
  spot_id: number;
  spot_name: string;
  predicted_for: string;
  p_rain: number;
  p_actual: number;
  delta: number;
  risk_level: RiskLevel;
  cause_label: CauseLabel;
  dispatch_type: DispatchType;
  confidence_lower: number;
  confidence_upper: number;
  shap_top3: ShapFactor[];
  features?: Record<string, unknown> | null;
  prediction_id?: number | null;
}

export interface HistoricalPrediction {
  spot_id?: number | null;
  predicted_for: string;
  p_rain: number;
  p_actual: number;
  delta: number;
  risk_level: RiskLevel;
  cause_label: CauseLabel;
  dispatch_type: DispatchType;
  confidence_lower?: number | null;
  confidence_upper?: number | null;
  shap_top3?: ShapFactor[] | null;
}

export interface DrainHealthEntry {
  spot_id: number;
  name: string;
  lat: number;
  lng: number;
  health_score: number;
  avg_delta: number;
  max_delta: number;
  weeks_tracked: number;
  prediction_count: number;
  trend_slope: number | null;
  predicted_failure_date: string | null;
  status: DrainStatus | string;
}

export interface WeeklyPoint {
  year: number;
  week_number: number;
  week_start: string | null;
  avg_delta: number;
  max_delta: number;
  prediction_count: number;
  health_score: number | null;
}

export interface DrainHealthDetail {
  spot_id: number;
  name: string;
  lat: number;
  lng: number;
  health_score: number;
  avg_delta: number;
  max_delta: number;
  weeks_tracked: number;
  trend_slope: number | null;
  trend_intercept: number | null;
  predicted_failure_date: string | null;
  critical_delta: number;
  status: DrainStatus | string;
  weekly: WeeklyPoint[];
}

export interface AlertRequest {
  spot_id: number;
  language?: "en" | "hi" | "hinglish" | "mr" | null;
  recipient?: string | null;
}

export interface AlertResponse {
  id: number;
  spot_id: number;
  spot_name: string;
  language: string;
  recipient: string | null;
  channel: string;
  status: "sent" | "simulated" | "failed" | string;
  provider_sid: string | null;
  error: string | null;
  body: string;
  sent_at: string;
}

export interface AlertLogEntry {
  id: number;
  spot_id: number | null;
  spot_name: string | null;
  prediction_id: number | null;
  language: string;
  recipient: string | null;
  channel: string;
  status: string;
  provider_sid: string | null;
  error: string | null;
  body: string;
  sent_at: string;
  recipient_count?: number;
}

export interface BroadcastResponse {
  broadcast_count: number;
  mode: string;
  channels: string[];
  message: string;
  sample_payload?: string;
}

export interface HealthResponse {
  status: string;
  db: boolean;
  models_loaded: boolean;
  version: string;
  detail: string | null;
}
