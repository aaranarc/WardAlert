import {
  SpotRisk,
  SpotDetail,
  PredictRequest,
  PredictionResponse,
  DrainHealthEntry,
  DrainHealthDetail,
  DesiltResponse,
  AlertRequest,
  AlertResponse,
  AlertLogEntry,
  HealthResponse,
  BroadcastResponse,
  HistoricalPrediction,
} from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") || "http://localhost:8000";

export const HERO_TIMESTAMP = "2025-07-15T10:30:00Z";
export const REFRESH_TIMESTAMP = "2023-07-03T09:00:00Z";

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export async function fetcher<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!res.ok) {
      const errorBody = await res.text();
      let parsedError: unknown = errorBody;
      try {
        parsedError = JSON.parse(errorBody);
      } catch {
        // use raw string
      }
      console.warn(`[API] Error from ${endpoint} (status ${res.status}):`, parsedError);
      throw new ApiError(
        `API request failed with status ${res.status}`,
        res.status,
        parsedError
      );
    }

    return await res.json();
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    console.warn(`[API] Network or parsing error on ${endpoint}:`, err);
    throw err;
  }
}

// API methods
export const api = {
  getHealth: () => fetcher<HealthResponse>("/api/health"),
  getSpots: (at?: string, exclude?: string) => {
    const params = new URLSearchParams();
    if (at) params.append("at", at);
    if (exclude) params.append("exclude", exclude);
    const qs = params.toString();
    return fetcher<SpotRisk[]>(qs ? `/api/spots?${qs}` : "/api/spots");
  },
  getSpot: (id: number, historyHours: number = 24) =>
    fetcher<SpotDetail>(`/api/spots/${id}?history_hours=${historyHours}`),
  getRandomHistorical: (spotId: number) =>
    fetcher<HistoricalPrediction>(`/api/spots/${spotId}/random-historical`),
  predict: (payload: PredictRequest) =>
    fetcher<PredictionResponse>("/api/predict", {
      method: "POST",
      body: JSON.stringify({
        ...payload,
        timestamp: payload.timestamp || HERO_TIMESTAMP,
      }),
    }),
  predictAll: (timestamp?: string) =>
    fetcher<PredictionResponse[]>("/api/predict/all", {
      method: "POST",
      body: JSON.stringify({ timestamp: timestamp || HERO_TIMESTAMP }),
    }),
  getDrainHealth: () => fetcher<DrainHealthEntry[]>("/api/drain-health"),
  getDrainHealthDetail: (spotId: number) =>
    fetcher<DrainHealthDetail>(`/api/drain-health/${spotId}`),
  getDrainHealthWeekly: (spotId: number) =>
    fetcher<DrainHealthDetail>(`/api/drain-health/${spotId}/weekly`),
  desiltDrain: (spotId: number) =>
    fetcher<DesiltResponse>(`/api/drain-health/${spotId}/desilt`, {
      method: "POST",
    }),
  getDbStats: () => fetcher<Record<string, unknown>>("/api/database/stats"),
  getAlertsLog: (limit: number = 50) =>
    fetcher<AlertLogEntry[]>(`/api/alerts/log?limit=${limit}`),
  sendAlert: (payload: AlertRequest) =>
    fetcher<AlertResponse>("/api/alert/send", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getSubscribersCount: (spotId: number) =>
    fetcher<{
      spot_id: number;
      spot_name: string;
      spot_subscribers: number;
      radius_subscribers: number;
      critical_radius_km: number;
    }>(`/api/subscribers/count/${spotId}`),
  broadcastAlert: (spotId: number, payload: { mode?: "normal" | "critical"; language?: string }) =>
    fetcher<{
      broadcast_count: number;
      mode: string;
      channels: string[];
      message: string;
      sample_payload?: string;
    }>(`/api/alert/broadcast/${spotId}`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  broadcast: (spotId: number, mode?: "normal" | "critical", language?: string) =>
    fetcher<{
      broadcast_count: number;
      mode: string;
      channels: string[];
      message: string;
      sample_payload?: string;
    }>(`/api/alert/broadcast/${spotId}`, {
      method: "POST",
      body: JSON.stringify({ mode: mode || "normal", language }),
    }),
  simulateWhatsAppWebhook: (payload: {
    From?: string;
    Body?: string;
    Latitude?: number;
    Longitude?: number;
  }) =>
    fetcher<{
      success: boolean;
      action?: string;
      reply_message?: string;
      spot?: any;
      distance_m?: number;
    }>("/api/whatsapp/webhook", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
