"""Idempotent loaders that move the committed public data into PostGIS.

Every loader is safe to re-run: inserts use ON CONFLICT ... DO UPDATE keyed on
the natural key of the source file, so `python -m data_loader.main` can be
executed any number of times without duplicating or losing rows.
"""
