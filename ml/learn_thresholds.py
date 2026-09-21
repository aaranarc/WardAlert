"""Record data-derived diagnostics for the trained models.

The operating cuts the dashboard acts on (risk tiers, the cause/dispatch Δ
threshold, and the drain-health slope and critical Δ) are fixed constants in
config.py. The learned versions were quartiles and percentiles of mostly dry
days, so any real rain put every spot in the same tier; fixed cuts keep the
tiers meaningful during a monsoon replay.  This module no longer writes them.

What it still writes to ml/models/thresholds.json: test-set size, the number of
drain-related positives, the Δ distribution, and both models' AUC.

    python -m ml.learn_thresholds
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone

import joblib

from config import Config
from ml.dataset import TARGET, load_frame, split
from ml.metrics import evaluate

RISK_ORDER = ["low", "moderate", "high", "critical"]


def learn() -> dict:
    model_a = joblib.load(Config.model_path("a"))
    model_b = joblib.load(Config.model_path("b"))

    frame = load_frame()
    _train_df, test_df = split(frame)

    p_rain = model_a.predict_proba(test_df[Config.MODEL_A_FEATURES])[:, 1]
    p_actual = model_b.predict_proba(test_df[Config.model_b_features()])[:, 1]
    delta = p_actual - p_rain

    drain_labels = test_df["drain_related"].fillna(False).astype(bool).values.astype(int)

    thresholds = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "n_test": int(len(test_df)),
        "drain_related_positives": int(drain_labels.sum()),
        "delta_stats": {
            "min": round(float(delta.min()), 6),
            "mean": round(float(delta.mean()), 6),
            "max": round(float(delta.max()), 6),
        },
        "model_a_auc": round(evaluate(test_df[TARGET].values, p_rain)["auc"], 6),
        "model_b_auc": round(evaluate(test_df[TARGET].values, p_actual)["auc"], 6),
    }

    Config.MODEL_DIR.mkdir(parents=True, exist_ok=True)
    Config.thresholds_path().write_text(json.dumps(thresholds, indent=2) + "\n")
    return thresholds


def load_thresholds() -> dict:
    path = Config.thresholds_path()
    if not path.exists():
        raise FileNotFoundError(
            f"{path} not found — run `python -m ml.learn_thresholds` after training."
        )
    return json.loads(path.read_text())


def classify_risk(p_actual: float, thresholds: dict | None = None) -> str:
    """Map a probability onto the fixed risk tiers in config.py."""
    if p_actual < Config.RISK_TIER_LOW_MAX:
        return "low"
    if p_actual < Config.RISK_TIER_MODERATE_MAX:
        return "moderate"
    if p_actual < Config.RISK_TIER_HIGH_MAX:
        return "high"
    return "critical"


def classify_cause(delta: float, thresholds: dict | None = None) -> tuple[str, str]:
    """(cause_label, dispatch_type) for a residual.

    This is the decision the ward officer acts on: rainfall the drains were
    never sized for needs pumps and traffic control; a drain that has silted up
    needs a desilting crew.
    """
    if delta >= Config.CAUSE_DELTA_THRESHOLD:
        return "drainage_failure", "desilting_crew"
    return "rainfall_driven", "pump_and_traffic"


def main() -> int:
    thresholds = learn()
    print("learned thresholds ->", Config.thresholds_path())
    print(f"  drain-related    {thresholds['drain_related_positives']}/{thresholds['n_test']}")
    print(f"  AUC              model A {thresholds['model_a_auc']:.3f}, "
          f"model B {thresholds['model_b_auc']:.3f}")
    stats = thresholds["delta_stats"]
    print(f"  Δ range          {stats['min']:.4f} .. {stats['max']:.4f} "
          f"(mean {stats['mean']:.4f})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
