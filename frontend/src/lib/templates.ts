import { SpotRisk } from "./types";

const CAUSE_TEXT: Record<string, Record<string, string>> = {
  en: { drainage_failure: "drain blockage", rainfall_driven: "heavy rainfall" },
  hi: { drainage_failure: "नाली में रुकावट", rainfall_driven: "भारी बारिश" },
  hinglish: { drainage_failure: "drain blockage", rainfall_driven: "heavy baarish" },
  mr: { drainage_failure: "गटार तुंबले", rainfall_driven: "मुसळधार पाऊस" },
};

const RISK_TEXT: Record<string, Record<string, string>> = {
  en: { low: "LOW", moderate: "MODERATE", high: "HIGH", critical: "CRITICAL" },
  hi: { low: "कम", moderate: "मध्यम", high: "अधिक", critical: "गंभीर" },
  hinglish: { low: "LOW", moderate: "MEDIUM", high: "HIGH", critical: "CRITICAL" },
  mr: { low: "कमी", moderate: "मध्यम", high: "जास्त", critical: "गंभीर" },
};

const DISPATCH_TEXT: Record<string, Record<string, string>> = {
  en: {
    desilting_crew: "desilting crew requested — avoid the stretch",
    pump_and_traffic: "pumps and traffic marshals on standby — avoid the stretch",
  },
  hi: {
    desilting_crew: "सफाई दल बुलाया गया — इस रास्ते से बचें",
    pump_and_traffic: "पंप और ट्रैफिक दल तैनात — इस रास्ते से बचें",
  },
  hinglish: {
    desilting_crew: "desilting crew bulaayi gayi — yeh raasta avoid karein",
    pump_and_traffic: "pumps aur traffic staff ready — yeh raasta avoid karein",
  },
  mr: {
    desilting_crew: "गाळ काढणारे पथक बोलावले — हा रस्ता टाळा",
    pump_and_traffic: "पंप आणि वाहतूक कर्मचारी तैनात — हा रस्ता टाळा",
  },
};

export function renderClientPreview(
  lang: "en" | "hi" | "hinglish" | "mr",
  spot: SpotRisk,
  rain3hVal?: number | string | null
): string {
  const risk = spot.risk_level || "low";
  const cause = spot.cause_label || "rainfall_driven";
  const dispatch = spot.dispatch_type || "pump_and_traffic";
  const pActualPct =
    spot.p_actual !== undefined && spot.p_actual !== null
      ? Math.round(spot.p_actual * 100)
      : "—";
  const rain3h =
    rain3hVal !== undefined && rain3hVal !== null
      ? typeof rain3hVal === "number"
        ? rain3hVal.toFixed(1)
        : rain3hVal
      : "—";
  const riskLevelStr = RISK_TEXT[lang]?.[risk] || (typeof risk === "string" ? risk.toUpperCase() : "—");
  const causeStr = CAUSE_TEXT[lang]?.[cause] || cause || "—";
  const dispatchStr = DISPATCH_TEXT[lang]?.[dispatch] || dispatch || "—";
  const updatedAgo =
    lang === "hi"
      ? "अभी"
      : lang === "mr"
      ? "आत्ताच"
      : lang === "hinglish"
      ? "abhi"
      : "just now";

  if (lang === "hi") {
    return `*वॉर्डअलर्ट — ${spot.name}*\n\nबाढ़ का खतरा: *${riskLevelStr}* (${pActualPct}% संभावना)\nकारण: ${causeStr}\nपिछले 3 घंटे की बारिश: ${rain3h} मिमी\n\nकार्रवाई: ${dispatchStr}\n\n${updatedAgo} अपडेट किया गया। बंद करने के लिए STOP भेजें।`;
  }
  if (lang === "mr") {
    return `*वॉर्डअलर्ट — ${spot.name}*\n\nपुराचा धोका: *${riskLevelStr}* (${pActualPct}% शक्यता)\nकारण: ${causeStr}\nमागील ३ तासांचा पाऊस: ${rain3h} मिमी\n\nकृती: ${dispatchStr}\n\n${updatedAgo} अद्ययावत. थांबवण्यासाठी STOP पाठवा.`;
  }
  if (lang === "hinglish") {
    return `*WardAlert — ${spot.name}*\n\nFlooding ka risk: *${riskLevelStr}* (${pActualPct}% chance)\nKya wajah: ${causeStr}\nPichle 3 ghante ki baarish: ${rain3h} mm\n\nKya karna hai: ${dispatchStr}\n\n${updatedAgo} update hua. Band karne ke liye STOP bhejein.`;
  }
  return `*WardAlert — ${spot.name}*\n\nFlood risk: *${riskLevelStr}* (${pActualPct}% chance)\nCause: ${causeStr}\nRain in last 3h: ${rain3h} mm\n\nAction: ${dispatchStr}\n\nUpdated ${updatedAgo}. Reply STOP to unsubscribe.`;
}
