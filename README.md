<p align="center">
  <strong>◈ AXIOM</strong><br/>
  <em>Narrative vs. Ground Truth — Forensic Intelligence Terminal</em>
</p>

<p align="center">
  Built for the <a href="https://anakin.io">Anakin.io</a> Build-a-thon · Next.js 15 · Anakin Wire · Server-Sent Events
</p>

---

## About

**Axiom** is a real-time forensic intelligence terminal that quantifies the gap between **public narrative** (media, social, video hype) and **operational reality** (finance, commerce, code, hiring). Given any company or product name, Axiom dispatches eight parallel [Anakin Wire](https://anakin.io) scrapers, scores each data source independently with reproducible rules, and produces an auditable verdict: whether story exceeds substance, or substance exceeds story.

The interface is inspired by Bloomberg terminals — pure black, monospace typography, high information density — designed for analysts, investors, and researchers who need evidence-backed divergence metrics, not another opaque sentiment score.

**Core principle:** Axiom does not ask users to trust a model. It shows what each wire returned, how it was scored, and why the verdict follows. All verdict math runs without any LLM; Gemini is optional for final prose synthesis only.

---

## Key Features

| Feature | Detail |
|---------|--------|
| **Split-brain sourcing** | 4 narrative + 4 reality Wire actions in parallel |
| **Rule-based scoring** | Keyword extraction on readable text fields — not ML, not LLM-per-source |
| **Δ-Sigma metric** | Weighted divergence gauge (−2 to +2) alongside discrete signal counts |
| **Live streaming** | Server-Sent Events push cards as each wire resolves |
| **Transparency** | Per-source badges: `LIVE` · `WIRE CACHE` · `FALLBACK` · `FAILED` + evidence URLs |
| **Resilience** | Partial failure isolation, Reddit/Yahoo fallbacks, 2-hour Wire cache |
| **Demo mode** | Curated matrices (Byju's, Cursor, Humane, Tesla FSD, WeWork) for instant playback |

---

## Architecture

```
┌────────────────────────── BROWSER (React 19) ──────────────────────────┐
│  Header: Query · Featured Carousel (Cached / Run Live) · Source Stats  │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────────┐ │
│  │ Narrative Matrix│ │Forensic Synthesis│ │ Reality Atomizer        │ │
│  │ (left panel)    │ │ (center)         │ │ (right panel)           │ │
│  │ SourceCard      │ │ Δ-Sigma Gauge    │ │ SourceCard              │ │
│  │ WireSkeleton    │ │ Verdict Label    │ │ FailedWireCard            │ │
│  │ FailedWireCard  │ │ Copy Verdict     │ │ Evidence links            │ │
│  └────────┬────────┘ └────────┬─────────┘ └──────────┬──────────────┘ │
│           └───────────────────┴──────────────────────┘                 │
│                               EventSource (SSE client)                 │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ GET /api/axiom/stream?query=&live=
┌────────────────────────── NEXT.JS 15 ─┴────────────────────────────────┐
│  app/api/axiom/stream/route.ts                                       │
│  ┌──────────┐  ┌──────────┐  ┌────────────┐  ┌───────────────────┐  │
│  │ Demo     │→ │ Wire     │→ │ Parallel   │→ │ extractors.ts     │  │
│  │ Matrices │  │ Cache 2h │  │ 8× Wire    │  │ (per-source)      │  │
│  └──────────┘  └──────────┘  └────────────┘  └─────────┬─────────┘  │
│                                                         ▼             │
│                                              discrepancy.ts           │
│                                              (verdict + Δ-Sigma)      │
│                                                         │             │
│                                                         ▼             │
│                                              gemini.ts (optional)     │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
┌────────────────────────── ANAKIN WIRE API ────────────────────────────┐
│  POST https://anakin.io/v1/wire/task  →  GET /v1/wire/jobs/{id}     │
│  Auth: X-API-Key header                                              │
│                                                                      │
│  NARRATIVE (×4)                    REALITY (×4)                      │
│  gn_search   Google News           yf_quote           Yahoo Finance  │
│  gn_related  Related Stories       am_search_products Amazon         │
│  rt_search   Reddit                gh_search_repos    GitHub         │
│  yt_search   YouTube               yc_search_companies YC Hiring     │
│                                                                      │
│  Fallbacks: rt_search → Reddit JSON · yf_quote → Yahoo Chart API    │
└──────────────────────────────────────────────────────────────────────┘
```

### Request lifecycle

1. **Query intake** — User submits a target (e.g. `Byju's`, `Cursor`) or picks a featured demo.
2. **Mode selection** — **Cached** loads a curated matrix instantly; **Run Live** (`live=1`) bypasses cache and demos.
3. **Parallel dispatch** — Eight Wire tasks POST to Anakin; each job polled until complete or timeout.
4. **Extraction** — Source-specific extractors score keyword density on title, body, description — never raw JSON keys.
5. **Aggregation** — Signal counts feed a decision tree; weighted Δ-Sigma computed for the gauge.
6. **Streaming** — `wire_resolved` events emit per source; `final_verdict` closes the stream with optional Gemini prose.
7. **Caching** — Successful Wire responses stored in-memory (2h TTL, serverless-safe).

### SSE event protocol

| Event | Payload | When |
|-------|---------|------|
| `status` | `{ message }` | Dispatch progress, cache hits, faults |
| `wire_resolved` | `{ wireId, signal, metrics, evidenceLinks, isLive, isFallback, fromWireCache }` | Source completes |
| `wire_failed` | `{ wireId, message }` | Source throws; scan continues |
| `final_verdict` | `{ verdictLabel, weightedDelta, signalGap, aiExplanation, … }` | All tasks settled |
| `error` | `{ message }` | Fatal stream error |

---

## Anakin Wire Integration

All eight action IDs were verified against the Anakin catalog (`GET /v1/wire/catalog/{slug}`). Run `npm run catalog` to refresh.

| Hemisphere | UI Label | Action ID | Catalog | Fallback |
|:-----------|:---------|:----------|:--------|:---------|
| Narrative | Google News Search | `gn_search` | google_news | — |
| Narrative | Related Coverage | `gn_related` | google_news | — |
| Narrative | Reddit Search | `rt_search` | reddit | Reddit JSON |
| Narrative | YouTube Search | `yt_search` | youtube | — |
| Reality | Yahoo Finance Quote | `yf_quote` | yahoo_finance | Yahoo Chart |
| Reality | Amazon Products | `am_search_products` | amazon | — |
| Reality | GitHub Repos | `gh_search_repos` | github | — |
| Reality | YC Hiring Companies | `yc_search_companies` | ycombinator | — |

Ticker resolution for finance (`guessTicker`): known aliases (e.g. `tesla` → `TSLA`), uppercase symbols, or first 4 chars of query.

---

## Scoring & Verdict Engine

### Per-source extraction (`lib/extractors.ts`)

1. **`collectReadableText()`** — Recursively walks Wire JSON, scanning only human-readable fields: `title`, `body`, `description`, `summary`, `headline`, `selftext`, `comment`, etc.
2. **Keyword matcher** — Word-boundary regex against two lists:
   - **Hype words** (narrative): `revolutionary`, `breakthrough`, `game-changer`, `disrupt`, …
   - **Stress words** (reality): `bankrupt`, `layoff`, `crash`, `decline`, `refund`, …
3. **Signal mapping** — `score > 0.15` → BULLISH · `score < −0.15` → BEARISH · else NEUTRAL (default `0.0`, no bullish bias).
4. **Evidence links** — Up to 3 URLs extracted from `url`, `link`, `permalink`, `html_url` fields per card.

### Δ-Sigma metric

```
avgN  = mean(narrative source sentiments)
avgR  = mean(reality source sentiments)
Δ-Sigma = (avgN × 0.6) − (avgR × 1.4)
```

Reality is weighted 1.4× because operational signals (finance, code, hiring) are treated as stronger ground-truth indicators than promotional language.

| Δ-Sigma | Gauge interpretation |
|:--------|:---------------------|
| > +0.5 | Narrative significantly ahead of reality |
| −0.5 to +0.5 | Equilibrium |
| < −0.5 | Reality significantly ahead of narrative |

### Decision tree (`lib/discrepancy.ts`)

Requires ≥2 resolved sources per hemisphere; otherwise **INSUFFICIENT DATA**.

| Condition | Verdict | Risk |
|-----------|---------|------|
| High narrative volume + weak reality | **HYPE DOMINATES REALITY** | EXTREME |
| Low narrative + strong reality | **REALITY EXCEEDS HYPE** | UNDERVALUED |
| Narrative bullish count > reality + 1 | **NARRATIVE DEVIATION** | MODERATE |
| Otherwise | **CONSENSUS ALIGNED** | LOW |

**Signal gap** = narrative bullish count − reality bullish count (discrete, auditable secondary metric).

### Optional Gemini synthesis

When `GEMINI_API_KEY` is set, Gemini Flash generates forensic prose ending with `ESTIMATED RISK EXPOSURE: [figure]`. Verdict math is unchanged if Gemini is unavailable.

---

## Interface

12-column terminal grid (mobile: verdict panel moves to top):

| Region | Columns | Contents |
|--------|---------|----------|
| **Narrative Matrix** | 1–5 | News, related, Reddit, YouTube cards |
| **Forensic Synthesis** | 6–7 | Δ-Sigma gauge, verdict label, risk badge, signal bars, copy button |
| **Reality Atomizer** | 8–12 | Finance, Amazon, GitHub, YC hiring cards |

Each source card shows: signal direction (↑/↓/→), status badge, metric rows, summary line, and **View source →** evidence links. Skeleton cards appear during streaming and resolve one-by-one. Failed wires render as red cards with **RETRY SCAN**.

---

## Example Analyses

| Target | Narrative signal | Reality signal | Verdict |
|--------|------------------|----------------|---------|
| **Byju's** | 480 peak articles, national edtech hype | $22B → insolvency, 10k+ layoffs | Hype dominates |
| **Cursor** | Quiet coverage (18 articles) | 340 GitHub repos, 89 YC hiring cos | Reality exceeds |
| **Humane AI Pin** | Influencer launch frenzy | Flat commits, 2.1★ reviews, hiring freeze | Hype dominates |
| **Tesla FSD** | Autopilot breakthrough headlines | Mixed finance, repo activity | Narrative deviation |
| **WeWork** | Peak unicorn narrative | Bankruptcy, valuation collapse | Hype dominates |

Curated demos load instantly from `lib/demo-data.ts`. **Run Live** executes the full Wire pipeline.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4 |
| Transport | Server-Sent Events (SSE) |
| Data | Anakin Wire API (`X-API-Key`) |
| Scoring | Rule-based extractors (`lib/extractors.ts`) |
| Verdict | Signal-count tree + Δ-Sigma (`lib/discrepancy.ts`) |
| Prose | Google Gemini Flash (optional) |
| Cache | In-memory Map, 2-hour TTL (`lib/wire-cache.ts`) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- [Anakin API key](https://anakin.io)
- [Gemini API key](https://aistudio.google.com/apikey) (optional)

### Installation

```bash
git clone https://github.com/Aasritha6/axiom.git
cd axiom
npm install
cp .env.example .env.local
```

Configure `.env.local`:

```env
ANAKIN_API_KEY=<anakin-api-key>
GEMINI_API_KEY=<gemini-api-key>
```

### Development

```bash
npm run dev
```

Open `http://localhost:3000`. Enter a query or click a featured demo card.

### Production

```bash
npm run build
npm start
```

### Utility commands

```bash
npm run recon -- --test "Byju's"   # Smoke-test all 8 Wire actions
npm run catalog                    # Fetch Anakin Wire catalog
```

---

## Deployment

Axiom deploys to [Vercel](https://vercel.com) without extra configuration:

1. Import `Aasritha6/axiom` from GitHub.
2. Set `ANAKIN_API_KEY` and `GEMINI_API_KEY` in project environment variables.
3. Deploy.

The SSE route uses `runtime = "nodejs"` and `maxDuration = 60` for long-running Wire polls. Live scans typically complete in 30–60 seconds across eight parallel sources.

---

## Project Structure

```
axiom/
├── app/
│   ├── page.tsx                      # Terminal shell + EventSource client
│   └── api/axiom/stream/route.ts     # SSE orchestrator
├── components/
│   ├── VerdictMatrix.tsx             # Δ-Sigma gauge, verdict display
│   ├── NarrativePanel.tsx            # Left hemisphere
│   ├── RealityPanel.tsx              # Right hemisphere
│   ├── FeaturedCarousel.tsx          # Demo query selector
│   ├── SourceCard.tsx                # Per-wire result card
│   ├── FailedWireCard.tsx            # Error state + retry
│   ├── DeltaSigmaGauge.tsx           # Visual divergence meter
│   └── WireSkeletonCard.tsx          # Streaming placeholder
├── lib/
│   ├── anakin.ts                     # Wire client + fallbacks
│   ├── extractors.ts                 # Sentiment + evidence extraction
│   ├── discrepancy.ts                # Verdict engine
│   ├── demo-data.ts                  # Curated demo matrices
│   ├── gemini.ts                     # Optional LLM synthesis
│   ├── wire-cache.ts                 # In-memory response cache
│   └── config/sources.ts             # Wire source registry
├── config/wire-actions.json          # Verified action IDs
└── scripts/
    ├── recon.js                      # Wire smoke tests
    └── fetch-catalog.js              # Catalog discovery
```

---

## License

MIT License — Anakin Build-a-thon 2026.

<p align="center">
  <strong>Axiom</strong> — because the story and the substance are rarely the same.<br/>
  Built by <a href="https://github.com/Aasritha6">Aasritha</a> · Powered by <a href="https://anakin.io">Anakin.io Wire</a>
</p>
