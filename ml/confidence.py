"""Bayesian credible interval around a predicted probability.

A single XGBoost probability says nothing about how sure the model is, and the
model is trained on 32 real events — small enough that honesty about
uncertainty matters.  We place a Beta posterior on the probability:

    alpha = prior_alpha + p * strength
    beta  = prior_beta  + (1 - p) * strength

where `strength` (Config.CONFIDENCE_STRENGTH) is the effective sample size the
prediction is worth.  The interval is the central CONFIDENCE_LEVEL mass of that
posterior, so a prediction near 0.5 gets a visibly wider band than one near the
extremes — which is exactly the behaviour an operator should see.
"""
from __future__ import annotations

from scipy.stats import beta as beta_dist

from config import Config


def credible_interval(
    p: float,
    strength: float | None = None,
    level: float | None = None,
) -> tuple[float, float]:
    """(lower, upper) bounds of the central credible interval for `p`."""
    strength = Config.CONFIDENCE_STRENGTH if strength is None else strength
    level = Config.CONFIDENCE_LEVEL if level is None else level

    p = min(max(float(p), 0.0), 1.0)
    alpha = Config.CONFIDENCE_PRIOR_ALPHA + p * strength
    beta_param = Config.CONFIDENCE_PRIOR_BETA + (1.0 - p) * strength

    tail = (1.0 - level) / 2.0
    lower = float(beta_dist.ppf(tail, alpha, beta_param))
    upper = float(beta_dist.ppf(1.0 - tail, alpha, beta_param))
    return round(lower, 4), round(upper, 4)


def interval_width(p: float) -> float:
    lower, upper = credible_interval(p)
    return round(upper - lower, 4)
