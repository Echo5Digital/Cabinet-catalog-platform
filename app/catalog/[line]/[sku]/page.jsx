import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import Link from "next/link";
import ProductDetailClient from "@/components/catalog/ProductDetailClient";

const TENANT_ID = process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID;

export async function generateMetadata({ params }) {
  return { title: `${params.sku.toUpperCase()} — Cabinet Detail` };
}

async function getData(lineSlug, skuParam) {
  const admin = createAdminClient();
  const sku = skuParam.toUpperCase();

  const { data: line } = await admin
    .from("catalog_lines")
    .select("id, name, slug")
    .eq("tenant_id", TENANT_ID)
    .eq("slug", lineSlug)
    .eq("status", "published")
    .single();

  if (!line) return null;

  const { data: product } = await admin
    .from("products")
    .select("id, sku, name, description, width_in, height_in, depth_in, box_width_in, box_height_in, box_depth_in, door_count, drawer_count, notes, catalog_line:catalog_lines(name,slug), category:categories(name,slug)")
    .eq("catalog_line_id", line.id)
    .eq("tenant_id", TENANT_ID)
    .eq("sku", sku)
    .eq("is_active", true)
    .single();

  if (!product) return null;

  // Images via product_assets (v2)
  const { data: paRows } = await admin
    .from("product_assets")
    .select("is_primary, sort_order, variant:product_variants!variant_id(variant_key, label), asset:assets!asset_id(public_url, alt_text)")
    .eq("product_id", product.id)
    .order("is_primary", { ascending: false })
    .order("sort_order", { ascending: true });

  const images = (paRows || [])
    .filter((r) => r.asset?.public_url)
    .map((r) => ({
      url: r.asset.public_url,
      alt: r.asset.alt_text || product.name,
      is_primary: r.is_primary,
      variant_key: r.variant?.variant_key || null,
      variant_label: r.variant?.label || null,
    }));

  // Finishes via product_finish_map (v2)
  const { data: pfmRows } = await admin
    .from("product_finish_map")
    .select("is_default, sort_order, is_available, finish:finishes!finish_id(id, name, code, finish_family)")
    .eq("product_id", product.id)
    .eq("is_available", true)
    .order("sort_order", { ascending: true });

  const finishList = (pfmRows || [])
    .filter((r) => r.finish)
    .map((r) => ({ ...r.finish, is_default: r.is_default }));

  // Swatch assets
  const finishIds = finishList.map((f) => f.id);
  const swatches = {};
  if (finishIds.length > 0) {
    const { data: swatchRows } = await admin
      .from("assets")
      .select("finish_id, public_url")
      .in("finish_id", finishIds)
      .eq("asset_type", "finish_swatch")
      .eq("status", "confirmed");
    for (const r of swatchRows || []) {
      if (!swatches[r.finish_id]) swatches[r.finish_id] = r.public_url;
    }
  }

  // Rules
  const { data: rules } = await admin
    .from("product_rules")
    .select("rule_type, rule_value, label")
    .eq("product_id", product.id)
    .eq("tenant_id", TENANT_ID)
    .eq("is_active", true);

  const incompatibleFinishIds = new Set(
    (rules || [])
      .filter((r) => r.rule_type === "finish_incompatible")
      .flatMap((r) => r.rule_value?.finish_ids || [])
  );

  const finishes = finishList.map((f) => ({
    ...f,
    swatch_url: swatches[f.id] || null,
    incompatible: incompatibleFinishIds.has(f.id),
  }));

  const dimensionNotes = (rules || [])
    .filter((r) => r.rule_type === "dimension_note")
    .map((r) => r.rule_value?.message || r.label);

  return { line, product, images, finishes, dimensionNotes };
}

export default async function ProductDetailPage({ params }) {
  const data = await getData(params.line, params.sku);
  if (!data) notFound();

  const { line, product, images, finishes, dimensionNotes } = data;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <nav className="text-xs text-stone-400 mb-6 flex items-center gap-1.5 flex-wrap">
        <Link href="/catalog" className="hover:text-stone-600 transition">Collections</Link>
        <span>/</span>
        <Link href={`/catalog/${line.slug}`} className="hover:text-stone-600 transition">{line.name}</Link>
        <span>/</span>
        {product.category && (
          <>
            <Link href={`/catalog/${line.slug}?category=${product.category.slug}`} className="hover:text-stone-600 transition">
              {product.category.name}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-stone-600 font-medium">{product.sku}</span>
      </nav>

      <ProductDetailClient
        product={product}
        images={images}
        finishes={finishes}
        dimensionNotes={dimensionNotes}
        lineSlug={line.slug}
      />
    </div>
  );
}
