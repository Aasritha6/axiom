#!/usr/bin/env node
/**
 * Full Anakin Wire catalog reconnaissance.
 * Discovers all catalogs + actions and picks 8 sources for Axiom.
 *
 * Usage:
 *   node scripts/fetch-catalog.js
 *   node scripts/fetch-catalog.js --save   # writes config/wire-catalog.json
 */

const BASE = "https://anakin.io/v1/wire";
const SSL_BYPASS = process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0";

const NARRATIVE_TERMS = [
  "news", "google", "reddit", "youtube", "tiktok", "social", "twitter", "hn", "hackernews", "trends",
];
const REALITY_TERMS = [
  "finance", "yahoo", "stock", "amazon", "steam", "review", "glassdoor", "linkedin", "indeed", "job", "github", "crypto",
];

async function apiGet(path, apiKey) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "X-API-Key": apiKey, Accept: "application/json" },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${path} → ${res.status}: ${text.slice(0, 200)}`);
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function flattenActions(catalogDetail) {
  const actions = catalogDetail?.actions ?? catalogDetail?.data?.actions ?? [];
  const slug = catalogDetail?.slug ?? catalogDetail?.catalog ?? catalogDetail?.name ?? "unknown";
  return actions.map((a) => ({
    action_id: a.action_id ?? a.id ?? a.slug,
    name: a.name ?? a.title ?? a.action_id,
    catalog: slug,
    category: a.category ?? "",
    description: a.description ?? "",
    async: a.async ?? a.is_async ?? false,
    credits: a.credits ?? a.cost ?? null,
    params: a.params ?? a.parameters ?? null,
  }));
}

function scoreAction(action, terms) {
  const hay = `${action.action_id} ${action.name} ${action.catalog} ${action.description}`.toLowerCase();
  for (let i = 0; i < terms.length; i++) {
    if (hay.includes(terms[i])) return terms.length - i;
  }
  return 0;
}

function pickBest(actions, terms, used) {
  const ranked = actions
    .filter((a) => a.action_id && !used.has(a.action_id))
    .map((a) => ({ action, score: scoreAction(a, terms) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return ranked[0]?.action ?? null;
}

async function main() {
  const apiKey = process.env.ANAKIN_API_KEY;
  if (!apiKey) {
    console.error("❌ Set ANAKIN_API_KEY in .env.local");
    process.exit(1);
  }

  if (!SSL_BYPASS) {
    console.log("Tip: if SSL fails, run: $env:NODE_TLS_REJECT_UNAUTHORIZED=\"0\"\n");
  }

  console.log("📡 Fetching Wire catalog list…\n");
  const catalogList = await apiGet("/catalog", apiKey);
  const catalogs =
    catalogList?.catalog ??
    catalogList?.catalogs ??
    catalogList?.data ??
    (Array.isArray(catalogList) ? catalogList : []);

  console.log(`Found ${catalogs.length} catalogs.\n`);

  const allActions = [];

  for (const cat of catalogs) {
    const slug = cat.slug ?? cat.id ?? cat.name;
    if (!slug) continue;
    try {
      process.stdout.write(`  ${slug} … `);
      const detail = await apiGet(`/catalog/${encodeURIComponent(slug)}`, apiKey);
      const actions = flattenActions({ ...detail, slug });
      allActions.push(...actions);
      console.log(`${actions.length} actions`);
    } catch (e) {
      console.log(`skip (${e.message?.slice(0, 60)})`);
    }
  }

  console.log(`\nTotal actions collected: ${allActions.length}\n`);

  // Pick 8 for Axiom: 4 narrative + 4 reality
  const used = new Set();
  const picks = {
    narrative: {},
    reality: {},
  };

  const narrativeSlots = [
    { key: "news", terms: ["gn_search", "news", "google_news", "headline"] },
    { key: "related", terms: ["gn_related", "related", "trending", "gn_trending"] },
    { key: "social", terms: ["reddit", "subreddit", "social"] },
    { key: "youtube", terms: ["youtube", "video", "tiktok"] },
  ];

  const realitySlots = [
    { key: "finance", terms: ["finance", "yahoo", "stock", "quote", "market"] },
    { key: "reviews", terms: ["amazon", "steam", "review", "product"] },
    { key: "jobs", terms: ["glassdoor", "linkedin", "indeed", "job", "hiring"] },
    { key: "github", terms: ["github", "commit", "repository", "repo"] },
  ];

  for (const slot of narrativeSlots) {
    const best = pickBest(allActions, slot.terms, used);
    if (best) {
      used.add(best.action_id);
      picks.narrative[slot.key] = best;
    }
  }

  for (const slot of realitySlots) {
    const best = pickBest(allActions, slot.terms, used);
    if (best) {
      used.add(best.action_id);
      picks.reality[slot.key] = best;
    }
  }

  console.log("═".repeat(60));
  console.log("RECOMMENDED 8 WIRE SOURCES FOR AXIOM");
  console.log("═".repeat(60));

  console.log("\nNARRATIVE (Left Brain):");
  for (const [key, action] of Object.entries(picks.narrative)) {
    console.log(`  ${key.padEnd(10)} → ${action.action_id} (${action.catalog}) — ${action.name}`);
  }

  console.log("\nREALITY (Right Brain):");
  for (const [key, action] of Object.entries(picks.reality)) {
    console.log(`  ${key.padEnd(10)} → ${action.action_id} (${action.catalog}) — ${action.name}`);
  }

  const envLines = [];
  const mapping = {
    ANAKIN_WIRE_NEWS: picks.narrative.news,
    ANAKIN_WIRE_RELATED: picks.narrative.related,
    ANAKIN_WIRE_REDDIT: picks.narrative.social,
    ANAKIN_WIRE_YOUTUBE: picks.narrative.youtube,
    ANAKIN_WIRE_FINANCE: picks.reality.finance,
    ANAKIN_WIRE_REVIEWS: picks.reality.reviews,
    ANAKIN_WIRE_JOBS: picks.reality.jobs,
    ANAKIN_WIRE_GITHUB: picks.reality.github,
  };

  console.log("\n" + "═".repeat(60));
  console.log(".env.local ENTRIES");
  console.log("═".repeat(60));
  for (const [envKey, action] of Object.entries(mapping)) {
    const val = action?.action_id ?? "NOT_FOUND";
    console.log(`${envKey}="${val}"`);
    envLines.push(`${envKey}="${val}"`);
  }

  // Also search endpoint for missing slots
  const missing = Object.entries(mapping).filter(([, a]) => !a);
  if (missing.length) {
    console.log("\n" + "═".repeat(60));
    console.log("SEARCH FALLBACK FOR MISSING SLOTS");
    console.log("═".repeat(60));
    for (const [envKey] of missing) {
      const term = envKey.replace("ANAKIN_WIRE_", "").toLowerCase();
      try {
        const search = await apiGet(`/search?q=${encodeURIComponent(term)}`, apiKey);
        const results = search?.results ?? search?.actions ?? search?.data ?? [];
        if (results.length) {
          console.log(`  ${term}: ${results.slice(0, 3).map((r) => r.action_id ?? r.id).join(", ")}`);
        }
      } catch {
        console.log(`  ${term}: search failed`);
      }
    }
  }

  if (process.argv.includes("--save")) {
    const fs = await import("fs");
    const path = await import("path");
    const out = path.join(process.cwd(), "config", "wire-catalog.json");
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(
      out,
      JSON.stringify({ fetchedAt: new Date().toISOString(), catalogs: catalogs.length, allActions, picks, env: mapping }, null, 2)
    );
    console.log(`\nSaved full catalog → ${out}`);
  }

  // Print google-news actions specifically
  const gn = allActions.filter((a) => a.catalog?.includes("google") || a.action_id?.startsWith("gn_"));
  if (gn.length) {
    console.log("\n" + "═".repeat(60));
    console.log(`GOOGLE NEWS ACTIONS (${gn.length})`);
    console.log("═".repeat(60));
    gn.forEach((a) => console.log(`  ${a.action_id} — ${a.name}`));
  }
}

main().catch((e) => {
  console.error("Fatal:", e.message ?? e);
  process.exit(1);
});
