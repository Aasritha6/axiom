# ◈ AXIOM — Narrative vs. Ground Truth Terminal

> **Forensic intelligence for the hype age.** Axiom exposes the mathematical divergence between manufactured public narrative and verifiable operational reality — built for the [Anakin.io](https://anakin.io) Build-a-thon.

**Live demo:** Deploy to Vercel (see [Deploy](#deploy-to-vercel)) · **Repo:** [github.com/Aasritha6/axiom](https://github.com/Aasritha6/axiom)

---

## The Problem

Every major product launch follows the same arc: loud media narrative, influencer amplification, and bullish headlines — while GitHub commits flatline, hiring freezes, and reviews collapse. Investors and consumers have no single view that compares **story** vs **substance**.

**Axiom** is a Bloomberg-style forensic terminal that runs eight parallel [Anakin Wire](https://anakin.io) scrapers, scores narrative vs. reality hemispheres, and renders a quantified **Δ-Sigma verdict** with optional Gemini synthesis.

---

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│  USER QUERY  ──►  SSE /api/axiom/stream                         │
└────────────────────────────┬────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
   NARRATIVE (×4)       VERDICT ENGINE      REALITY (×4)
   gn_search            Signal counts       yf_quote
   gn_related           Δ-Sigma gauge       am_search_products
   rt_search            Gemini prose        gh_search_repos
   yt_search                                yc_search_companies
         │                   │                   │
         └───────────────────┴───────────────────┘
                             ▼
              HYPE DOMINATES · ALIGNED · REALITY EXCEEDS
```

1. **Dispatch** — Eight Wire actions fire in parallel via `POST /v1/wire/task`.
2. **Extract** — Rule-based keyword scoring on readable text fields only (not raw JSON).
3. **Synthesize** — Signal-count decision tree + weighted Δ-Sigma (`narrative × 0.6 − reality × 1.4`).
4. **Stream** — Results arrive as SSE events; UI shows LIVE / WIRE CACHE / FAILED badges per source.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4, monospace terminal theme |
| Data | Anakin Wire API (8 verified actions) |
| Streaming | Server-Sent Events (SSE) |
| Synthesis | Google Gemini Flash (optional, free tier) |
| Cache | In-memory Wire cache (2h TTL, serverless-safe) |

---

## Anakin Wire Integration

All eight sources verified via `GET /v1/wire/catalog/{slug}`:

| Hemisphere | Source | Action ID | Catalog |
|------------|--------|-----------|---------|
| **Narrative** | Google News Search | `gn_search` | google_news |
| **Narrative** | Related Coverage | `gn_related` | google_news |
| **Narrative** | Reddit Search | `rt_search` | reddit |
| **Narrative** | YouTube Search | `yt_search` | youtube |
| **Reality** | Yahoo Finance Quote | `yf_quote` | yahoo_finance |
| **Reality** | Amazon Products | `am_search_products` | amazon |
| **Reality** | GitHub Repos | `gh_search_repos` | github |
| **Reality** | YC Hiring | `yc_search_companies` | ycombinator |

**Fallbacks:** Reddit public JSON, Yahoo Finance chart API (no credits burned).

```bash
npm run recon -- --test "Byju's"   # smoke-test all 8 wires
npm run catalog                    # re-fetch full Anakin catalog
```

---

## Verdict Engine

### Signal counts (primary)
Each source → `BULLISH` / `BEARISH` / `NEUTRAL` via keyword density on title/body fields.

### Δ-Sigma (display gauge)
```
avgN = mean(narrative sentiments)
avgR = mean(reality sentiments)
Δ-Sigma = (avgN × 0.6) − (avgR × 1.4)
```

| Δ-Sigma | Verdict |
|---------|---------|
| > +0.5 | HYPE DOMINATES REALITY |
| −0.5 to +0.5 | CONSENSUS ALIGNED |
| < −0.5 | REALITY EXCEEDS HYPE |

### Gemini synthesis (optional)
Adds Bloomberg-style prose ending with: `ESTIMATED RISK EXPOSURE: $X`

---

## Featured Demo Queries

| Query | Story | Expected Verdict |
|-------|-------|------------------|
| **Byju's** | India's $22B edtech hype → NCLT insolvency | HYPE DOMINATES |
| **Cursor** | Quiet narrative, massive GitHub/hiring reality | REALITY EXCEEDS |
| **Humane AI Pin** | Peak launch hype, zero execution | HYPE DOMINATES |
| **Tesla FSD** | Polarizing, high-variance | CONSENSUS / DEVIATION |
| **WeWork** | Unicorn narrative vs bankruptcy | HYPE DOMINATES |

Each card offers **📦 CACHED** (instant curated demo) and **⚡ RUN LIVE** (real Wire calls).

---

## Local Setup

### Prerequisites
- Node.js 18+
- Anakin API key ([anakin.io](https://anakin.io))
- Gemini API key optional ([aistudio.google.com/apikey](https://aistudio.google.com/apikey))

### Install

```bash
git clone https://github.com/Aasritha6/axiom.git
cd axiom
npm install
cp .env.example .env.local
```

### Environment variables (`.env.local`)

```bash
ANAKIN_API_KEY="your_anakin_key"
GEMINI_API_KEY="your_gemini_key"   # optional but recommended for demo
```

### Run

```bash
npm run dev
# → http://localhost:3000

# Or on Windows:
RUN-AXIOM.bat
```

### Production build

```bash
npm run build
npm start
```

---

## Deploy to Vercel

Vercel is the recommended host (Next.js native, zero config).

### Option A — GitHub import (easiest)

1. Push repo to GitHub (already at `Aasritha6/axiom`).
2. Go to [vercel.com/new](https://vercel.com/new) → Import `Aasritha6/axiom`.
3. **Environment Variables** (Project Settings → Environment Variables):

   | Name | Value |
   |------|-------|
   | `ANAKIN_API_KEY` | Your Anakin key |
   | `GEMINI_API_KEY` | Your Gemini key |

4. Click **Deploy**. Vercel auto-detects Next.js.

### Option B — Vercel CLI

```bash
npm i -g vercel
cd axiom
vercel
# follow prompts, then:
vercel env add ANAKIN_API_KEY
vercel env add GEMINI_API_KEY
vercel --prod
```

### Deployment notes

| Topic | Detail |
|-------|--------|
| **SSE timeout** | Live Wire scans can take 30–60s. Route sets `maxDuration = 60`. Use **📦 CACHED** for judging if live scan times out on Hobby tier. |
| **Wire cache** | In-memory (2h TTL). Resets on cold start — safe for serverless, no filesystem needed. |
| **Secrets** | Never commit `.env.local`. Set vars in Vercel dashboard only. |
| **SSL** | Vercel handles HTTPS automatically. |

### Troubleshooting deploy

| Issue | Fix |
|-------|-----|
| Build fails on Vercel | Run `npm run build` locally first; fix TypeScript errors |
| Live scan returns empty | Check `ANAKIN_API_KEY` in Vercel env vars; redeploy |
| Gemini prose missing | Add `GEMINI_API_KEY`; without it, rule-based explanation still works |
| `UNABLE_TO_VERIFY_LEAF_SIGNATURE` locally | `npm install --strict-ssl=false` (corporate proxy) |
| Stream cuts off at 10s | Upgrade Vercel plan or use cached demo mode |

---

## 60-Second Demo Script (for judges)

1. **Open app** → show terminal UI, 8-source header.
2. **Click Byju's → 📦 CACHED** → narrative panel fills (480 articles), reality shows NCLT/ layoffs → **HYPE DOMINATES** + red Δ-Sigma gauge.
3. **Click Cursor → 📦 CACHED** → quiet narrative, 340 GitHub repos → **REALITY EXCEEDS HYPE** (green gauge).
4. **Click Humane → ⚡ RUN LIVE** → show LIVE badges streaming in, skeleton cards disappearing per source.
5. **COPY VERDICT** → paste Gemini synthesis with `ESTIMATED RISK EXPOSURE`.
6. Mention: *"Eight parallel Anakin Wire actions, rule-based scoring, optional Gemini — no Claude credits burned."*

---

## Project Structure

```
axiom/
├── app/
│   ├── page.tsx                 # Terminal UI + EventSource client
│   ├── layout.tsx
│   └── api/axiom/stream/        # SSE dispatcher
├── components/
│   ├── VerdictMatrix.tsx        # Δ-Sigma gauge + copy button
│   ├── NarrativePanel.tsx       # Left brain
│   ├── RealityPanel.tsx         # Right brain
│   ├── FeaturedCarousel.tsx     # Cached + Live buttons
│   └── SourceCard.tsx           # LIVE / FAILED / evidence links
├── lib/
│   ├── anakin.ts                # Wire poller + fallbacks
│   ├── extractors.ts            # Keyword sentiment + URL extraction
│   ├── discrepancy.ts           # Verdict engine
│   ├── demo-data.ts             # Curated demo matrices
│   ├── gemini.ts                # Optional synthesis
│   └── wire-cache.ts            # In-memory 2h cache
├── config/wire-actions.json     # Verified action IDs
└── scripts/recon.js             # Wire smoke tests
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Run production server |
| `npm run recon -- --test "Tesla"` | Smoke-test 8 Wire actions |
| `npm run catalog` | Fetch full Anakin Wire catalog |

---

## License

MIT — built for the Anakin Build-a-thon 2026.

**Built by Aasritha** · Powered by [Anakin.io Wire](https://anakin.io)
