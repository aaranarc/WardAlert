"""Derive every operating threshold from the data. Nothing here is chosen.

Three thresholds come out of this, all written to ml/models/thresholds.json,
which the API reads at startup:

  delta_dispatch   Above this Δ, the flooding is drainage-driven rather than
                   rain-driven, so the right response is a desilting crew, not
                   a pump.  Fitted by Youden's J (max TPR − FPR) against the
                   drain-related label, i.e. the cut that best separates floods
                   at drain-served spots from the rest.

  risk_levels      Quartiles of the test-set P_actual distribution. Quartiles
                   mean a quarter of the ward sits in each band by construction,
                   so "critical" always means "worst quarter right now" rather
                   than a number someone liked.

  critical_delta   The CRITICAL_DELTA_PERCENTILE-th percentile of observed Δ —
                   the drain-failure level that drain_health extrapolates
                   towards to forecast a failure date.  Measured over the
                   predictions table once it has been populated, because that
                   is the population the threshold is applied to; the 48-row
                   test set is only the fallback for the very first run.  See
                   critical_delta_source in the emitted JSON.

    python -m ml.learn_thresholds
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone

import joblib
import numpy as np

from config import Config
from data_loader.db import cursor
from ml.dataset import TARGET, load_frame, split
from ml.metrics import evaluate

RISK_ORDER = ["low", "moderate", "high", "critical"]


def youden_j(scores: np.ndarray, labels: np.ndarray) -> tuple[float, float]:
    """Return (threshold maximising TPR − FPR, the J statistic there).

    Evaluated at every observed score, so the chosen cut is always one the data
    actually produced.
    """
    positives = labels == 1
    negatives = ~positives
    n_pos, n_neg = positives.sum(), negatives.sum()
    if n_pos == 0 or n_neg == 0:
        return float(np.median(scores)), 0.0

    best_threshold, best_j = float(scores.min()), -1.0
    for candidate in np.unique(scores):
        predicted = scores >= candidate
        tpr = float((predicted & positives).sum()) / n_pos
        fpr = float((predicted & negatives).sum()) / n_neg
        j = tpr - fpr
        if j > best_j:
            best_threshold, best_j = float(candidate), float(j)
    return best_threshold, best_j


def _critical_delta(test_delta: np.ndarray) -> tuple[float, str, int]:
    """(value, source, n) for the drain-failure Δ level.

    Prefers the predictions population; falls back to the test set on a cold
    database, where no predictions exist yet.
    """
    with cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM predictions")
        n_predictions = cur.fetchone()[0]
        if n_predictions >= len(test_delta):
            cur.execute(
                "SELECT percentile_cont(%s) WITHIN GROUP (ORDER BY delta) FROM predictions",
                (Config.CRITICAL_DELTA_PERCENTILE / 100.0,),
            )
            value = cur.fetchone()[0]
            if value is not None:
                return float(value), "predictions", int(n_predictions)
    return (
        float(np.percentile(test_delta, Config.CRITICAL_DELTA_PERCENTILE)),
        "test_set",
        int(len(test_delta)),
    )


def learn() -> dict:
    model_a = joblib.load(Config.model_path("a"))
    model_b = joblib.load(Config.model_path("b"))

    frame = load_frame()
    _train_df, test_df = split(frame)

    p_rain = model_a.predict_proba(test_df[Config.MODEL_A_FEATURES])[:, 1]
    p_actual = model_b.predict_proba(test_df[Config.model_b_features()])[:, 1]
    delta = p_actual - p_rain

    # ---- dispatch threshold ------------------------------------------------
    drain_labels = test_df["drain_related"].fillna(False).astype(bool).values.astype(int)
    delta_dispatch, j_statistic = youden_j(delta, drain_labels)

    # ---- risk bands --------------------------------------------------------
    q25, q50, q75 = (float(np.percentile(p_actual, q)) for q in (25, 50, 75))

    # ---- drain-failure level ----------------------------------------------
    # p90 of the test-set Δ is p90 of 48 rows drawn from a different mix than
    # the monsoon-week population drain_health scores. Using it there marked
    # every spot overdue and pinned half the health scores at 0. So once
    # predictions exist, the same percentile is measured over them instead.
    critical_delta, critical_source, critical_n = _critical_delta(delta)

    thresholds = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "n_test": int(len(test_df)),
        "delta_dispatch": round(delta_dispatch, 6),
        "delta_dispatch_method": "Youden's J on Δ vs drain_related",
        "delta_dispatch_j": round(j_statistic, 6),
        "drain_related_positives": int(drain_labels.sum()),
        "risk_levels": {
            "low": [0.0, round(q25, 6)],
            "moderate": [round(q25, 6), round(q50, 6)],
            "high": [round(q50, 6), round(q75, 6)],
            "critical": [round(q75, 6), 1.0],
        },
        "risk_quartiles": {
            "q25": round(q25, 6),
            "q50": round(q50, 6),
            "q75": round(q75, 6),
        },
        "critical_delta": round(critical_delta, 6),
        "critical_delta_percentile": Config.CRITICAL_DELTA_PERCENTILE,
        "critical_delta_source": critical_source,
        "critical_delta_n": critical_n,
        "critical_delta_test_set": round(
            float(np.percentile(delta, Config.CRITICAL_DELTA_PERCENTILE)), 6
        ),
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


def classify_risk(p_actual: float, thresholds: dict) -> str:
    """Map a probability onto a learned risk band."""
    quartiles = thresholds["risk_quartiles"]
    if p_actual < quartiles["q25"]:
        return "low"
    if p_actual < quartiles["q50"]:
        return "moderate"
    if p_actual < quartiles["q75"]:
        return "high"
    return "critical"


def classify_cause(delta: float, thresholds: dict) -> tuple[str, str]:
    """(cause_label, dispatch_type) for a residual.

    This is the decision the ward officer acts on: rainfall the drains were
    never sized for needs pumps and traffic control; a drain that has silted up
    needs a desilting crew.
    """
    if delta >= thresholds["delta_dispatch"]:
        return "drainage_failure", "desilting_crew"
    return "rainfall_driven", "pump_and_traffic"


def main() -> int:
    thresholds = learn()
    print("learned thresholds ->", Config.thresholds_path())
    print(f"  delta_dispatch   {thresholds['delta_dispatch']:.4f}  "
          f"(Youden's J = {thresholds['delta_dispatch_j']:.4f}, "
          f"{thresholds['drain_related_positives']}/{thresholds['n_test']} drain-related)")
    print(f"  critical_delta   {thresholds['critical_delta']:.4f}  "
          f"(p{thresholds['critical_delta_percentile']:.0f} of Δ over "
          f"{thresholds['critical_delta_n']} rows from {thresholds['critical_delta_source']})")
    print("  risk bands")
    for level in RISK_ORDER:
        low, high = thresholds["risk_levels"][level]
        print(f"    {level:<9} {low:.4f} .. {high:.4f}")
    stats = thresholds["delta_stats"]
    print(f"  Δ range          {stats['min']:.4f} .. {stats['max']:.4f} "
          f"(mean {stats['mean']:.4f})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
