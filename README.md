<p align="center">
  <img src="screenshot.png" alt="Axiom forensic terminal" width="100%" />
</p>

<h1 align="center">Axiom</h1>

<p align="center">
  <strong>Narrative vs. ground truth — in one forensic view.</strong><br/>
  Eight live data wires. Auditable scoring. Bloomberg-style terminal UX.
</p>

<p align="center">
  <a href="https://axiom-gold-three.vercel.app/"><img src="https://img.shields.io/badge/demo-live-00ff41?style=for-the-badge&labelColor=000000" alt="Live demo" /></a>
  <a href="https://github.com/Aasritha6/axiom"><img src="https://img.shields.io/badge/source-GitHub-ffffff?style=for-the-badge&labelColor=000000" alt="GitHub" /></a>
  <a href="https://anakin.io"><img src="https://img.shields.io/badge/powered_by-Anakin_Wire-ffb000?style=for-the-badge&labelColor=000000" alt="Anakin Wire" /></a>
</p>

<p align="center">
  <a href="https://axiom-gold-three.vercel.app/">axiom-gold-three.vercel.app</a>
</p>

---

## Overview

Markets and media run on stories. Operations run on facts. **Axiom** measures the gap between them.

Given any company or product, Axiom pulls **eight parallel sources** through [Anakin Wire](https://anakin.io)—news, social, video on the narrative side; finance, commerce, code, and hiring on the reality side—then scores each wire with **transparent, rule-based logic**. The result is a single verdict, a **Δ-Sigma divergence gauge**, and evidence you can open in one click.

No black-box sentiment. No invented numbers. Verdicts are computed in code; optional Gemini prose is grounded strictly on wire facts.

---

## Why it exists

| The problem | What Axiom does |
|-------------|-----------------|
| Hype cycles (WeWork, Humane, Byju's) | Surfaces when narrative volume outruns operational signals |
| Quiet winners (Cursor) | Flags when developer and hiring traction exceed media coverage |
| Opaque AI summaries | Every card shows metrics, signal direction, and a **View source →** link |
| Slow research workflows | Live scans stream results over SSE as each wire completes (~30–60s) |

---

## Highlights

- **Split-brain sourcing** — 4 narrative + 4 reality wires in parallel  
- **Δ-Sigma metric** — Weighted divergence from −2 (reality-led) to +2 (narrative-led)  
- **Rule-based scoring** — Keyword and structured extractors; reproducible per source  
- **Real-time terminal** — Cards arrive wire-by-wire; **RUN LIVE** with pulsing live indicator  
- **Resilient pipeline** — Partial failures never kill a scan; Reddit/Yahoo fallbacks + 2h wire cache  
- **Rules decide, LLM narrates** — Gemini writes prose from a facts JSON payload only when configured  

---

## See it in action

Open the [live demo](https://axiom-gold-three.vercel.app/) — the **Cursor** matrix loads automatically so the verdict panel is never empty.

| Target | Narrative | Reality | Typical verdict |
|--------|-----------|---------|-----------------|
| **Cursor** | Quiet press | Strong GitHub + YC hiring | Reality exceeds hype |
| **Byju's** | Peak edtech hype | Insolvency, layoffs | Hype dominates |
| **Humane AI Pin** | Launch frenzy | Weak repos, poor reviews | Hype dominates |
| **WeWork** | Unicorn narrative | Bankruptcy trajectory | Hype dominates |

Use **📦 CACHED** for instant curated playback, or **⚡ RUN LIVE** on any featured query for the full Wire + SSE experience.

---

## How it works

```
Query → 8× Anakin Wire (parallel) → per-source extractors → discrepancy engine → verdict + Δ-Sigma
                                                                              ↓
                                                         optional Gemini narrative (facts-only)
```

1. **Intake** — Search bar or featured demo (Cursor, Byju's, Humane, Tesla FSD, WeWork).  
2. **Extract** — Each wire returns metrics, signal (↑/↓/→), summary, and evidence URLs.  
3. **Score** — Volume-weighted sentiments feed a decision tree and Δ-Sigma clamp.  
4. **Stream** — Browser receives `wire_resolved` events over Server-Sent Events until `final_verdict`.  
5. **Explain** — Rule-based forensic copy always available; Gemini adds grounded narrative on live scans when `GEMINI_API_KEY` is set.

---

## Architecture

```
┌──────────────────────── Browser (React 19) ────────────────────────┐
│  Narrative Matrix │ Forensic Synthesis (Δ-Sigma) │ Reality Atomizer │
└──────────────────────────────┬─────────────────────────────────────┘
                               │ SSE  GET /api/axiom/stream
┌──────────────────────── Next.js 15 ────────────────────────────────┐
│  Demo matrices · Wire cache (2h) · 8× parallel jobs · extractors   │
│  discrepancy.ts (verdict) · gemini.ts (optional grounded prose)    │
└──────────────────────────────┬─────────────────────────────────────┘
                               │ Anakin Wire API
│  gn_search · gn_related · rt_search · yt_search                    │
│  yf_quote · am_search_products · gh_search_repos · yc_search_*     │
```

**Narrative wires:** Google News, Related, Reddit, YouTube  
**Reality wires:** Yahoo Finance, Amazon, GitHub, YC Hiring  

Fallbacks: Reddit JSON API and Yahoo Chart when primary Wire actions fail.

---

## Scoring (auditable)

**Per source** — Readable text is scanned for hype/stress/growth keywords; finance, GitHub, Amazon, and hiring use structured fields. Signals: BULLISH / BEARISH / NEUTRAL.

**Δ-Sigma**

```
Δ-Sigma = clamp((avgNarrative × 0.6) − (avgReality × 1.4), −2, +2)
```

**Verdict tree** (requires ≥2 sources per hemisphere)

| Pattern | Label |
|---------|--------|
| High narrative volume, weak reality | HYPE DOMINATES REALITY |
| Low narrative, strong reality | REALITY EXCEEDS HYPE |
| Narrative bullish count ≫ reality | NARRATIVE DEVIATION |
| Otherwise | CONSENSUS ALIGNED |

**Gemini layer** — When enabled, receives a strict `facts` object (verdict, metrics, URLs, snippets). Output is validated; unknown URLs are stripped. On failure, rule-based `buildForensicExplanation()` is used. The UI labels **AI-grounded** vs **Rule-based** narrative.

---

## Tech stack

| Layer | Choice |
|-------|--------|
| App | Next.js 15 (App Router), React 19, TypeScript |
| UI | Tailwind CSS v4, terminal grid layout |
| Data | Anakin Wire (`X-API-Key`) |
| Transport | Server-Sent Events |
| Scoring | `lib/extractors.ts`, `lib/discrepancy.ts` |
| Prose | Google Gemini Flash (optional) |

---

## Quick start

**Prerequisites:** Node.js 18+, [Anakin API key](https://anakin.io), optional [Gemini key](https://aistudio.google.com/apikey)

```bash
git clone https://github.com/Aasritha6/axiom.git
cd axiom
npm install
cp .env.example .env.local
```

`.env.local`:

```env
ANAKIN_API_KEY=your_anakin_key
GEMINI_API_KEY=your_gemini_key
```

```bash
npm run dev    # http://localhost:3000
npm run build  # production build
```

**Deploy (Vercel):** Import the repo, set `ANAKIN_API_KEY` and `GEMINI_API_KEY`, deploy. The stream route uses `runtime = "nodejs"` with `maxDuration = 60`.

**Utilities**

```bash
npm run recon -- --test "Cursor"   # smoke-test all 8 wires
npm run catalog                    # refresh Wire catalog
```

---

## Project layout

```
app/
  page.tsx                    Terminal shell + SSE client
  api/axiom/stream/route.ts   Orchestrator
components/                   Panels, cards, gauge, carousel
lib/
  anakin.ts                   Wire client + fallbacks
  extractors.ts               Per-source scoring
  discrepancy.ts              Verdict + Δ-Sigma
  gemini.ts                   Grounded narrative
  demo-data.ts                Curated matrices
```

---

## Built for

**Anakin Build-a-thon** — demonstrating production-grade Wire integration, transparent forensic scoring, and a terminal UX built for analysts, investors, and journalists who need evidence, not vibes.

---

## License

MIT · [Aasritha](https://github.com/Aasritha6) · [Anakin.io](https://anakin.io)

<p align="center">
  <sub>The story and the substance are rarely the same.</sub>
</p>
