-- Backfill finish_id (and catalog_line_id) for confirmed finish_swatch assets
-- where finish_id was not set during ingestion.
--
-- Matching priority (first to last):
--   1. parsed_finish_code vs finish code  (e.g. finish-american-white-shaker.png)
--   2. normalized filename vs finish code  (e.g. "american-white-shaker.png")
--   3. normalized filename vs normalized finish name  (e.g. "American White Shaker.png")
--
-- All matches are scoped to catalog_line_id when available on the asset.

UPDATE assets a
SET
  finish_id        = f.id,
  catalog_line_id  = COALESCE(a.catalog_line_id, f.catalog_line_id)
FROM finishes f
WHERE a.tenant_id = f.tenant_id
  AND a.asset_type = 'finish_swatch'
  AND a.status    = 'confirmed'
  AND a.finish_id IS NULL
  -- Only match finishes from the same line when we know the asset's line
  AND (a.catalog_line_id IS NULL OR a.catalog_line_id = f.catalog_line_id)
  AND (
    -- 1. parsed_finish_code
    (a.parsed_finish_code IS NOT NULL
     AND a.parsed_finish_code = f.code)
    OR
    -- 2. normalized filename vs finish code
    (lower(regexp_replace(
       regexp_replace(a.original_filename, '\.[^.]+$', ''),
       '\s+', '-', 'g'
     )) = f.code)
    OR
    -- 3. normalized filename vs normalized finish name
    (lower(regexp_replace(
       regexp_replace(a.original_filename, '\.[^.]+$', ''),
       '\s+', '-', 'g'
     )) = lower(regexp_replace(f.name, '\s+', '-', 'g')))
  );
