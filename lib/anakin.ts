import { guessTicker } from "@/lib/config/sources";
interface WireTaskResponse {
  job_id?: string;
  id?: string;
  status?: "pending" | "running" | "completed" | "failed" | string;
  result?: unknown;
  data?: unknown;
}

const WIRE_TASK_BASE = "https://anakin.io/v1/wire/task";
const WIRE_JOBS_BASE = "https://anakin.io/v1/wire/jobs";
const MAX_POLL_ATTEMPTS = 20;
const POLL_INTERVAL_MS = 1500;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function wireHeaders(apiKey: string): HeadersInit {
  return {
    "X-API-Key": apiKey,
    "Content-Type": "application/json",
  };
}

function extractJobId(task: WireTaskResponse): string | undefined {
  return task.job_id ?? task.id;
}

function extractResult(task: WireTaskResponse): unknown {
  return task.result ?? task.data;
}

function isCompleted(status?: string): boolean {
  return status === "completed" || status === "success" || status === "done";
}

function isFailed(status?: string): boolean {
  return status === "failed" || status === "error";
}

/** Dispatch a Wire task with action-specific params */
export async function resolveAnakinWire(
  actionId: string,
  params: Record<string, unknown>,
  onStatusUpdate?: (message: string) => void
): Promise<unknown> {
  const apiKey = process.env.ANAKIN_API_KEY;
  if (!apiKey) throw new Error("Missing ANAKIN_API_KEY in .env.local");
  if (!actionId || actionId === "FILL_AFTER_RECON") {
    throw new Error(`Action ID not configured for ${actionId}`);
  }

  onStatusUpdate?.(`Dispatching ${actionId}…`);

  const initResponse = await fetch(WIRE_TASK_BASE, {
    method: "POST",
    headers: wireHeaders(apiKey),
    body: JSON.stringify({ action_id: actionId, params }),
  });

  if (initResponse.status === 429) {
    throw new Error("Rate limited (429)");
  }
  if (!initResponse.ok) {
    throw new Error(`Wire init failed (${initResponse.status}): ${await initResponse.text()}`);
  }

  const taskData = (await initResponse.json()) as WireTaskResponse;

  // Synchronous completion
  if (isCompleted(taskData.status)) {
    const result = extractResult(taskData);
    if (result !== undefined) return result;
  }

  // Immediate result without job polling
  const inline = extractResult(taskData);
  if (inline !== undefined && !extractJobId(taskData)) return inline;

  const jobId = extractJobId(taskData);
  if (!jobId) {
    // Some actions return payload directly
    return taskData;
  }

  onStatusUpdate?.(`Polling job ${jobId}…`);

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await sleep(POLL_INTERVAL_MS);

    const checkResponse = await fetch(`${WIRE_JOBS_BASE}/${jobId}`, {
      method: "GET",
      headers: wireHeaders(apiKey),
    });

    if (checkResponse.status === 429) {
      onStatusUpdate?.("Rate limited — backing off 5s");
      await sleep(5000);
      continue;
    }
    if (!checkResponse.ok) continue;

    const pollData = (await checkResponse.json()) as WireTaskResponse;
    onStatusUpdate?.(
      `Status: ${pollData.status ?? "unknown"} (${attempt + 1}/${MAX_POLL_ATTEMPTS})`
    );

    if (isCompleted(pollData.status)) {
      const result = extractResult(pollData);
      return result ?? pollData;
    }
    if (isFailed(pollData.status)) {
      throw new Error(`Job ${jobId} failed`);
    }
  }

  throw new Error(`Pipeline timeout for ${actionId}`);
}

export async function fetchRedditFallback(query: string): Promise<unknown> {
  const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&limit=10&sort=relevance&t=month`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "application/json",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Reddit fallback failed: ${res.status}`);
  return res.json();
}

/** Yahoo Finance chart API — no API key required */
export async function fetchYahooFinanceFallback(query: string): Promise<unknown> {
  const symbol = guessTicker(query);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1mo&includePrePost=false`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "application/json",
      "Referer": "https://finance.yahoo.com",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Yahoo Finance fallback failed: ${res.status}`);
  return res.json();
}

export async function resolveSourceWithFallback(
  actionId: string | undefined,
  params: Record<string, unknown> | undefined,
  query: string,
  fallback: "reddit_json" | "yahoo_finance" | undefined,
  onStatusUpdate?: (message: string) => void
): Promise<{ data: unknown; isLive: boolean; isFallback: boolean }> {
  if (actionId && actionId !== "FILL_AFTER_RECON" && params) {
    try {
      const data = await resolveAnakinWire(actionId, params, onStatusUpdate);
      return { data, isLive: true, isFallback: false };
    } catch (wireErr) {
      onStatusUpdate?.(
        `Wire fault: ${wireErr instanceof Error ? wireErr.message : wireErr}`
      );
      if (!fallback) throw wireErr;
    }
  }

  if (fallback === "reddit_json") {
    onStatusUpdate?.("Using Reddit public JSON fallback…");
    return {
      data: await fetchRedditFallback(query),
      isLive: true,
      isFallback: true,
    };
  }
  if (fallback === "yahoo_finance") {
    onStatusUpdate?.("Using Yahoo Finance fallback…");
    return {
      data: await fetchYahooFinanceFallback(query),
      isLive: true,
      isFallback: true,
    };
  }

  throw new Error("No Wire action configured and no fallback available");
}
