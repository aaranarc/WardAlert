"""Model A — the rain-only baseline.

Deliberately blind to drainage, timing, and crowd signal: it answers "how much
flooding does the rainfall and terrain alone explain?".  Everything Model B
knows beyond this is what produces the residual Δ, so Model A must never be
given a drainage feature.

    python -m ml.train_model_a
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
    features = Config.MODEL_A_FEATURES

    model = XGBClassifier(**Config.xgb_params())
    model.fit(train_df[features], train_df[TARGET])

    probabilities = model.predict_proba(test_df[features])[:, 1]
    scores = evaluate(test_df[TARGET].values, probabilities)

    Config.MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, Config.model_path("a"))

    # Column order is part of the model contract: XGBoost is positional, so a
    # reordered frame at serve time would silently produce nonsense.
    columns_path = Config.feature_columns_path()
    payload = json.loads(columns_path.read_text()) if columns_path.exists() else {}
    payload["model_a"] = features
    columns_path.write_text(json.dumps(payload, indent=2) + "\n")

    return {"scores": scores, "features": features, "n_train": len(train_df)}


def main() -> int:
    result = train()
    report("Model A (rain-only)", result["scores"])
    print(f"  features         {', '.join(result['features'])}")
    print(f"  saved            {Config.model_path('a')}")

    auc = result["scores"]["auc"]
    if auc < Config.MIN_MODEL_A_AUC:
        print(
            f"\nSTOP: Model A AUC {auc:.4f} is below MIN_MODEL_A_AUC "
            f"({Config.MIN_MODEL_A_AUC}).\n"
            "Rain-only features cannot separate the classes. Check, in order:\n"
            "  1. ml.label_matching  — are events attached to the right spots?\n"
            "  2. feature_snapshots  — do positives actually show higher rainfall?\n"
            "     SELECT flooded, AVG(rain_3h), AVG(rain_24h)\n"
            "       FROM feature_snapshots GROUP BY flooded;\n"
            "  3. the negative sampler — NEGATIVE_EXCLUSION_HOURS too small would\n"
            "     put real floods in the negative class."
        )
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
