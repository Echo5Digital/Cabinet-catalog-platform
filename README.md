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


