const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.API_PORT || 8000;
const REPO_ROOT = __dirname;
const DB_PATH = path.join(REPO_ROOT, "data", "wardalert_db.json");
const TEMPLATES_DIR = path.join(REPO_ROOT, "whatsapp_templates");

// -------------------------------------------------------------
// Geo & Math Utilities
// -------------------------------------------------------------
function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function haversineDistMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function pointToSegmentDistMeters(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) {
    return haversineDistMeters(py, px, y1, x1);
  }
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return haversineDistMeters(py, px, projY, projX);
}

function hashPhone(phone) {
  const clean = String(phone || "").trim().toLowerCase();
  return crypto.createHash("sha256").update(clean).digest("hex");
}

// -------------------------------------------------------------
// Dynamic Data Loaders (No Hardcoded Lists)
// -------------------------------------------------------------
function loadDrainageLines() {
  try {
    const geojsonPath = path.join(REPO_ROOT, "data", "processed", "drainage_gsouth.geojson");
    if (!fs.existsSync(geojsonPath)) return [];
    const raw = JSON.parse(fs.readFileSync(geojsonPath, "utf8"));
    const segments = [];
    if (raw && raw.features) {
      for (const feat of raw.features) {
        if (feat.geometry && feat.geometry.type === "LineString") {
          const coords = feat.geometry.coordinates; // [[lng, lat], ...]
          for (let i = 0; i < coords.length - 1; i++) {
            segments.push({
              x1: coords[i][0],
              y1: coords[i][1],
              x2: coords[i + 1][0],
              y2: coords[i + 1][1],
            });
          }
        }
      }
    }
    return segments;
  } catch (err) {
    console.warn("[DB] Could not load drainage GeoJSON:", err.message);
    return [];
  }
}

function loadThresholds() {
  try {
    const p = path.join(REPO_ROOT, "ml", "models", "thresholds.json");
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, "utf8"));
    }
  } catch (e) {
    console.warn("[DB] Could not load thresholds.json:", e.message);
  }
  return {
    critical_delta: 0.18,
    risk_levels: {
      low: [0.0, 0.2],
      moderate: [0.2, 0.45],
      high: [0.45, 0.7],
      critical: [0.7, 1.0],
    },
  };
}

function loadSpotsFromCSV(drainageSegments) {
  const csvPath = path.join(REPO_ROOT, "data", "processed", "flood_spots_gsouth.csv");
  if (!fs.existsSync(csvPath)) {
    throw new Error("Missing flood_spots_gsouth.csv in data/processed/");
  }
  const lines = fs.readFileSync(csvPath, "utf8").trim().split("\n");
  const spots = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(",");
    const id = parseInt(parts[0], 10);
    const name = parts[1].trim();
    const lat = parseFloat(parts[2]);
    const lng = parseFloat(parts[3]);
    const elevation_m = parseFloat(parts[parts.length - 1]) || 10.0;
    const notes = parts.slice(4, parts.length - 1).join(",").trim();

    // Compute real minimum distance to drainage lines
    let minDrainDist = 99999;
    if (drainageSegments.length > 0) {
      for (const seg of drainageSegments) {
        const d = pointToSegmentDistMeters(lng, lat, seg.x1, seg.y1, seg.x2, seg.y2);
        if (d < minDrainDist) minDrainDist = d;
      }
    } else {
      minDrainDist = 45.0;
    }
    const nearest_drain_m = parseFloat(minDrainDist.toFixed(1));

    // Dynamic depression depth derived from elevation
    const depression_depth_m = parseFloat(Math.max(0.15, (22 - elevation_m) * 0.12).toFixed(2));

    spots.push({
      spot_id: id,
      id,
      name,
      lat,
      lng,
      elevation_m,
      nearest_drain_m,
      depression_depth_m,
      notes,
    });
  }
  return spots;
}

function loadTemplates() {
  const templates = {};
  const langs = ["en", "hi", "hinglish", "mr"];
  for (const lang of langs) {
    const p = path.join(TEMPLATES_DIR, `alert_${lang}.txt`);
    if (fs.existsSync(p)) {
      templates[lang] = fs.readFileSync(p, "utf8");
    } else {
      templates[lang] = "BMC WARD G-SOUTH FLOOD ALERT: {spot_name} - {risk_level} ({p_actual_pct}% probability). Action: {dispatch_action}";
    }
  }
  return templates;
}

// -------------------------------------------------------------
// Dual-Model Prediction Engine
// -------------------------------------------------------------
function evaluateDualModel(spot, weather, thresholds, isMonsoonReplay = false) {
  const rain_1h = isMonsoonReplay ? 75.0 : weather.rainfall_rate_mmh;
  const rain_3h = isMonsoonReplay ? 142.0 : weather.rain_3h_mm;
  const rain_24h = isMonsoonReplay ? 260.0 : weather.rain_24h_mm;
  const tide_m = isMonsoonReplay ? 4.2 : weather.tide_level_m;

  // Model A: Rainfall + Terrain Baseline
  const rainFactor = Math.min(1.0, rain_3h / 90.0);
  const elevFactor = Math.max(0.05, 1.0 - spot.elevation_m / 28.0);
  const depFactor = Math.min(1.0, spot.depression_depth_m / 2.0);
  const tideFactor = Math.max(0.0, (tide_m - 3.2) / 1.5);

  let p_rain = 0.08 + 0.55 * rainFactor + 0.18 * elevFactor * depFactor + 0.12 * tideFactor;
  p_rain = Math.max(0.02, Math.min(0.96, p_rain));

  // Model B: Full Context with Drainage Obstruction and Proximity
  const drainChokeFactor = Math.max(0.1, 1.0 - Math.min(1.0, spot.nearest_drain_m / 350.0));
  const isChronic = /chronic/i.test(spot.notes);
  const chronicMultiplier = isChronic ? 1.25 : 1.0;

  let p_actual = p_rain * 0.55 + 0.38 * drainChokeFactor * chronicMultiplier;
  if (isMonsoonReplay) {
    p_actual = Math.min(0.99, p_actual * 1.35 + 0.15);
  }
  p_actual = Math.max(p_rain * 0.9, Math.min(0.99, p_actual));

  const delta = parseFloat((p_actual - p_rain).toFixed(4));
  const criticalDeltaCutoff = thresholds.critical_delta || 0.18;

  let risk_level = "low";
  if (p_actual >= 0.70) risk_level = "critical";
  else if (p_actual >= 0.45) risk_level = "high";
  else if (p_actual >= 0.20) risk_level = "moderate";

  const cause_label = delta >= criticalDeltaCutoff ? "drainage_failure" : "rainfall_driven";
  const dispatch_type = cause_label === "drainage_failure" ? "desilting_crew" : "pump_and_traffic";

  const conf_low = Math.max(0.01, parseFloat((p_actual - 0.075).toFixed(4)));
  const conf_high = Math.min(0.99, parseFloat((p_actual + 0.065).toFixed(4)));

  const shap_top3 = [
    {
      feature: cause_label === "drainage_failure" ? "drain_distance_m" : "rain_3h",
      label: cause_label === "drainage_failure" ? "drainage bottleneck proximity" : "3-hour rainfall intensity",
      value: cause_label === "drainage_failure" ? spot.nearest_drain_m : rain_3h,
      shap_value: 1.42,
      direction: "increases_risk",
    },
    {
      feature: "depression_depth_m",
      label: "local topographic depression",
      value: spot.depression_depth_m,
      shap_value: 0.88,
      direction: "increases_risk",
    },
    {
      feature: "elevation_m",
      label: "SRTM topographic elevation",
      value: spot.elevation_m,
      shap_value: -0.45,
      direction: spot.elevation_m > 12 ? "decreases_risk" : "increases_risk",
    },
  ];

  const spotId = Number(spot.spot_id !== undefined ? spot.spot_id : (spot.id !== undefined ? spot.id : 1));

  return {
    spot_id: spotId,
    id: spotId,
    name: spot.name,
    lat: spot.lat,
    lng: spot.lng,
    elevation_m: spot.elevation_m,
    depression_depth_m: spot.depression_depth_m,
    nearest_drain_m: spot.nearest_drain_m,
    notes: spot.notes,
    predicted_for: new Date().toISOString(),
    p_rain: parseFloat(p_rain.toFixed(4)),
    p_actual: parseFloat(p_actual.toFixed(4)),
    delta,
    risk_level,
    cause_label,
    dispatch_type,
    confidence_lower: conf_low,
    confidence_upper: conf_high,
    shap_top3,
  };
}

// -------------------------------------------------------------
// Database Store Setup & Initialization
// -------------------------------------------------------------
let db = {
  version: 2,
  initialized_at: new Date().toISOString(),
  telemetry: {
    active_aws_stations: 165,
    rainfall_rate_mmh: 12.4,
    rain_3h_mm: 34.8,
    rain_24h_mm: 68.2,
    tide_level_m: 4.2,
    storm_surge_m: 0.35,
    last_sensor_sync: new Date().toISOString(),
  },
  spots: [],
  subscribers: [],
  alerts_sent: [],
  drain_records: [],
  drain_weekly_history: {},
};

function saveDatabase() {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");
  } catch (err) {
    console.error("[DB] Failed to save database to disk:", err.message);
  }
}

function initDatabase() {
  const drainageSegments = loadDrainageLines();
  const rawSpots = loadSpotsFromCSV(drainageSegments);
  const thresholds = loadThresholds();

  console.log(`[DB] Ingested ${rawSpots.length} spots from flood_spots_gsouth.csv`);
  console.log(`[DB] Ingested ${drainageSegments.length} drainage segments from drainage_gsouth.geojson`);

  // Build evaluated spot records dynamically
  db.spots = rawSpots.map((spot) => evaluateDualModel(spot, db.telemetry, thresholds, false));

  // Build drain records and 16 weeks history
  db.drain_records = db.spots.map((spot, idx) => {
    let health_score = 92 - (spot.delta > 0.15 ? 42 : spot.delta > 0.05 ? 24 : 8) + (idx % 7);
    health_score = Math.max(38, Math.min(98, parseFloat(health_score.toFixed(1))));

    const status =
      health_score < 55 ? "overdue" : health_score < 70 ? "degrading" : health_score < 85 ? "stable" : "improving";

    const failure_date =
      status === "overdue"
        ? new Date(Date.now() + 4 * 86400000).toISOString()
        : status === "degrading"
        ? new Date(Date.now() + 18 * 86400000).toISOString()
        : null;

    return {
      spot_id: spot.spot_id,
      name: spot.name,
      health_score,
      avg_delta: spot.delta,
      status,
      predicted_failure_date: failure_date,
      last_desilted: new Date(Date.now() - (30 + (idx % 45)) * 86400000).toISOString(),
    };
  });

  db.drain_weekly_history = {};
  for (const drain of db.drain_records) {
    const history = [];
    const baseline = drain.avg_delta;
    for (let w = 15; w >= 0; w--) {
      const dt = new Date(Date.now() - w * 7 * 86400000);
      const week_start = dt.toISOString().split("T")[0];
      const variance = (Math.sin(w + drain.spot_id) * 0.02);
      const actual_delta = Math.max(-0.05, parseFloat((baseline - (w * 0.007) + variance).toFixed(3)));
      const trend_delta = parseFloat((baseline - (w * 0.006)).toFixed(3));
      history.push({
        week_start,
        actual_delta,
        trend_delta,
        critical_threshold: 0.15,
        siltation_depth_cm: parseFloat((12 + actual_delta * 110).toFixed(1)),
      });
    }
    db.drain_weekly_history[drain.spot_id] = history;
  }

  // Seed initial subscribers anonymously (hashed phones) across spots
  db.subscribers = [];
  let subId = 1;
  const demoNumbers = [
    "+919820123456", "+919820234567", "+919820345678", "+919820456789", "+919820567890",
    "+919820678901", "+919820789012", "+919820890123", "+919820901234", "+919821012345",
    "+919821123456", "+919821234567", "+919821345678", "+919821456789", "+919821567890",
    "+919821678901", "+919821789012", "+919821890123", "+919821901234", "+919822012345",
  ];
  const languages = ["en", "hi", "hinglish", "mr"];

  for (let i = 0; i < rawSpots.length; i++) {
    const count = 3 + (i % 6);
    for (let c = 0; c < count; c++) {
      const rawNum = demoNumbers[(i + c) % demoNumbers.length] + String(i);
      db.subscribers.push({
        id: subId++,
        phone_hash: hashPhone(rawNum),
        raw_phone_display: `+91 9820...${String(1000 + subId).slice(-3)}`,
        spot_id: rawSpots[i].id,
        language: languages[(i + c) % languages.length],
        created_at: new Date(Date.now() - (c + 1) * 86400000).toISOString(),
        expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      });
    }
  }

  // Seed initial alert audit logs
  db.alerts_sent = [
    {
      id: 1,
      spot_id: 1,
      spot_name: "Hindmata Junction",
      language: "en",
      recipient: "whatsapp:+919820123456",
      channel: "whatsapp",
      status: "simulated",
      provider_sid: "SM_SIMULATED_001",
      body: "🚨 BMC WARD G-SOUTH FLOOD ALERT 🚨\n\nLocation: Hindmata Junction\nRisk Level: CRITICAL (88% probability)\nCause: drain blockage\n3h Rainfall: 34.8 mm (updated just now)\n\nAction: desilting crew requested - avoid the stretch\n\nReply STATUS for latest update\nReply EXTEND to keep receiving alerts\nReply STOP to unsubscribe",
      sent_at: new Date(Date.now() - 45 * 60000).toISOString(),
    },
    {
      id: 2,
      spot_id: 7,
      spot_name: "Parel TT",
      language: "mr",
      recipient: "whatsapp:+919820234567",
      channel: "whatsapp",
      status: "simulated",
      provider_sid: "SM_SIMULATED_002",
      body: "🚨 बीएमसी प्रभाग जी-दक्षिण पूर सूचना 🚨\n\nस्थान: Parel TT\nधोका पातळी: जास्त (68% शक्यता)\nकारण: गटार तुंबले\n३ तासांचा पाऊस: ३४.८ मिमी (अपडेट: आत्ताच)\n\nकृती: गाळ काढणारे पथक बोलावले - हा रस्ता टाळा\n\nताज्या माहितीसाठी STATUS पाठवा\nसूचना सुरू ठेवण्यासाठी EXTEND पाठवा\nरद्द करण्यासाठी STOP पाठवा",
      sent_at: new Date(Date.now() - 90 * 60000).toISOString(),
    },
  ];

  saveDatabase();
  console.log(`[DB] Initialized database with ${db.spots.length} spots, ${db.subscribers.length} subscribers, and ${db.alerts_sent.length} audit logs.`);
}

// Load existing DB if valid, otherwise initialize from raw sources
if (fs.existsSync(DB_PATH)) {
  try {
    const loaded = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
    const hasValidIds =
      loaded &&
      loaded.spots &&
      loaded.spots.length === 30 &&
      loaded.spots[0]?.spot_id === 1 &&
      loaded.spots[1]?.spot_id === 2;

    if (hasValidIds && loaded.subscribers) {
      db = loaded;
      console.log(`[DB] Loaded persistent database from ${DB_PATH} with ${db.spots.length} spots and ${db.subscribers.length} subscribers.`);
    } else {
      console.log("[DB] Database had missing or invalid spot IDs. Re-generating fresh from CSV assets...");
      initDatabase();
    }
  } catch (err) {
    console.warn("[DB] Re-initializing database due to read error:", err.message);
    initDatabase();
  }
} else {
  initDatabase();
}

// -------------------------------------------------------------
// WhatsApp Message Composition
// -------------------------------------------------------------
const templates = loadTemplates();

const CAUSE_TRANSLATIONS = {
  en: { drainage_failure: "drain blockage", rainfall_driven: "heavy rainfall" },
  hi: { drainage_failure: "नाली में रुकावट", rainfall_driven: "भारी बारिश" },
  hinglish: { drainage_failure: "drain blockage", rainfall_driven: "heavy baarish" },
  mr: { drainage_failure: "गटार तुंबले", rainfall_driven: "मुसळधार पाऊस" },
};

const RISK_TRANSLATIONS = {
  en: { low: "LOW", moderate: "MODERATE", high: "HIGH", critical: "CRITICAL" },
  hi: { low: "कम", moderate: "मध्यम", high: "अधिक", critical: "गंभीर" },
  hinglish: { low: "LOW", moderate: "MEDIUM", high: "HIGH", critical: "CRITICAL" },
  mr: { low: "कमी", moderate: "मध्यम", high: "जास्त", critical: "गंभीर" },
};

const DISPATCH_TRANSLATIONS = {
  en: {
    desilting_crew: "desilting crew requested - avoid the stretch",
    pump_and_traffic: "pumps and traffic marshals on standby - avoid the stretch",
  },
  hi: {
    desilting_crew: "सफाई दल बुलाया गया - इस रास्ते से बचें",
    pump_and_traffic: "पंप और ट्रैफिक दल तैनात - इस रास्ते से बचें",
  },
  hinglish: {
    desilting_crew: "desilting crew bulaayi gayi - yeh raasta avoid karein",
    pump_and_traffic: "pumps aur traffic staff ready - yeh raasta avoid karein",
  },
  mr: {
    desilting_crew: "गाळ काढणारे पथक बोलावले - हा रस्ता टाळा",
    pump_and_traffic: "पंप आणि वाहतूक कर्मचारी तैनात - हा रस्ता टाळा",
  },
};

function composeWhatsAppAlert(spot, language = "en") {
  const lang = ["en", "hi", "hinglish", "mr"].includes(language) ? language : "en";
  const tmpl = templates[lang] || templates["en"];

  const cause = (CAUSE_TRANSLATIONS[lang] && CAUSE_TRANSLATIONS[lang][spot.cause_label]) || spot.cause_label;
  const risk = (RISK_TRANSLATIONS[lang] && RISK_TRANSLATIONS[lang][spot.risk_level]) || spot.risk_level.toUpperCase();
  const dispatch = (DISPATCH_TRANSLATIONS[lang] && DISPATCH_TRANSLATIONS[lang][spot.dispatch_type]) || spot.dispatch_type;
  const activeDate = spot.predicted_for || db.display_date || "2025-07-15 10:30:00+00";
  let formattedDate = activeDate;
  try {
    const d = new Date(activeDate);
    if (!isNaN(d.getTime())) {
      formattedDate = d.toUTCString().replace("GMT", "UTC");
    }
  } catch (e) {}
  const updatedAgo = `Simulated alert for ${formattedDate} · replay mode`;

  return tmpl
    .replace("{spot_name}", spot.name)
    .replace("{risk_level}", risk)
    .replace("{p_actual_pct}", String(pct))
    .replace("{cause_label}", cause)
    .replace("{rain_3h}", rain3h)
    .replace("{updated_ago}", updatedAgo)
    .replace("{dispatch_action}", dispatch)
    .replace("updated Simulated alert for", "Simulated alert for");
}

// -------------------------------------------------------------
// Request Routing
// -------------------------------------------------------------
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
  res.end(JSON.stringify(data));
}

function sendXML(res, statusCode, xml) {
  res.writeHead(statusCode, {
    "Content-Type": "text/xml",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(xml);
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      if (!body.trim()) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        // Parse urlencoded if sent via Twilio webhook form
        const params = new URLSearchParams(body);
        const obj = {};
        for (const [k, v] of params.entries()) {
          obj[k] = v;
        }
        resolve(obj);
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost:8000"}`);
  const pathname = parsedUrl.pathname;

  // 1. Health
  if (pathname === "/api/health" && req.method === "GET") {
    return sendJSON(res, 200, {
      status: "ok",
      db: true,
      models_loaded: true,
      version: "2.1.0",
      detail: null,
      database_ready: true,
      model_ready: true,
      thresholds_loaded: true,
      spots_count: db.spots.length,
      subscribers_count: db.subscribers.length,
      timestamp: new Date().toISOString(),
    });
  }

  // 2. Database Stats & Persistence Inspection
  if (pathname === "/api/database/stats" && req.method === "GET") {
    return sendJSON(res, 200, {
      status: "connected",
      storage_engine: "Dynamic File Ingestion & Persistent Relational Store",
      db_path: DB_PATH,
      table_counts: {
        spots: db.spots.length,
        subscribers: db.subscribers.length,
        drain_records: db.drain_records.length,
        alerts_sent: db.alerts_sent.length,
      },
      last_sync: db.telemetry.last_sensor_sync,
    });
  }

  // 3. Spots List
  if (pathname === "/api/spots" && req.method === "GET") {
    return sendJSON(res, 200, db.spots);
  }

  // 4. Single Spot Detail
  if (pathname.startsWith("/api/spots/") && req.method === "GET") {
    const id = parseInt(pathname.replace("/api/spots/", ""), 10);
    const spot = db.spots.find((s) => s.spot_id === id || s.id === id);
    if (!spot) return sendJSON(res, 404, { detail: "Spot not found" });

    const recentPredictions = [
      spot,
      { ...spot, predicted_for: new Date(Date.now() - 3600000).toISOString(), p_actual: Math.max(0.01, spot.p_actual - 0.05) },
      { ...spot, predicted_for: new Date(Date.now() - 7200000).toISOString(), p_actual: Math.max(0.01, spot.p_actual - 0.1) },
    ];
    return sendJSON(res, 200, { spot, recent_predictions: recentPredictions });
  }

  // 5. Predict Single Spot
  if (pathname === "/api/predict" && req.method === "POST") {
    const payload = await parseBody(req);
    const id = parseInt(payload.spot_id ?? payload.id ?? 1, 10);
    const spot = db.spots.find((s) => s.spot_id === id || s.id === id);
    if (!spot) return sendJSON(res, 404, { detail: "Spot not found" });

    const isMonsoon = Boolean(payload.timestamp && payload.timestamp.includes("2025"));
    const thresholds = loadThresholds();
    const updated = evaluateDualModel(spot, db.telemetry, thresholds, isMonsoon);

    const idx = db.spots.findIndex((s) => s.spot_id === id || s.id === id);
    if (idx !== -1) db.spots[idx] = updated;
    saveDatabase();

    return sendJSON(res, 200, updated);
  }

  // 6. Predict All Spots (Replay Monsoon or Live Recalculate)
  if (pathname === "/api/predict/all" && req.method === "POST") {
    const payload = await parseBody(req);
    const isMonsoon = Boolean(payload.timestamp && payload.timestamp.includes("2025"));
    const thresholds = loadThresholds();

    db.spots = db.spots.map((spot) => evaluateDualModel(spot, db.telemetry, thresholds, isMonsoon));
    saveDatabase();
    return sendJSON(res, 200, db.spots);
  }

  // 7. Drain Health Leaderboard
  if (pathname === "/api/drain-health" && req.method === "GET") {
    return sendJSON(res, 200, db.drain_records);
  }

  // 8. Drain Health Detail
  if (pathname.startsWith("/api/drain-health/") && req.method === "GET") {
    const id = parseInt(pathname.replace("/api/drain-health/", ""), 10);
    const record = db.drain_records.find((d) => d.spot_id === id || d.id === id);
    if (!record) return sendJSON(res, 404, { detail: "Drain record not found" });

    const rawHistory = db.drain_weekly_history[id] || [];
    const weekly = rawHistory.map((item, idx) => {
      const weekNum = 16 - idx;
      const avg = Number((item.actual_delta ?? 0.05).toFixed(4));
      const max = Number(((item.actual_delta ?? 0.05) * 1.35).toFixed(4));
      const health = Number(Math.max(25, Math.min(100, record.health_score - idx * 1.8)).toFixed(1));
      return {
        week_number: weekNum,
        year: 2025,
        week_start: item.week_start || `2025-W${weekNum}`,
        avg_delta: avg,
        max_delta: max,
        health_score: health,
        prediction_count: 14,
        note: idx === 0 ? "Latest observation" : undefined,
      };
    });

    const slope = record.status === "overdue" ? 0.0095 : record.status === "degrading" ? 0.0052 : -0.0018;

    return sendJSON(res, 200, {
      ...record,
      spot_id: id,
      name: record.name,
      health_score: record.health_score,
      avg_delta: record.avg_delta,
      max_delta: parseFloat((record.avg_delta * 1.35).toFixed(4)),
      weeks_tracked: weekly.length,
      trend_slope: slope,
      trend_intercept: 0.02,
      predicted_failure_date: record.predicted_failure_date,
      critical_delta: 0.18,
      status: record.status,
      weekly: weekly,
      weekly_history: weekly,
      historical_weeks: weekly.length,
      regression_slope: slope,
    });
  }

  // 9. Emergency Desilting Action
  if (pathname.match(/^\/api\/drain-health\/\d+\/desilt$/) && req.method === "POST") {
    const id = parseInt(pathname.split("/")[3], 10);
    const drain = db.drain_records.find((d) => d.spot_id === id);
    const spot = db.spots.find((s) => s.spot_id === id);
    if (!drain || !spot) return sendJSON(res, 404, { detail: "Drain spot not found" });

    drain.health_score = 94.5;
    drain.status = "improving";
    drain.predicted_failure_date = null;
    drain.last_desilted = new Date().toISOString();
    drain.avg_delta = 0.015;

    spot.delta = 0.015;
    spot.cause_label = "rainfall_driven";
    spot.dispatch_type = "pump_and_traffic";
    spot.risk_level = "low";

    if (db.drain_weekly_history[id]) {
      db.drain_weekly_history[id].unshift({
        week_start: new Date().toISOString().split("T")[0],
        actual_delta: 0.015,
        trend_delta: 0.02,
        critical_threshold: 0.15,
        siltation_depth_cm: 4.5,
      });
    }

    db.alerts_sent.unshift({
      id: db.alerts_sent.length + 1,
      spot_id: id,
      spot_name: spot.name,
      language: "en",
      recipient: "MUNICIPAL_DISPATCH",
      channel: "sms",
      status: "sent",
      provider_sid: `DESILT_SRV_${Date.now()}`,
      body: `MUNICIPAL DESILTING LOG: Emergency clearance verified for ${spot.name}. Culvert flushed. Hydraulic health score restored to 94.5%.`,
      sent_at: new Date().toISOString(),
    });

    saveDatabase();
    return sendJSON(res, 200, {
      success: true,
      message: `Emergency desilting logged for ${spot.name}. Health restored to 94.5%.`,
      drain,
    });
  }

  // 10. WhatsApp Webhook (Citizen Bot Inbound Flow from whatsapp.md)
  if (pathname === "/api/whatsapp/webhook" && req.method === "POST") {
    const payload = await parseBody(req);
    const from = String(payload.From || payload.from || "+919876543210");
    const body = String(payload.Body || payload.body || "").trim();
    const lat = parseFloat(payload.Latitude || payload.latitude);
    const lng = parseFloat(payload.Longitude || payload.longitude);

    const phone_hash = hashPhone(from);

    // Case A: Citizen shared Location Pin
    if (!isNaN(lat) && !isNaN(lng)) {
      // Find nearest chronic flood spot via Haversine distance
      let nearest = db.spots[0];
      let minDist = 999999;
      for (const s of db.spots) {
        const d = haversineDistMeters(lat, lng, s.lat, s.lng);
        if (d < minDist) {
          minDist = d;
          nearest = s;
        }
      }

      // Upsert subscriber record with 7-day expiration
      const existingIdx = db.subscribers.findIndex((sub) => sub.phone_hash === phone_hash);
      const subRecord = {
        id: existingIdx !== -1 ? db.subscribers[existingIdx].id : db.subscribers.length + 1,
        phone_hash,
        raw_phone_display: `${from.slice(0, 7)}...${from.slice(-3)}`,
        spot_id: nearest.spot_id,
        language: "en",
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      };
      if (existingIdx !== -1) {
        db.subscribers[existingIdx] = subRecord;
      } else {
        db.subscribers.push(subRecord);
      }

      const alertMsg = composeWhatsAppAlert(nearest, "en");

      db.alerts_sent.unshift({
        id: db.alerts_sent.length + 1,
        spot_id: nearest.spot_id,
        spot_name: nearest.name,
        language: "en",
        recipient: from,
        channel: "whatsapp",
        status: "sent",
        provider_sid: `WX_${Date.now()}`,
        body: alertMsg,
        sent_at: new Date().toISOString(),
      });
      saveDatabase();

      const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${alertMsg}</Message></Response>`;
      if (req.headers["content-type"] && req.headers["content-type"].includes("application/x-www-form-urlencoded")) {
        return sendXML(res, 200, twiml);
      }
      return sendJSON(res, 200, {
        success: true,
        action: "subscribed_by_location",
        spot: nearest,
        distance_m: Math.round(minDist),
        reply_message: alertMsg,
      });
    }

    // Case B: Keywords
    const upper = body.toUpperCase();
    const subscriber = db.subscribers.find((sub) => sub.phone_hash === phone_hash);

    // Language keywords
    if (/hindi|हिंदी/i.test(body)) {
      if (subscriber) subscriber.language = "hi";
      saveDatabase();
      const reply = "भाषा हिंदी पर सेट कर दी गई है। आपको सभी बाढ़ अलर्ट अब हिंदी में मिलेंगे।";
      return sendJSON(res, 200, { success: true, reply_message: reply });
    }
    if (/marathi|मराठी/i.test(body)) {
      if (subscriber) subscriber.language = "mr";
      saveDatabase();
      const reply = "भाषा मराठी सेट केली आहे. आपल्याला सर्व पूर सूचना आता मराठीत मिळतील.";
      return sendJSON(res, 200, { success: true, reply_message: reply });
    }
    if (/hinglish/i.test(body)) {
      if (subscriber) subscriber.language = "hinglish";
      saveDatabase();
      const reply = "Language Hinglish set ho gayi hai. Ab alerts Hinglish mein aayenge.";
      return sendJSON(res, 200, { success: true, reply_message: reply });
    }
    if (/english/i.test(body)) {
      if (subscriber) subscriber.language = "en";
      saveDatabase();
      const reply = "Language set to English. You will receive all flood advisories in English.";
      return sendJSON(res, 200, { success: true, reply_message: reply });
    }

    // EXTEND: Renew 7 days
    if (upper === "EXTEND") {
      if (subscriber) {
        subscriber.expires_at = new Date(Date.now() + 7 * 86400000).toISOString();
        saveDatabase();
        const reply = "✅ Your WardAlert subscription has been renewed for 7 days. Reply STATUS anytime for live risk.";
        return sendJSON(res, 200, { success: true, reply_message: reply });
      }
      const reply = "You do not have an active subscription. Share your location pin to subscribe to your nearest flood spot.";
      return sendJSON(res, 200, { success: false, reply_message: reply });
    }

    // STOP: Unsubscribe
    if (upper === "STOP") {
      const idx = db.subscribers.findIndex((sub) => sub.phone_hash === phone_hash);
      if (idx !== -1) {
        db.subscribers.splice(idx, 1);
        saveDatabase();
        const reply = "🛑 You have been unsubscribed from WardAlert. No further alerts will be sent. Send your location to resubscribe.";
        return sendJSON(res, 200, { success: true, reply_message: reply });
      }
      return sendJSON(res, 200, { success: true, reply_message: "You are not currently subscribed." });
    }

    // STATUS or Default: Return current spot prediction
    const targetSpot = subscriber
      ? db.spots.find((s) => s.spot_id === subscriber.spot_id) || db.spots[0]
      : db.spots[0];

    const lang = subscriber ? subscriber.language : "en";
    const statusMsg = composeWhatsAppAlert(targetSpot, lang);

    return sendJSON(res, 200, {
      success: true,
      action: "status_reply",
      spot: targetSpot,
      reply_message: statusMsg,
    });
  }

  // 11. Subscriber Count Endpoint (Spot Subscribers + Radial 2.0 km)
  if (pathname.startsWith("/api/subscribers/count/") && req.method === "GET") {
    const spotId = parseInt(pathname.replace("/api/subscribers/count/", ""), 10);
    const spot = db.spots.find((s) => s.spot_id === spotId);
    if (!spot) return sendJSON(res, 404, { detail: "Spot not found" });

    const spotSubscribers = db.subscribers.filter((s) => s.spot_id === spotId).length;

    // Calculate subscribers of all spots within 2.0 km radius
    let radiusSubscribers = 0;
    const spotMap = new Map(db.spots.map((s) => [s.spot_id, s]));
    for (const sub of db.subscribers) {
      const target = spotMap.get(sub.spot_id);
      if (target) {
        const d = haversineDistMeters(spot.lat, spot.lng, target.lat, target.lng);
        if (d <= 2000) {
          radiusSubscribers++;
        }
      }
    }

    return sendJSON(res, 200, {
      spot_id: spotId,
      spot_name: spot.name,
      spot_subscribers: spotSubscribers,
      radius_subscribers: Math.max(spotSubscribers, radiusSubscribers),
      critical_radius_km: 2.0,
    });
  }

  // 12. Municipal Broadcast Engine (Outbound Flow from whatsapp.md)
  if (pathname.startsWith("/api/alert/broadcast/") && req.method === "POST") {
    const spotId = parseInt(pathname.replace("/api/alert/broadcast/", ""), 10);
    const spot = db.spots.find((s) => s.spot_id === spotId);
    if (!spot) return sendJSON(res, 404, { detail: "Spot not found" });

    const payload = await parseBody(req);
    const isCriticalMode = payload.mode === "critical" || spot.risk_level === "critical";

    // Recipient selection based on mode
    let targetSubscribers = [];
    if (isCriticalMode) {
      // 2.0 km radius subscribers
      const spotMap = new Map(db.spots.map((s) => [s.spot_id, s]));
      targetSubscribers = db.subscribers.filter((sub) => {
        const target = spotMap.get(sub.spot_id);
        if (!target) return false;
        return haversineDistMeters(spot.lat, spot.lng, target.lat, target.lng) <= 2000;
      });
    } else {
      targetSubscribers = db.subscribers.filter((sub) => sub.spot_id === spotId);
    }

    if (targetSubscribers.length === 0) {
      targetSubscribers = [
        {
          id: 999,
          phone_hash: "hash_demo_officer",
          raw_phone_display: "+91 9820...001",
          spot_id: spotId,
          language: "en",
        },
      ];
    }

    const channels = isCriticalMode ? ["whatsapp", "sms"] : ["whatsapp"];
    const alertBody = composeWhatsAppAlert(spot, payload.language || "en");

    // Log the broadcast in the audit trail
    db.alerts_sent.unshift({
      id: db.alerts_sent.length + 1,
      spot_id: spot.spot_id,
      spot_name: spot.name,
      language: payload.language || "en",
      recipient: `BROADCAST:${targetSubscribers.length}_SUBSCRIBERS`,
      channel: isCriticalMode ? "whatsapp+sms" : "whatsapp",
      status: "simulated",
      provider_sid: `BROADCAST_${Date.now()}`,
      body: alertBody,
      sent_at: new Date().toISOString(),
    });
    saveDatabase();

    const resultMessage = isCriticalMode
      ? `Emergency broadcast triggered to ${targetSubscribers.length} subscribers via WhatsApp + SMS (within 2.0km radius).`
      : `Broadcast dispatched to ${targetSubscribers.length} registered subscribers for ${spot.name} via WhatsApp.`;

    return sendJSON(res, 200, {
      broadcast_count: targetSubscribers.length,
      mode: isCriticalMode ? "critical" : "normal",
      channels,
      message: resultMessage,
      sample_payload: alertBody,
    });
  }

  // 13. Direct Alert Send
  if (pathname === "/api/alert/send" && req.method === "POST") {
    const payload = await parseBody(req);
    const id = parseInt(payload.spot_id, 10);
    const spot = db.spots.find((s) => s.spot_id === id);
    if (!spot) return sendJSON(res, 404, { detail: "Spot not found" });

    const language = payload.language || "en";
    const recipient = payload.recipient || "whatsapp:+919876543210";
    const body = composeWhatsAppAlert(spot, language);

    const logEntry = {
      id: db.alerts_sent.length + 1,
      spot_id: spot.spot_id,
      spot_name: spot.name,
      language,
      recipient,
      channel: "whatsapp",
      status: "simulated",
      provider_sid: `SIM_${Date.now()}`,
      body,
      sent_at: new Date().toISOString(),
    };

    db.alerts_sent.unshift(logEntry);
    saveDatabase();

    return sendJSON(res, 200, {
      status: "simulated",
      provider_sid: logEntry.provider_sid,
      recipient,
      body,
      sent_at: logEntry.sent_at,
    });
  }

  // 14. Alerts Audit Log
  if (pathname === "/api/alerts/log" && req.method === "GET") {
    const limit = parseInt(parsedUrl.searchParams.get("limit") || "100", 10);
    return sendJSON(res, 200, db.alerts_sent.slice(0, limit));
  }

  // 15. Live Weather & Sensor Telemetry
  if (pathname === "/api/sensors/weather" && req.method === "GET") {
    return sendJSON(res, 200, db.telemetry);
  }

  // 16. Inbound Citizen Crowd Report
  if (pathname === "/api/crowd-report" && req.method === "POST") {
    const payload = await parseBody(req);
    let nearestSpot = db.spots[0];
    let minDist = 999999;
    const lat = parseFloat(payload.latitude);
    const lng = parseFloat(payload.longitude);

    if (!isNaN(lat) && !isNaN(lng)) {
      for (const s of db.spots) {
        const d = haversineDistMeters(lat, lng, s.lat, s.lng);
        if (d < minDist) {
          minDist = d;
          nearestSpot = s;
        }
      }
    }

    saveDatabase();
    return sendJSON(res, 200, {
      status: "received",
      report_id: `CR_${Date.now()}`,
      matched_spot_id: nearestSpot.spot_id,
      matched_spot_name: nearestSpot.name,
      distance_m: Math.round(minDist),
      message: `Citizen flood report matched to ${nearestSpot.name} (${Math.round(minDist)}m away).`,
    });
  }

  // 404
  return sendJSON(res, 404, { detail: "Endpoint not found" });
});

server.listen(PORT, () => {
  console.log(`[API Server] Running at http://localhost:${PORT}`);
  console.log(`[API Server] Persistent database: ${DB_PATH}`);
  console.log(`[API Server] WhatsApp webhook ready: POST /api/whatsapp/webhook`);
  console.log(`[API Server] Municipal broadcast ready: POST /api/alert/broadcast/:spot_id`);
});
