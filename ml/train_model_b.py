"""Model B — full context.

Model A's features plus drainage distance, seasonal timing, hour of day, and
live crowd signal.  The gap between the two is the product's core claim:

    Δ = P_actual − P_rain

is how much flood risk is *not* explained by rainfall alone — i.e. how much the
drainage is failing to carry away.  Model B must therefore beat Model A; if it
does not, the residual carries no information and the run stops.

    python -m ml.train_model_b
"""
from __future__ import annotations

import json
import sys

import joblib
from xgboost import XGBClassifier

from config import Config
from ml.dataset import TARGET, load_frame, split
from ml.metrics import evaluate, report


def train() -> dict:
    frame = load_frame()
    train_df, test_df = split(frame)
    features = Config.model_b_features()

    model = XGBClassifier(**Config.xgb_params())
    model.fit(train_df[features], train_df[TARGET])

    probabilities = model.predict_proba(test_df[features])[:, 1]
    scores = evaluate(test_df[TARGET].values, probabilities)

    Config.MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, Config.model_path("b"))

    columns_path = Config.feature_columns_path()
    payload = json.loads(columns_path.read_text()) if columns_path.exists() else {}
    payload["model_b"] = features
    columns_path.write_text(json.dumps(payload, indent=2) + "\n")

    return {"scores": scores, "features": features, "n_train": len(train_df)}


def model_a_auc() -> float | None:
    """Score the saved Model A on the identical split, for the comparison."""
    path = Config.model_path("a")
    if not path.exists():
        return None
    model = joblib.load(path)
    _train_df, test_df = split(load_frame())
    probabilities = model.predict_proba(test_df[Config.MODEL_A_FEATURES])[:, 1]
    return evaluate(test_df[TARGET].values, probabilities)["auc"]


def main() -> int:
    result = train()
    report("Model B (full context)", result["scores"])
    print(f"  extra features   {', '.join(Config.MODEL_B_EXTRA_FEATURES)}")
    print(f"  saved            {Config.model_path('b')}")

    auc_a = model_a_auc()
    if auc_a is None:
        print("\nSTOP: ml/models/model_a.joblib not found — run ml.train_model_a first.")
        return 1

    auc_b = result["scores"]["auc"]
    print(f"\n  Model A AUC      {auc_a:.4f}")
    print(f"  Model B AUC      {auc_b:.4f}")
    print(f"  lift             {auc_b - auc_a:+.4f}")

    if auc_b <= auc_a:
        print(
            f"\nSTOP: Model B AUC ({auc_b:.4f}) does not beat Model A ({auc_a:.4f}).\n"
            "Δ = P_actual − P_rain would then be noise, and every downstream\n"
            "threshold, dispatch decision, and drain-health trend built on it\n"
            "would be meaningless. Check, in order:\n"
            "  1. drain_distance_m — is nearest_drain_m populated and varied?\n"
            "     SELECT MIN(nearest_drain_m), AVG(nearest_drain_m),\n"
            "            MAX(nearest_drain_m) FROM flood_spots;\n"
            "  2. monsoon_week — non-zero for the positives?\n"
            "  3. both models must share one split (ml.dataset.split)."
        )
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
