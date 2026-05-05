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
  "accessories",
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
    colorCode: null,
    colorType: null,
    structureCode: null,
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

  // ── Color swatch detection ────────────────────────────────────
  // Pattern: color-{type}-{code...}  type = countertop | floor
  if (parts[0] === "color") {
    result.assetType = "color_swatch";
    const KNOWN_COLOR_TYPES = ["countertop", "floor"];
    if (parts.length >= 3 && KNOWN_COLOR_TYPES.includes(parts[1])) {
      result.colorType = parts[1];
      result.colorCode = parts.slice(2).join("-");
    } else if (parts.length >= 2) {
      result.colorCode = parts.slice(1).join("-");
      notes.push("Color type (countertop/floor) missing from filename.");
    } else {
      notes.push("Color code missing from filename.");
    }
    result.confidence = result.colorCode ? "partial" : "unmatched";
    return result;
  }

  // ── Structure image / reference detection ────────────────────
  // Pattern: structure-{code...}.ext           → structure_image (display + AI diagram)
  // Pattern: structure-{code...}-reference.ext → structure_reference (AI analysis only, never public)
  if (parts[0] === "structure") {
    const isReference = parts.length >= 3 && parts[parts.length - 1] === "reference";
    result.assetType = isReference ? "structure_reference" : "structure_image";
    const codeParts = isReference ? parts.slice(1, -1) : parts.slice(1);
    if (codeParts.length >= 1) {
      result.structureCode = codeParts.join("-");
      result.confidence = "partial";
    } else {
      notes.push("Structure code missing from filename.");
      result.confidence = "unmatched";
    }
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

  const { lines = [], categories = [], skus = [], finishes = [], colors = [], structures = [] } = dbContext;

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
  } else if (parsed.assetType === "color_swatch") {
    const toSlug = (s) => s.toLowerCase().replace(/\s+/g, "-");
    const colorRecord = parsed.colorCode
      ? colors.find(
          (c) => c.code === parsed.colorCode || toSlug(c.name) === parsed.colorCode
        )
      : null;
    if (colorRecord) {
      result.confidence = "matched";
      result.resolvedColorId = colorRecord.id;
    } else {
      result.confidence = parsed.colorCode ? "partial" : "unmatched";
      if (parsed.colorCode) notes.push(`Color "${parsed.colorCode}" not found in DB.`);
    }
  } else if (parsed.assetType === "structure_image" || parsed.assetType === "structure_reference") {
    const toSlug = (s) => s.toLowerCase().replace(/\s+/g, "-");
    const structRecord = parsed.structureCode
      ? structures.find(
          (s) => s.code === parsed.structureCode || toSlug(s.name) === parsed.structureCode
        )
      : null;
    if (structRecord) {
      result.confidence = "matched";
      result.resolvedStructureId = structRecord.id;
    } else {
      result.confidence = parsed.structureCode ? "partial" : "unmatched";
      if (parsed.structureCode) notes.push(`Structure "${parsed.structureCode}" not found in DB.`);
    }
  } else if (parsed.assetType === "lifestyle") {
    // Try matching the full filename against known records in DB.
    // Catches plain-named files like "White Quartz.png", "Shaker Door.jpg",
    // or "finish-euro-matte-white.png" that weren't detected by prefix-based parser.
    const normalizedFilename = parsed.originalFilename
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .replace(/\s+/g, "-")
      .trim();
    const toSlug = (s) => s.toLowerCase().replace(/\s+/g, "-");

    // 1. Try finish codes/names
    if (finishes.length > 0) {
      const finishMatch = finishes.find(
        (f) =>
          f.code === normalizedFilename ||
          (f.name && toSlug(f.name) === normalizedFilename)
      );
      if (finishMatch) {
        result.assetType = "finish_swatch";
        result.confidence = "matched";
        result.resolvedFinishId = finishMatch.id;
        result.resolvedLineId = finishMatch.catalogLineId;
        result.lineSlug = finishMatch.lineSlug ?? result.lineSlug;
        result.parseNotes = [`Auto-matched finish by filename: "${finishMatch.name || finishMatch.code}".`];
        return result;
      }
    }

    // 2. Try color codes/names
    if (colors.length > 0) {
      const colorMatch = colors.find(
        (c) =>
          c.code === normalizedFilename ||
          toSlug(c.name) === normalizedFilename
      );
      if (colorMatch) {
        result.assetType = "color_swatch";
        result.confidence = "matched";
        result.resolvedColorId = colorMatch.id;
        result.colorCode = colorMatch.code;
        result.colorType = colorMatch.colorType;
        result.parseNotes = [`Auto-matched color by filename: "${colorMatch.name || colorMatch.code}".`];
        return result;
      }
    }

    // 3. Try structure codes/names
    if (structures.length > 0) {
      const structMatch = structures.find(
        (s) =>
          s.code === normalizedFilename ||
          toSlug(s.name) === normalizedFilename
      );
      if (structMatch) {
        result.assetType = "structure_image";
        result.confidence = "matched";
        result.resolvedStructureId = structMatch.id;
        result.structureCode = structMatch.code;
        result.parseNotes = [`Auto-matched structure by filename: "${structMatch.name || structMatch.code}".`];
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
