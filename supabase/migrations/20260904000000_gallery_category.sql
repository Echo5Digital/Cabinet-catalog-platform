-- ================================================================
-- Gallery Category
-- Adds a standalone category to lifestyle assets so the public
-- Design Gallery (/catalog/gallery) can be grouped independently
-- of catalog_lines. Admins upload directly from Admin > Gallery.
-- ================================================================

create type gallery_category_enum as enum ('american', 'euro', 'general');

alter table assets
  add column gallery_category gallery_category_enum;

-- Relax the lifestyle/catalog_line_id requirement: a confirmed
-- lifestyle asset now needs EITHER a catalog_line_id OR a gallery_category.
alter table assets
  drop constraint chk_lifestyle_needs_line;

alter table assets
  add constraint chk_lifestyle_needs_line_or_category
    check (
      status != 'confirmed'
      or asset_type != 'lifestyle'
      or catalog_line_id is not null
      or gallery_category is not null
    );

create index idx_assets_gallery_category
  on assets(tenant_id, gallery_category)
  where gallery_category is not null;
