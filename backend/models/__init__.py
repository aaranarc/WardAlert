"""SQLAlchemy 2.0 ORM classes, one module per table."""
from backend.models.base import Base
from backend.models.alert_sent import AlertSent
from backend.models.crowd_report import CrowdReport
from backend.models.drain_health_weekly import DrainHealthWeekly
from backend.models.drainage_segment import DrainageSegment
from backend.models.feature_snapshot import FeatureSnapshot
from backend.models.flood_event import FloodEvent
from backend.models.flood_spot import FloodSpot
from backend.models.prediction import Prediction
from backend.models.rainfall_daily import RainfallDaily
from backend.models.subscriber import Subscriber
from backend.models.ward_boundary import WardBoundary

__all__ = [
    "Base",
    "AlertSent",
    "CrowdReport",
    "DrainHealthWeekly",
    "DrainageSegment",
    "FeatureSnapshot",
    "FloodEvent",
    "FloodSpot",
    "Prediction",
    "RainfallDaily",
    "Subscriber",
    "WardBoundary",
]
