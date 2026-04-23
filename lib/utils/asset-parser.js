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

// SKU pattern: letters followed by digits (e.g. B24, SP09, W3630, DB18)
const SKU_PATTERN = /^[A-Z]{1,4}\d{2,4}$/i;

/**
 * Parse a single filename into structured metadata.
 *
 * @param {string} filename - Original filename including extension
 * @returns {{
 *   originalFilename: string,
 *   assetType: 'product'|'finish'|'lifestyle'|null,
 *   lineSlug: string|null,
 *   categorySlug: string|null,
 *   sku: string|null,
 *   finishCode: string|null,
 *   variant: string|null,
 *   sequence: number|null,
 *   confidence: 'mapped'|'partially_matched'|'unmatched',
 *   parseNotes: string[]
 * }}
 */
export function parseAssetFilename(filename) {
  const notes = [];
  const base = filename.replace(/\.[^.]+$/, "").toLowerCase().trim();
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
    notes.push("Filename too short to parse.");
    return result;
  }

  // ── Finish detection ─────────────────────────────────────────
  // Pattern: finish-{line}-{finish-code...}
  if (parts[0] === "finish") {
    result.assetType = "finish_swatch";

    const linePart = parts[1];
    if (KNOWN_LINES.includes(linePart)) {
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
    // Note: confidence upgrades to 'mapped' after DB match in scorer
    return result;
  }

  // ── Line detection ───────────────────────────────────────────
  const linePart = parts[0];
  if (KNOWN_LINES.includes(linePart)) {
    result.lineSlug = linePart;
  } else {
    notes.push(`Unknown catalog line "${linePart}".`);
  }

  // ── Category detection ───────────────────────────────────────
  const categoryPart = parts[1];
  if (KNOWN_CATEGORIES.includes(categoryPart)) {
    result.categorySlug = categoryPart;
  } else {
    notes.push(`Unknown category "${categoryPart}".`);
  }

  // ── Remaining parts analysis ─────────────────────────────────
  const remaining = parts.slice(2);

  if (remaining.length === 0) {
    // No SKU — could be lifestyle
    if (result.lineSlug && !result.categorySlug) {
      notes.push("No SKU or recognizable category found.");
    }
    result.assetType = "lifestyle";
    result.confidence = result.lineSlug ? "partially_matched" : "unmatched";
    return result;
  }

  // Check if any part is a sequence number (pure integer, 1-3 digits)
  const sequenceIndex = remaining.findIndex((p) => /^\d{1,3}$/.test(p));

  // Check if any part looks like a SKU
  const skuIndex = remaining.findIndex((p) => SKU_PATTERN.test(p));

  if (skuIndex !== -1) {
    // Has SKU → product image
    result.assetType = "product_diagram";
    result.sku = remaining[skuIndex].toUpperCase();

    // Check remaining parts for variant
    const afterSku = remaining.slice(skuIndex + 1);
    for (const p of afterSku) {
      if (KNOWN_VARIANTS.includes(p)) {
        result.variant = p;
        break;
      }
    }

    if (result.lineSlug && result.categorySlug) {
      result.confidence = "partial";
      // Upgrades to 'matched' after exact SKU DB match in scorer
    } else if (result.lineSlug || result.categorySlug) {
      result.confidence = "partial";
    } else {
      result.confidence = "unmatched";
    }
  } else if (sequenceIndex !== -1) {
    // Has sequence number but no SKU → lifestyle
    result.assetType = "lifestyle";
    result.sequence = parseInt(remaining[sequenceIndex], 10);
    result.confidence = result.lineSlug ? "partial" : "unmatched";
  } else {
    // Has remaining parts but no SKU and no sequence
    // Could be a lifestyle with a scene name (e.g. euro-kitchen)
    result.assetType = "lifestyle";
    notes.push("No SKU found; treating as lifestyle image.");
    result.confidence = result.lineSlug ? "partial" : "unmatched";
  }

  return result;
}

/**
 * Score parsed metadata against DB records.
 * Upgrades confidence from 'partially_matched' → 'mapped' when
 * exact DB records are found.
 *
 * @param {object} parsed - Result of parseAssetFilename()
 * @param {object} dbContext - { lines: [], categories: [], skus: [], finishes: [] }
 *   Each entry has { slug } or { sku } from the DB.
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
