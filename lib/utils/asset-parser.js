/**
 * Asset File Name Parser
 *
 * Parses structured asset filenames into metadata objects.
 * Used during ingestion to auto-detect catalog line, category, SKU,
 * asset type, and variant before admin review.
 *
 * Naming conventions supported:
 *   Product:   {line}-{category}-{SKU}.ext
 *              {line}-{category}-{SKU}-{variant}.ext
 *   Finish:    finish-{line}-{finish-code}.ext
 *   Lifestyle: {line}-{scene}-{sequence}.ext   (no SKU, no "finish-" prefix)
 *
 * Examples:
 *   american-base-B24.png         → product, line=american, category=base, sku=B24
 *   euro-base-SP09-left.png       → product, line=euro, category=base, sku=SP09, variant=left
 *   finish-american-white-shaker.png → finish, line=american, finishCode=white-shaker
 *   euro-kitchen-01.jpg           → lifestyle, line=euro, sequence=1
 */

const KNOWN_LINES = ["american", "euro"];

const KNOWN_CATEGORIES = [
  "base",
  "wall",
  "tall",
  "specialty",
  "vanity",
  "drawer",
  "corner",
  "island",
  "pantry",
  "sink",
];

const KNOWN_VARIANTS = ["left", "right", "open", "closed", "front", "side"];

// SKU pattern: letter-prefix + digits (optional trailing letters), OR pure numeric 4+ digits
// Handles: B24, SP09, W3630, DB18, PC308424, BL36B, EW1218, OBD12, ODB7, 308424
const SKU_PATTERN = /^([A-Z]{1,4}\d{1,8}[A-Z]{0,2}|\d{4,})$/i;

/**
 * Parse a single filename into structured metadata.
 *
 * @param {string} filename - Original filename including extension
 * @param {string[]} [knownLinesList] - Line slugs from DB; falls back to hardcoded list
 * @returns {{
 *   originalFilename: string,
 *   assetType: 'product_diagram'|'finish_swatch'|'lifestyle'|null,
 *   lineSlug: string|null,
 *   categorySlug: string|null,
 *   sku: string|null,
 *   finishCode: string|null,
 *   variant: string|null,
 *   sequence: number|null,
 *   confidence: 'matched'|'partial'|'unmatched',
 *   parseNotes: string[]
 * }}
 */
export function parseAssetFilename(filename, knownLinesList = KNOWN_LINES) {
  const notes = [];
  const base = filename.replace(/\.[^.]+$/, "").toLowerCase().trim().replace(/\s+/g, "-");
  const parts = base.split("-");

  const result = {
    originalFilename: filename,
    assetType: null,
    lineSlug: null,
    categorySlug: null,
    sku: null,
    finishCode: null,
    variant: null,
    sequence: null,
    confidence: "unmatched",
    parseNotes: notes,
  };

  if (parts.length < 2) {
    notes.push("Filename too short to parse; could not detect type.");
    result.assetType = "lifestyle";
    result.confidence = "unmatched";
    return result;
  }

  // ── Finish detection ─────────────────────────────────────────
  // Pattern: finish-{line}-{finish-code...}
  if (parts[0] === "finish") {
    result.assetType = "finish_swatch";

    const linePart = parts[1];
    if (knownLinesList.includes(linePart)) {
      result.lineSlug = linePart;
    } else {
      notes.push(`Unknown catalog line "${linePart}".`);
    }

    if (parts.length >= 3) {
      result.finishCode = parts.slice(2).join("-");
    } else {
      notes.push("Finish code missing from filename.");
    }

    result.confidence =
      result.lineSlug && result.finishCode ? "partial" : "unmatched";
    // Note: confidence upgrades to 'matched' after DB match in scorer
    return result;
  }

  // ── Line detection ───────────────────────────────────────────
  const linePart = parts[0];
  if (knownLinesList.includes(linePart)) {
    result.lineSlug = linePart;
  } else {
    notes.push(`Unknown catalog line "${linePart}".`);
  }

  // ── Scan all parts after the line slug ───────────────────────
  // Category, SKU, sequence, and variant can appear in any position.
  // Unknown words (e.g. "kitchen", "cabinet", "tall Cabinet") are silently ignored.
  const afterLine = parts.slice(1);

  // Category: first recognized part anywhere after line
  const categoryIdx = afterLine.findIndex((p) => KNOWN_CATEGORIES.includes(p));
  if (categoryIdx !== -1) {
    result.categorySlug = afterLine[categoryIdx];
  } else {
    notes.push("No recognized category found in filename.");
  }

  // SKU checked before sequence (higher priority to avoid ambiguity)
  const skuIndex = afterLine.findIndex((p) => SKU_PATTERN.test(p));
  const sequenceIndex = afterLine.findIndex((p) => /^\d{1,3}$/.test(p));

  if (skuIndex !== -1) {
    // Has SKU → product diagram; line slug is used by scorer to scope the lookup
    result.assetType = "product_diagram";
    result.sku = afterLine[skuIndex].toUpperCase();

    // Variant: look in parts after the SKU position
    const afterSku = afterLine.slice(skuIndex + 1);
    for (const p of afterSku) {
      if (KNOWN_VARIANTS.includes(p)) {
        result.variant = p;
        break;
      }
    }

    result.confidence = (result.lineSlug || result.categorySlug) ? "partial" : "unmatched";
    // Upgrades to 'matched' after exact SKU DB match in scorer (scoped to lineSlug)
  } else if (sequenceIndex !== -1) {
    // Has sequence number but no SKU → lifestyle
    result.assetType = "lifestyle";
    result.sequence = parseInt(afterLine[sequenceIndex], 10);
    result.confidence = result.lineSlug ? "partial" : "unmatched";
  } else {
    // No SKU and no sequence → lifestyle
    result.assetType = "lifestyle";
    notes.push("No SKU found; treating as lifestyle image.");
    result.confidence = result.lineSlug ? "partial" : "unmatched";
  }

  return result;
}

/**
 * Score parsed metadata against DB records.
 * Upgrades confidence from 'partial' → 'matched' when exact DB records are found.
 * Also attempts finish name matching for plain-named files (e.g. "White Shaker.png").
 *
 * @param {object} parsed - Result of parseAssetFilename()
 * @param {object} dbContext - { lines: [], categories: [], skus: [], finishes: [] }
 *   finishes entries have { id, code, name, catalogLineId, lineSlug }
 * @returns {object} Updated parsed object with final confidence
 */
export function scoreAssetConfidence(parsed, dbContext) {
  const result = { ...parsed };
  const notes = [...(parsed.parseNotes || [])];

  const { lines = [], categories = [], skus = [], finishes = [] } = dbContext;

  const lineExists = parsed.lineSlug
    ? lines.some((l) => l.slug === parsed.lineSlug)
    : false;

  const categoryExists = parsed.categorySlug
    ? categories.some((c) => c.slug === parsed.categorySlug)
    : false;

  if (parsed.assetType === "product_diagram") {
    const skuRecord = parsed.sku
      ? skus.find(
          (s) =>
            s.sku.toUpperCase() === parsed.sku &&
            (!parsed.lineSlug || s.lineSlug === parsed.lineSlug)
        )
      : null;

    if (skuRecord) {
      result.confidence = "matched";
      result.resolvedProductId = skuRecord.id;
      result.resolvedLineId = skuRecord.catalogLineId;
    } else if (lineExists && categoryExists) {
      result.confidence = "partial";
      notes.push(`SKU "${parsed.sku}" not found in DB.`);
    } else {
      result.confidence = "unmatched";
      if (!lineExists) notes.push(`Line "${parsed.lineSlug}" not in DB.`);
      if (!categoryExists) notes.push(`Category "${parsed.categorySlug}" not in DB.`);
    }
  } else if (parsed.assetType === "finish_swatch") {
    const finishRecord = parsed.finishCode
      ? finishes.find(
          (f) =>
            f.code === parsed.finishCode &&
            (!parsed.lineSlug || f.lineSlug === parsed.lineSlug)
        )
      : null;

    if (finishRecord) {
      result.confidence = "matched";
      result.resolvedFinishId = finishRecord.id;
      result.resolvedLineId = finishRecord.catalogLineId;
    } else if (lineExists) {
      result.confidence = "partial";
      notes.push(`Finish code "${parsed.finishCode}" not found in DB.`);
    } else {
      result.confidence = "unmatched";
      if (!lineExists) notes.push(`Line "${parsed.lineSlug}" not in DB.`);
    }
  } else if (parsed.assetType === "lifestyle") {
    // Try matching the full filename against finish codes and names in DB.
    // Catches plain-named files like "White Shaker.png" or "finish-euro-matte-white.png"
    // that weren't detected as finish_swatch by the parser.
    if (finishes.length > 0) {
      const normalizedFilename = parsed.originalFilename
        .replace(/\.[^.]+$/, "")
        .toLowerCase()
        .replace(/\s+/g, "-")
        .trim();

      const finishMatch = finishes.find(
        (f) =>
          f.code === normalizedFilename ||
          (f.name && f.name.toLowerCase().replace(/\s+/g, "-") === normalizedFilename)
      );

      if (finishMatch) {
        result.assetType = "finish_swatch";
        result.confidence = "matched";
        result.resolvedFinishId = finishMatch.id;
        result.resolvedLineId = finishMatch.catalogLineId;
        result.lineSlug = finishMatch.lineSlug ?? result.lineSlug;
        // Replace all parser notes — SKU/category/lifestyle notes are irrelevant for a matched finish
        result.parseNotes = [`Auto-matched finish by filename: "${finishMatch.name || finishMatch.code}".`];
        return result;
      }
    }

    // Standard lifestyle scoring
    if (lineExists) {
      result.confidence = "matched";
      result.resolvedLineId = lines.find((l) => l.slug === parsed.lineSlug)?.id;
    } else {
      result.confidence = parsed.lineSlug ? "partial" : "unmatched";
      if (!lineExists && parsed.lineSlug)
        notes.push(`Line "${parsed.lineSlug}" not in DB.`);
    }
  }

  result.parseNotes = notes;
  return result;
}
