"""Uniform test-set scoring for both models."""
from __future__ import annotations

from sklearn.metrics import (
    average_precision_score,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)


def evaluate(y_true, y_prob, threshold: float = 0.5) -> dict:
    y_pred = (y_prob >= threshold).astype(int)
    return {
        "auc": float(roc_auc_score(y_true, y_prob)),
        "average_precision": float(average_precision_score(y_true, y_prob)),
        "precision": float(precision_score(y_true, y_pred, zero_division=0)),
        "recall": float(recall_score(y_true, y_pred, zero_division=0)),
        "f1": float(f1_score(y_true, y_pred, zero_division=0)),
        "threshold": threshold,
        "n_test": int(len(y_true)),
        "n_positive": int(sum(y_true)),
    }


def report(name: str, scores: dict) -> None:
    print(f"\n{name} — test set ({scores['n_test']} rows, {scores['n_positive']} positive)")
    print(f"  AUC              {scores['auc']:.4f}")
    print(f"  Avg precision    {scores['average_precision']:.4f}")
    print(f"  Precision @0.5   {scores['precision']:.4f}")
    print(f"  Recall    @0.5   {scores['recall']:.4f}")
    print(f"  F1        @0.5   {scores['f1']:.4f}")
