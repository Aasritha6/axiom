# Axiom — Narrative vs. Ground Truth Terminal

Forensic intelligence terminal for the Anakin Build-a-thon. Compares promotional narrative signals against operational reality metrics in a Bloomberg-style monospace UI.

## Quick Start

```bash
npm install
cp .env.example .env.local   # add your ANAKIN_API_KEY
npm run recon                # discover verified Wire action IDs
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Architecture

**8 verified Wire sources** (fetched from `GET /v1/wire/catalog/{slug}`):

| Hemisphere | Slot | Action ID | Catalog |
|---|---|---|---|
| Narrative | News | `gn_search` | google_news |
| Narrative | Related | `gn_related` | google_news |
| Narrative | Social | `rt_search` | reddit |
| Narrative | YouTube | `yt_search` | youtube |
| Reality | Finance | `yf_quote` | yahoo_finance |
| Reality | Amazon | `am_search_products` | amazon |
| Reality | GitHub | `gh_search_repos` | github |
| Reality | Hiring | `yc_search_companies` | ycombinator (`is_hiring: true`) |

See `config/wire-actions.json` for alternates (Indeed needs auth, etc.).

```bash
npm run catalog   # re-fetch full Anakin catalog
npm run recon     # smoke-test all 8 actions
```

## Before You Demo

1. Run `npm run recon` and paste action IDs into `.env.local`
2. Smoke-test with `npm run recon -- --test "Tesla"`
3. Featured queries use cached data by default (reliable demo)
4. Custom queries hit live Wire + fallbacks (Reddit JSON, Yahoo Finance)

## Env Vars

See `.env.example`.
