"""Snap an incoming citizen report to the flood spot it belongs to.

A report carries a phone GPS fix, not a spot id, so PostGIS finds the nearest
spot within Config.CROWD_RADIUS_M.  A report outside every radius is still
stored, with a NULL spot_id: it may be a flooding location BMC has not listed,
which is exactly the kind of signal worth keeping.
"""
from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.schemas.crowd_report import CrowdReportCreate
from config import Config

# ST_Transform and ST_SetSRID are overloaded (the SRID argument may be an
# integer or a proj string), so asyncpg cannot infer the parameter type and
# defaults it to text. The CASTs pin it to integer.
# ST_Transform and ST_SetSRID are overloaded (the SRID argument may be an
# integer or a proj string), so asyncpg cannot infer the parameter type and
# defaults it to text. The CASTs pin it to integer.
INSERT_SQL = """
WITH report_point AS (
    SELECT ST_Transform(
               ST_SetSRID(ST_MakePoint(:lng, :lat), CAST(:srid AS integer)),
               CAST(:metric AS integer)
           ) AS geom_metric
),
nearest AS (
    SELECT s.id, s.name,
           ST_Distance(
               (SELECT geom_metric FROM report_point),
               ST_Transform(s.geom, CAST(:metric AS integer))
           ) AS distance_m
      FROM flood_spots s
     WHERE ST_DWithin(
               (SELECT geom_metric FROM report_point),
               ST_Transform(s.geom, CAST(:metric AS integer)),
               CAST(:radius AS double precision)
           )
     ORDER BY distance_m
     LIMIT 1
)
INSERT INTO crowd_reports (
    reported_at, lat, lng, geom, severity, note, language, reporter_ref,
    spot_id, distance_m
)
SELECT COALESCE(:reported_at, now()), :lat, :lng,
       ST_SetSRID(ST_MakePoint(:lng, :lat), CAST(:srid AS integer)),
       :severity, :note, :language, :reporter_ref,
       nearest.id, nearest.distance_m
  FROM (SELECT 1) AS anchor
  LEFT JOIN nearest ON TRUE
RETURNING id, reported_at, lat, lng, severity, note, language,
          spot_id, distance_m
"""


async def create(session: AsyncSession, payload: CrowdReportCreate) -> dict:
    result = await session.execute(
        text(INSERT_SQL),
        {
            "lat": payload.lat,
            "lng": payload.lng,
            "srid": Config.SRID,
            "metric": Config.METRIC_SRID,
            "radius": Config.CROWD_RADIUS_M,
            "severity": payload.severity,
            "note": payload.note,
            "language": payload.language or Config.DEFAULT_LANGUAGE,
            "reporter_ref": payload.reporter_ref,
            "reported_at": payload.reported_at,
        },
    )
    row = dict(result.mappings().one())
    await session.commit()

    spot_name = None
    if row["spot_id"] is not None:
        name_result = await session.execute(
            text("SELECT name FROM flood_spots WHERE id = :spot_id"),
            {"spot_id": row["spot_id"]},
        )
        spot_name = name_result.scalar_one_or_none()

    row["spot_name"] = spot_name
    row["matched"] = row["spot_id"] is not None
    if row["distance_m"] is not None:
        row["distance_m"] = round(float(row["distance_m"]), 2)
    return row


async def recent(session: AsyncSession, hours: int, limit: int) -> list[dict]:
    result = await session.execute(
        text(
            """
            SELECT r.id, r.reported_at, r.lat, r.lng, r.severity, r.note,
                   r.language, r.spot_id, r.distance_m, s.name AS spot_name
              FROM crowd_reports r
              LEFT JOIN flood_spots s ON s.id = r.spot_id
             WHERE r.reported_at > now() - (:hours * INTERVAL '1 hour')
             ORDER BY r.reported_at DESC
             LIMIT :limit
            """
        ),
        {"hours": hours, "limit": limit},
    )
    rows = []
    for row in result.mappings():
        item = dict(row)
        item["matched"] = item["spot_id"] is not None
        if item["distance_m"] is not None:
            item["distance_m"] = round(float(item["distance_m"]), 2)
        rows.append(item)
    return rows
