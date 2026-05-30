#!/usr/bin/env node
/** Smoke-test all 8 Axiom Wire actions */

const WIRE_TASK = "https://anakin.io/v1/wire/task";
const WIRE_JOBS = "https://anakin.io/v1/wire/jobs";

const ACTIONS = [
  { id: "gn_search", params: (q) => ({ query: q, when: "", after: "", before: "", country: "", language: "en", limit: 5 }) },
  { id: "gn_related", params: (q) => ({ query: q, when: "", country: "", language: "en", limit: 5 }) },
  { id: "rt_search", params: (q) => ({ query: q, sort: "relevance", time: "month", limit: 5 }) },
  { id: "yt_search", params: (q) => ({ query: q, limit: 3 }) },
  { id: "yf_quote", params: (q) => ({ ticker: q.toLowerCase().includes("tesla") ? "TSLA" : "AAPL" }) },
  { id: "am_search_products", params: (q) => ({ query: q, page: 1, limit: 5, sort: "rating_high" }) },
  { id: "gh_search_repos", params: (q) => ({ query: q, sort: "stars", order: "desc", per_page: 5, page: 1 }) },
  { id: "yc_search_companies", params: (q) => ({ query: q, is_hiring: true, hits_per_page: 5, page: 0 }) },
];

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runAction(apiKey, actionId, params) {
  const init = await fetch(WIRE_TASK, {
    method: "POST",
    headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ action_id: actionId, params }),
  });
  if (!init.ok) return { ok: false, error: `${init.status}: ${(await init.text()).slice(0, 120)}` };

  const task = await init.json();
  if (task.result ?? task.data) return { ok: true, result: task.result ?? task.data };
  if (task.status === "completed") return { ok: true, result: task.result };

  const jobId = task.job_id ?? task.id;
  if (!jobId) return { ok: true, result: task };

  for (let i = 0; i < 20; i++) {
    await sleep(1500);
    const poll = await fetch(`${WIRE_JOBS}/${jobId}`, {
      headers: { "X-API-Key": apiKey },
    });
    if (!poll.ok) continue;
    const data = await poll.json();
    if (data.status === "completed" || data.result) {
      return { ok: true, result: data.result ?? data.data ?? data };
    }
    if (data.status === "failed") return { ok: false, error: "job failed" };
  }
  return { ok: false, error: "timeout" };
}

async function main() {
  const apiKey = process.env.ANAKIN_API_KEY;
  if (!apiKey) {
    console.error("❌ Set ANAKIN_API_KEY in .env.local");
    process.exit(1);
  }

  const query = process.argv.includes("--test")
    ? process.argv[process.argv.indexOf("--test") + 1] ?? "Tesla"
    : "Tesla";

  console.log(`🔍 Smoke test · 8 Wire actions · query="${query}"\n`);

  let passed = 0;
  for (const action of ACTIONS) {
    process.stdout.write(`  ${action.id.padEnd(22)} … `);
    const result = await runAction(apiKey, action.id, action.params(query));
    if (result.ok) {
      passed++;
      console.log(`✅  ${JSON.stringify(result.result).slice(0, 80)}…`);
    } else {
      console.log(`❌  ${result.error}`);
    }
  }

  console.log(`\n${passed}/8 actions succeeded.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
