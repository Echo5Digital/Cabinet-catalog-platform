# Cabinet Catalog Platform

A production-ready cabinet catalog and quote management platform built with Next.js 14, Supabase, and Claude AI.

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 14 (App Router, JavaScript) |
| Database + Auth | Supabase (PostgreSQL, RLS, Storage) |
| AI | Anthropic Claude (claude-haiku-4-5) |
| Styling | Tailwind CSS |
| Hosting | Vercel |

---

## Repo Structure

```
cabinet-catalog-platform/
├── app/
│   ├── admin/                    # Admin dashboard (auth-protected)
│   │   ├── layout.jsx            # Sidebar nav + badge counts
│   │   ├── page.jsx              # Dashboard: stats + quick links
│   │   ├── assets/               # Asset review queue
│   │   ├── catalog/
│   │   │   ├── lines/            # Catalog line management
│   │   │   ├── products/         # Product browser
│   │   │   ├── categories/       # Category management
│   │   │   ├── finishes/         # Finish management
│   │   │   └── [id]/versions/    # Version history + compare + rollback
│   │   ├── leads/                # Quote request CRM
│   │   └── settings/             # Branding, colors, logo upload
│   ├── catalog/                  # Public-facing catalog (reads from version snapshot)
│   │   ├── layout.jsx            # Shell: nav, ChatWidget
│   │   ├── page.jsx              # Collections index
│   │   ├── [line]/page.jsx       # Line page: category/width filters
│   │   └── [line]/[sku]/page.jsx # Product detail: images, finishes, quote
│   ├── login/                    # Auth page
│   └── api/
│       ├── auth/                 # login · logout · session
│       ├── assets/               # CRUD + ingest + confirm/flag/reject
│       ├── audit-logs/           # Append-only audit trail
│       ├── catalog/[id]/
│       │   ├── publish/          # Direct publish
│       │   ├── versions/
│       │   │   ├── draft/        # Create staged snapshot
│       │   │   ├── compare/      # Diff two versions
│       │   │   └── [vid]/
│       │   │       ├── approve/  # Draft → published
│       │   │       └── rollback/ # Restore archived version
│       ├── categories/           # CRUD
│       ├── finishes/             # CRUD
│       ├── leads/                # CRUD + stats
│       ├── products/             # CRUD + finishes + variants + rules
│       ├── tenant/               # Settings + logo upload
│       ├── public/               # Unauthenticated: quote submission, line data
│       └── ai/
│           ├── session/[token]/message/   # Customer chat turn
│           ├── summarize/lead/[id]/       # Admin: AI lead summary
│           ├── explain/version-diff/      # Admin: AI diff explanation
│           └── draft/product/[id]/        # Admin: AI description draft
├── components/
│   ├── admin/                    # AssetIngestUploader, AssetMappingTable
│   └── catalog/                  # ProductCard, ProductDetailClient, ChatWidget,
│                                 # QuoteModal, QuotePanel, CategoryPills, CatalogShell
├── lib/
│   ├── supabase/
│   │   ├── client.js             # Browser client (createBrowserClient)
│   │   ├── server.js             # Server client (cookies-based)
│   │   └── admin.js              # Service-role client (API routes only)
│   ├── utils/
│   │   ├── api-auth.js           # getAuthContext · hasRole · unauthorized · forbidden
│   │   └── asset-parser.js       # Filename → parsed metadata + confidence score
│   ├── ai/
│   │   ├── chat.js               # runChat engine + admin one-shots
│   │   └── tools.js              # 6 AI tools: search, detail, finishes, quote, escalate
│   ├── catalog/
│   │   ├── buildSnapshot.js      # Shared snapshot builder (publish + draft)
│   │   └── getPublishedVersion.js # Public page helper: slug → snapshot
│   └── context/
│       └── quote.jsx             # QuoteContext + localStorage persistence
├── middleware.js                 # Session refresh + /admin route protection
├── supabase/
│   ├── migrations/schema.sql     # Full v2 schema (19 tables, enums, RLS, functions)
│   ├── storage-setup.sql         # Storage buckets + RLS policies
│   └── seed/seed.sql             # Full seed: tenant, lines, 47 products, finish maps, rules
└── .env.local                    # See Environment Variables section
```

---

## Environment Variables

```bash
# Supabase — find in: Supabase Dashboard > Project Settings > API
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...          # anon/public key
SUPABASE_SERVICE_ROLE_KEY=eyJ...              # service_role key — never expose to browser

# Anthropic — https://console.anthropic.com/settings/keys
ANTHROPIC_API_KEY=sk-ant-...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000      # Change to https://yourdomain.com in production

# Tenant — fixed UUID matching seed.sql (do not change)
NEXT_PUBLIC_DEFAULT_TENANT_ID=a0000000-0000-0000-0000-000000000001
```

---

## Setup

### 1. Clone and install

```bash
git clone <repo-url> && cd cabinet-catalog-platform
npm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
# Edit .env.local with your Supabase and Anthropic credentials
```

### 3. Apply database schema

In **Supabase SQL Editor**, run in order:

```
supabase/migrations/schema.sql     ← Run first
supabase/storage-setup.sql         ← Run second (creates buckets + policies)
supabase/seed/seed.sql             ← Run third (Cabinet & Remodeling Depot data)
```

### 4. Create admin user

In **Supabase Dashboard > Authentication > Users**, create a new user:

```
Email:    admin@cabinetdepot.com
Password: (your choice)
```

Then in **Supabase SQL Editor**, link the user to the tenant:

```sql
insert into tenant_users (tenant_id, auth_user_id, email, full_name, role)
values (
  'a0000000-0000-0000-0000-000000000001',
  (select id from auth.users where email = 'admin@cabinetdepot.com'),
  'admin@cabinetdepot.com',
  'Admin User',
  'owner'
);
```

### 5. Start development server

```bash
npm run dev
# → http://localhost:3000/admin   (login first at /login)
# → http://localhost:3000/catalog (public catalog)
```

---

## Backend Modules

### Authentication (`lib/utils/api-auth.js`)

Every API route calls `getAuthContext()` which:
1. Reads the session cookie via Supabase SSR
2. Looks up `tenant_users` for `tenant_id` + `role`
3. Returns `{ user, tenantId, role }` or `{ user: null }`

Role hierarchy: `viewer < editor < admin < owner`

```js
const ctx = await getAuthContext();
if (!ctx.user) return unauthorized();
if (!hasRole(ctx, "admin")) return forbidden();
```

### Asset Pipeline (`lib/utils/asset-parser.js` + `/api/assets/`)

```
Upload → filename parse → confidence score → assets table (pending_review)
       → admin review → confirm/flag/reject
       → confirmed assets get ai_eligible=true + public_url
```

Confidence levels:
- `matched` — all fields resolved against DB (line, category, SKU, finish)
- `partial` — some fields resolved
- `unmatched` — no DB matches found

### Catalog Versioning (`lib/catalog/buildSnapshot.js`)

`buildCatalogSnapshot(lineId, tenantId)` runs parallel DB reads and returns:
```js
{
  line,
  snapshot: {
    products: [{ sku, name, dims, finish_ids, images, ... }],
    finishes: [{ id, code, name, swatch_url }],
    lifestyle_images: [{ url, alt }]
  },
  blockers,    // pre-publish checklist failures
  counts
}
```

Public pages call `getPublishedVersion(lineSlug)` — reads the frozen JSONB snapshot, never live tables. Rollback is instant.

### AI Layer (`lib/ai/`)

- **Model**: `claude-haiku-4-5-20251001` (fast + cheap)
- **Max tool rounds**: 5
- **Tools**: `search_products`, `get_product_detail`, `get_finishes`, `add_to_quote`, `get_quote_summary`, `escalate_to_human`
- **Grounding rule**: AI never invents product data — all facts come from tool results
- **addToQuote validation**: 4-step (product exists → finish exists → is_available → no incompatible rule)

Admin one-shots: `summarizeLead()`, `explainVersionDiff()`, `draftProductDescription()`

---

## Frontend Pages

### Public Catalog

| Route | Description |
|---|---|
| `/catalog` | Collections index — published lines grid |
| `/catalog/[line]` | Line page — category/width filter pills, product grid |
| `/catalog/[line]/[sku]` | Product detail — image gallery, finish swatches, quote form |

All public pages read from `catalog_versions.snapshot` JSONB — never live tables.

### Admin Dashboard

| Route | Description |
|---|---|
| `/admin` | Stats: pending assets, new leads, quick links |
| `/admin/catalog/lines` | Lines list with status, publish button, history link |
| `/admin/catalog/products` | Product browser with category/line filter |
| `/admin/catalog/finishes` | Finish CRUD with swatch preview |
| `/admin/catalog/categories` | Category management |
| `/admin/catalog/[id]/versions` | Version timeline, compare panel, rollback |
| `/admin/assets` | Asset review queue — confirm/flag/reject with bulk actions |
| `/admin/leads` | Quote request CRM with pipeline view and status management |
| `/admin/settings` | Branding: name, colors, logo upload |

---

## Storage Setup

Two Supabase Storage buckets (defined in `supabase/storage-setup.sql`):

| Bucket | Visibility | Max Size | Purpose |
|---|---|---|---|
| `assets` | Private | 10 MB | Product diagrams, finish swatches, lifestyle images |
| `logos` | Public | 2 MB | Tenant logo (served in catalog header) |

**Asset storage path convention:**
```
assets/{tenant_id}/{timestamp}-{original_filename}
```

**File naming convention for auto-parsing:**
```
{line-slug}-{category-slug}-{SKU}[-{finish-code}][-{variant}][-{sequence}].{ext}

Examples:
  american-base-B24.png                    → matched (product diagram)
  american-base-B24-white-shaker.png       → matched (with finish)
  american-finish-white-shaker.png         → matched (finish swatch)
  euro-lifestyle-kitchen-01.jpg            → matched (lifestyle)
```

---

## Seed Data: Cabinet & Remodeling Depot

`supabase/seed/seed.sql` provides a complete starting dataset:

**Tenant:** Cabinet & Remodeling Depot (`slug: cabinet-depot`)

**Catalog Lines:**
- American Collection (framed, traditional) — 34 products
- Euro Collection (frameless, contemporary) — 13 products

**Products by category:**

| Category | American | Euro |
|---|---|---|
| Base | B09–B36 (10 SKUs) | EB18–EB45 (5 SKUs) |
| Wall | W0930–W3624 (9 SKUs) | EW1218–EW3630 (4 SKUs) |
| Tall | T1884–T2490 (4 SKUs) | ET1884–ET2484 (2 SKUs) |
| Drawer | DB12–DB36 (4 SKUs) | EDB24–EDB36 (2 SKUs) |
| Vanity | V24–V48 (4 SKUs) | — |
| Specialty | SP09, BL36B, BL36W (3 SKUs) | — |

**Finishes:**
- American: White Shaker, Gray Shaker, Espresso, Natural Maple
- Euro: Matte White, Matte Black, High Gloss Gray, Walnut Veneer

**Product rules pre-configured:**
- B09: stain finishes unavailable (too narrow)
- SP09: lazy susan installation dimension note
- BL36B: filler strip dimension note
- ET2484: ceiling height dimension note

---

## AI Integration Points

| Trigger | Route | Model | Purpose |
|---|---|---|---|
| Customer chat turn | `POST /api/ai/session/[token]/message` | Haiku | Product search + quote building |
| Admin: lead summary | `POST /api/ai/summarize/lead/[id]` | Haiku | Sales rep briefing |
| Admin: version diff | `POST /api/ai/explain/version-diff` | Haiku | Plain-English changelog |
| Admin: product description | `POST /api/ai/draft/product/[id]` | Haiku | Description drafting |

**Chat widget** (`components/catalog/ChatWidget.jsx`):
- Floating button, bottom-right
- Session persisted in `localStorage`
- Syncs `quoteAdditions` → `QuoteContext`
- Shows `SuggestionCards` for products, `EscalationBanner` on handoff

**AI safety rules (enforced in system prompt + tool logic):**
- Never states a SKU/dimension not returned by a tool call
- Never invents pricing or lead times
- `add_to_quote` validates product existence, finish existence, `is_available`, and `finish_incompatible` rules before accepting
- Max 5 tool rounds per turn to prevent loops

---

## Deployment (Vercel)

```bash
# Set environment variables in Vercel dashboard, then:
vercel deploy --prod
```

Required Vercel environment variables (same as `.env.local`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `NEXT_PUBLIC_APP_URL` — set to your production URL
- `NEXT_PUBLIC_DEFAULT_TENANT_ID`

**Security checklist before going live:**
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is server-only (never in `NEXT_PUBLIC_*`)
- [ ] `ANTHROPIC_API_KEY` is server-only
- [ ] RLS is enabled on all tables (verify in Supabase Dashboard > Table Editor)
- [ ] `/admin` routes require authentication (enforced by `middleware.js`)
- [ ] Storage bucket `assets` is private (RLS verified in `storage-setup.sql`)
- [ ] Remove or replace default admin credentials before launch
