"""Derive the per-spot terrain and drainage features the models consume.

Two things are computed here rather than read from a file, because neither
exists in the source CSV:

  nearest_drain_m     PostGIS distance from the spot to the closest OSM
                      drainage segment, measured in EPSG:32643 (UTM 43N) so
                      the answer is in metres rather than degrees.

  depression_depth_m  How far the spot sits below the surrounding terrain,
                      read off the SRTM 30m tile: the elevation of the spot
                      subtracted from a high quantile of the elevations within
                      DEPRESSION_RADIUS_M.  A bowl that water drains into has a
                      large value; a spot on a local high point has ~0.  This is
                      the physical reason a place ponds, so the model needs it
                      alongside raw elevation.
"""
from __future__ import annotations

import math

import numpy as np

from config import Config
from data_loader.db import cursor

# Quantile of the neighbourhood used as the "rim" height of the depression.
# The maximum would be hostage to a single noisy SRTM pixel.
RIM_QUANTILE = 0.9


def compute_nearest_drain() -> int:
    """Fill flood_spots.nearest_drain_m / nearest_drain_id via PostGIS."""
    # The nearest-neighbour search lives in a derived table with its own copy
    # of flood_spots: Postgres does not allow an UPDATE ... FROM LATERAL to
    # reference the row being updated.  Ordering is done on the reprojected
    # distance so the winner is the true metric nearest, not the nearest in
    # degrees (only 54 segments, so the exact scan is cheap).
    with cursor() as cur:
        cur.execute(
            """
            UPDATE flood_spots s
               SET nearest_drain_m  = n.distance_m,
                   nearest_drain_id = n.drain_id,
                   updated_at       = now()
              FROM (
                    SELECT sp.id AS spot_id,
                           nearest.drain_id,
                           nearest.distance_m
                      FROM flood_spots sp
                      CROSS JOIN LATERAL (
                            SELECT d.id AS drain_id,
                                   ST_Distance(
                                       ST_Transform(sp.geom, %(metric)s),
                                       ST_Transform(d.geom, %(metric)s)
                                   ) AS distance_m
                              FROM drainage_segments d
                             ORDER BY distance_m
                             LIMIT 1
                           ) AS nearest
                   ) AS n
             WHERE s.id = n.spot_id
            """,
            {"metric": Config.METRIC_SRID},
        )
        return cur.rowcount


def compute_depression_depth() -> tuple[int, list[str]]:
    """Fill flood_spots.depression_depth_m from the SRTM tile.

    Returns (rows updated, names of spots that fell outside the tile).

    The committed tile is N19E072, covering 19-20 degrees N.  Five G/South
    spots sit just south of 19.0 (Haji Ali, Mahalaxmi Racecourse, Currey Road
    and neighbours) and would need tile N18E072, which is not in the dataset.
    For those we clamp the sampling window to the tile's southern edge and take
    the spot's own SRTM-derived elevation_m from the CSV as the centre height.
    That is an approximation, it is reported by the loader, and it is recorded
    in docs/data_provenance.md -- it is never silently treated as full coverage.
    """
    import rasterio

    with cursor() as cur:
        cur.execute("SELECT id, name, lat, lng, elevation_m FROM flood_spots ORDER BY id")
        spots = cur.fetchall()

    updates: list[tuple[float, int]] = []
    outside: list[str] = []

    with rasterio.open(Config.DEM_FILE) as dem:
        band = dem.read(1)
        height, width = band.shape
        # SRTM voids are encoded as -32768; mask them out of every statistic.
        valid_mask = band > -1000

        for spot_id, name, lat, lng, csv_elevation in spots:
            row, col = dem.index(lng, lat)
            in_tile = 0 <= row < height and 0 <= col < width
            if not in_tile:
                outside.append(name)

            # Convert the search radius from metres to pixels. SRTM is gridded
            # in degrees, so a degree of longitude shrinks with latitude.
            deg_per_m_lat = 1.0 / 111_320.0
            deg_per_m_lng = deg_per_m_lat / max(math.cos(math.radians(lat)), 1e-6)
            rows_radius = max(
                int(round(Config.DEPRESSION_RADIUS_M * deg_per_m_lat / abs(dem.res[1]))), 1
            )
            cols_radius = max(
                int(round(Config.DEPRESSION_RADIUS_M * deg_per_m_lng / abs(dem.res[0]))), 1
            )

            # Clamping is what keeps an out-of-tile spot sampling the nearest
            # terrain the tile does contain rather than raising.
            r0, r1 = max(row - rows_radius, 0), min(row + rows_radius + 1, height)
            c0, c1 = max(col - cols_radius, 0), min(col + cols_radius + 1, width)
            if r0 >= r1 or c0 >= c1:
                updates.append((0.0, spot_id))
                continue

            window = band[r0:r1, c0:c1]
            window_valid = window[valid_mask[r0:r1, c0:c1]]
            if window_valid.size == 0:
                updates.append((0.0, spot_id))
                continue

            if in_tile and valid_mask[row, col]:
                centre = float(band[row, col])
            elif csv_elevation is not None:
                centre = float(csv_elevation)
            else:
                centre = float(np.median(window_valid))

            rim = float(np.quantile(window_valid.astype(float), RIM_QUANTILE))
            updates.append((round(max(rim - centre, 0.0), 3), spot_id))

    with cursor() as cur:
        cur.executemany(
            "UPDATE flood_spots SET depression_depth_m = %s, updated_at = now() WHERE id = %s",
            updates,
        )
    return len(updates), outside


def run() -> dict:
    drains = compute_nearest_drain()
    depths, outside = compute_depression_depth()
    if outside:
        print(
            f"  NOTE: {len(outside)} spot(s) lie south of SRTM tile "
            f"{Config.DEM_FILE.name} and used an edge-clamped window: "
            + ", ".join(outside)
        )
    return {"nearest_drain_m": drains, "depression_depth_m": depths, "outside_tile": outside}


if __name__ == "__main__":
    result = run()
    print(f"spatial features: {result}")
    with cursor() as cur:
        cur.execute(
            """
            SELECT ROUND(MIN(nearest_drain_m)::numeric, 1),
                   ROUND(AVG(nearest_drain_m)::numeric, 1),
                   ROUND(MAX(nearest_drain_m)::numeric, 1),
                   ROUND(MIN(depression_depth_m)::numeric, 2),
                   ROUND(AVG(depression_depth_m)::numeric, 2),
                   ROUND(MAX(depression_depth_m)::numeric, 2)
              FROM flood_spots
            """
        )
        dmin, davg, dmax, pmin, pavg, pmax = cur.fetchone()
    print(f"  nearest_drain_m    min={dmin} avg={davg} max={dmax}")
    print(f"  depression_depth_m min={pmin} avg={pavg} max={pmax}")
