export interface Env {
  AI: Ai;
  CLASSIFY_TOKEN: string;
  LABELS?: string;
  LABEL_HINTS?: string; // optional semicolon-separated hints merged into LLaVA prompt
  // Batch + storage
  CLASSIFIER_DB: D1Database;
  CF_ACCOUNT_ID: string; // for Images API
  CF_API_TOKEN: string;  // secret for Images API
  PREFERRED_VARIANTS?: string; // comma-separated list like "480contain,public"
}

// --- Results reader ---
async function readResults(env: Env, opts: { cursor?: number; limit?: number; imageId?: string | null; model?: string | null }) {
  const { cursor = 0, limit = 50, imageId = null, model = null } = opts || {} as any;
  const clauses: string[] = ["id > ?1"]; // cursor
  const binds: any[] = [cursor];
  if (imageId) { clauses.push("image_id = ?" + (binds.length + 1)); binds.push(imageId); }
  if (model) { clauses.push("model = ?" + (binds.length + 1)); binds.push(model); }
  const where = clauses.length ? ("WHERE " + clauses.join(" AND ")) : "";
  const sql = `SELECT id, image_id, image_url, model, model_top_json, computed_at
               FROM classifications ${where}
               ORDER BY id ASC
               LIMIT ?${binds.length + 1}`;
  binds.push(limit);
  const stmt = env.CLASSIFIER_DB.prepare(sql);
  const result = await stmt.bind(...binds).all();
  const items = (result.results || []).map((r: any) => ({
    id: r.id,
    image_id: r.image_id,
    image_url: r.image_url,
    model: r.model,
    model_top: JSON.parse(r.model_top_json || "[]"),
    computed_at: r.computed_at,
  }));
  const nextCursor = items.length ? items[items.length - 1].id : cursor;
  return { items, nextCursor };
}

const DEFAULT_LABELS = [
  "People",
  "Pets",
  "Wildlife",
  "Landscape",
  "Urban",
];

function parseLabels(env: Env): string[] {
  const s = env.LABELS?.trim();
  if (!s) return DEFAULT_LABELS;
  const arr = s.split(',').map((x) => x.trim()).filter(Boolean);
  return arr.length ? arr : DEFAULT_LABELS;
}

function parseLabelHints(env: Env): string {
  const s = env.LABEL_HINTS?.trim();
  return s || '';
}

function parsePreferredVariants(env: Env): string[] {
  const s = env.PREFERRED_VARIANTS?.trim();
  if (!s) return ["480contain", "public"]; // sensible defaults
  return s.split(/\s*,\s*/).map((v) => v.toLowerCase()).filter(Boolean);
}

function softmax(values: number[]): number[] {
  // numerical stability
  const max = Math.max(...values);
  const exps = values.map((v) => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => (sum ? e / sum : 0));
}

async function readImageAsArrayBuffer(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url, { cf: { cacheEverything: false } } as RequestInit);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  const ct = res.headers.get("content-type") || "";
  if (!ct.startsWith("image/")) throw new Error(`URL is not an image. content-type: ${ct}`);
  const buf = await res.arrayBuffer();
  // Optional: basic size guard (20MB)
  const MAX = 20 * 1024 * 1024;
  if (buf.byteLength > MAX) throw new Error("Image too large (>20MB)");
  return buf;
}

// --- D1 storage helpers ---
async function ensureSchema(env: Env) {
  // Use prepare().run() (more reliable than exec in some environments)
  await env.CLASSIFIER_DB
    .prepare(`CREATE TABLE IF NOT EXISTS classifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      image_id TEXT NOT NULL,
      image_url TEXT NOT NULL,
      model TEXT NOT NULL,
      model_top_json TEXT NOT NULL,
      computed_at TEXT NOT NULL,
      UNIQUE(image_id, model)
    );`)
    .run();
  // Lightweight connectivity check
  await env.CLASSIFIER_DB.prepare(`SELECT 1`).first();
}

async function upsertClassification(
  env: Env,
  imageId: string,
  imageUrl: string,
  model: string,
  modelTop: { label: string; score: number }[],
) {
  const now = new Date().toISOString();
  const modelTopJson = JSON.stringify(modelTop.slice(0, 20));
  await env.CLASSIFIER_DB
    .prepare(
      `INSERT INTO classifications (image_id, image_url, model, model_top_json, computed_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(image_id, model)
       DO UPDATE SET image_url=excluded.image_url, model_top_json=excluded.model_top_json, computed_at=excluded.computed_at`
    )
    .bind(imageId, imageUrl, model, modelTopJson, now)
    .run();
}

async function existsClassification(env: Env, imageId: string, model: string): Promise<boolean> {
  const row = await env.CLASSIFIER_DB
    .prepare('SELECT id FROM classifications WHERE image_id = ?1 AND model = ?2 LIMIT 1')
    .bind(imageId, model)
    .first();
  return !!row;
}

// --- Model runner ---
async function classifyWithResNet(env: Env, imageUrl: string): Promise<{ label: string; score: number }[]> {
  const image = await readImageAsArrayBuffer(imageUrl);
  // Model expects Uint8 array of image bytes
  const bytes = new Uint8Array(image);
  const result: { label: string; score: number }[] = await (env.AI as any).run("@cf/microsoft/resnet-50", {
    image: Array.from(bytes),
  });
  return result;
}

async function classifyWithLLaVA(env: Env, imageUrl: string, categories: string[], modelName: string): Promise<{ label: string; score: number }[]> {
  const cats = categories && categories.length > 0 ? categories : DEFAULT_LABELS;
  const format = cats.map((c) => `"${c}": <0..1>`).join(", ");
  const hints = parseLabelHints(env);
  const hintText = hints ? ` Definitions: ${hints}.` : '';
  const prompt = `Classify this image into the following categories with a confidence from 0 to 1. Categories: ${cats.join(", ")}.${hintText} Return ONLY strict JSON with keys exactly these categories and numeric values between 0 and 1. Example: { ${format} }.`;
  let raw: any;
  try {
    // Prefer URL input for multimodal VLMs on Workers AI
    raw = await (env.AI as any).run(modelName, { image: imageUrl, prompt, temperature: 0 });
  } catch (_e) {
    // Fallback to bytes if URL input is not accepted
    const image = await readImageAsArrayBuffer(imageUrl);
    const bytes = new Uint8Array(image);
    raw = await (env.AI as any).run(modelName, { image: Array.from(bytes), prompt, temperature: 0 });
  }
  const text: string = typeof raw === 'string' ? raw : (raw?.response ?? raw?.text ?? JSON.stringify(raw));
  return parseScoresFromText(text, cats);
}

function parseScoresFromText(text: string, cats: string[]): { label: string; score: number }[] {
  // Attempt 1: direct JSON
  let obj: any = null;
  try {
    obj = JSON.parse(text);
  } catch {}
  // Some models wrap JSON inside a description field
  if (obj && typeof obj === 'object' && typeof obj.description === 'string') {
    const inner = obj.description;
    try { obj = JSON.parse(inner); } catch { obj = null; }
  }
  // Attempt 2: extract first {...} block
  if (!obj) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const inner = text.slice(start, end + 1);
      try { obj = JSON.parse(inner); } catch { obj = null; }
    }
  }
  const result: { label: string; score: number }[] = [];
  for (const k of cats) {
    const v = Number(obj ? obj[k] : NaN);
    const s = Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0;
    result.push({ label: k, score: s });
  }
  return result;
}

// --- Cloudflare Images API ---
type ImagesListResponse = {
  result?: {
    images?: Array<{
      id: string;
      variants?: string[];
    }>;
    total_count?: number;
    continuation_token?: string;
  };
  result_info?: {
    page?: number;
    per_page?: number;
    count?: number;
    total_count?: number;
    cursor?: string; // Some APIs return a single cursor
    cursors?: { before?: string; after?: string }; // Others use before/after
  };
  success?: boolean;
  errors?: any[];
};

async function listImagesByCursor(env: Env, perPage: number, cursor?: string): Promise<{ data: ImagesListResponse; nextCursor: string | null }> {
  const base = `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/images/v2`;
  const qs = new URLSearchParams();
  if (perPage) qs.set("per_page", String(perPage));
  if (cursor) {
    // Support both styles used by Images API
    qs.set("cursor", cursor);
    qs.set("continuation_token", cursor);
  }
  const endpoint = `${base}?${qs.toString()}`;
  const res = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${env.CF_API_TOKEN}`,
    },
  });
  const data = (await res.json()) as ImagesListResponse;
  if (!res.ok || data?.success === false) {
    throw new Error(`Images API error: ${res.status} ${JSON.stringify(data?.errors || data)}`);
  }
  const nextCursor =
    data?.result_info?.cursor ||
    data?.result_info?.cursors?.after ||
    data?.result?.continuation_token ||
    null;
  return { data, nextCursor };
}

async function listImagesByPage(env: Env, perPage: number, page: number): Promise<{ data: ImagesListResponse; pageNext: number | null }> {
  const base = `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/images/v1`;
  const qs = new URLSearchParams();
  if (perPage) qs.set("per_page", String(perPage));
  if (page) qs.set("page", String(page));
  const endpoint = `${base}?${qs.toString()}`;
  const res = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${env.CF_API_TOKEN}`,
    },
  });
  const data = (await res.json()) as ImagesListResponse;
  if (!res.ok || data?.success === false) {
    throw new Error(`Images API error: ${res.status} ${JSON.stringify(data?.errors || data)}`);
  }
  const images = data.result?.images || [];
  const pageNext = images.length < perPage ? null : page + 1;
  return { data, pageNext };
}

// Choose best variant URL by preferred names, else try to infer biggest size >= 400, else first
function chooseVariant(variants: string[] | undefined, preferred: string[]): string | null {
  if (!variants || variants.length === 0) return null;
  const entries = variants.map((u) => {
    try {
      const name = new URL(u).pathname.split('/').filter(Boolean).pop() || '';
      return { url: u, name: name.toLowerCase() };
    } catch {
      const parts = u.split('/');
      const name = parts[parts.length - 1]?.toLowerCase() || '';
      return { url: u, name };
    }
  });
  // 1) Preferred list by exact match
  for (const p of preferred) {
    const hit = entries.find((e) => e.name === p);
    if (hit) return hit.url;
  }
  // 2) Pick a variant suggesting bigger size
  const sized = entries
    .map((e) => {
      const m = e.name.match(/(\d{2,5})/g);
      const nums = (m || []).map((n) => parseInt(n, 10)).filter((n) => !Number.isNaN(n));
      const maxNum = nums.length ? Math.max(...nums) : -1;
      return { ...e, size: maxNum };
    })
    .sort((a, b) => b.size - a.size);
  if (sized.length && sized[0].size >= 400) return sized[0].url;
  // 3) Fallback: first
  return variants[0];
}


function normalize(s: string): string {
  return s.toLowerCase();
}

function matchesKeyword(label: string, keyword: string): boolean {
  const l = normalize(label);
  const k = normalize(keyword);
  if (k.includes(" ")) {
    // phrase: substring match
    return l.includes(k);
  }
  // single token: word boundary regex
  const rx = new RegExp(`\\b${k.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`);
  return rx.test(l);
}

function scoreFromKeywords(results: { label: string; score: number }[], keywords: string[]) {
  const matched: { label: string; score: number; keyword: string }[] = [];
  let s = 0;
  for (const r of results) {
    for (const k of keywords) {
      if (matchesKeyword(r.label, k)) {
        matched.push({ label: r.label, score: r.score, keyword: k });
        s += r.score;
        break; // avoid double counting a result across multiple keywords in same category
      }
    }
  }
  return { score: Math.min(1, s), matched };
}

function computeCategoryScores(results: { label: string; score: number }[]) {
  // Heuristic keyword lists to map ImageNet labels to our categories
  const peopleKw = [
    "person",
    "man",
    "woman",
    "boy",
    "girl",
    "bride",
    "groom",
    "scuba diver",
    "diver",
    "football player",
    "basketball player",
    "soccer player",
    "runner",
    "swimmer",
    "skier",
  ];

  const petsKw = [
    // generic
    "dog", "puppy", "canine", "cat", "kitten", "feline", "house cat",
    // cats
    "tabby", "tabby cat", "tiger cat", "siamese cat", "persian cat", "egyptian cat", "maine coon", "british shorthair", "scottish fold", "sphynx", "ragdoll", "bengal",
    // dogs (popular breeds)
    "labrador retriever", "golden retriever", "german shepherd", "bulldog", "poodle", "beagle", "rottweiler", "yorkshire terrier", "boxer", "dachshund", "pug", "chihuahua", "husky", "alaskan malamute", "corgi", "shiba", "shiba inu",
  ];

  const wildlifeKw = [
    "bear",
    "fox",
    "wolf",
    "lion",
    "tiger",
    "elephant",
    "zebra",
    "giraffe",
    "deer",
    "otter",
    "raccoon",
    "squirrel",
    "bird",
    "eagle",
    "hawk",
    "owl",
    "penguin",
    "seal",
    "walrus",
    "whale",
    "dolphin",
    "fox",
    "badger",
  ];

  const urbanKw = [
    "car",
    "bus",
    "truck",
    "bicycle",
    "motor scooter",
    "motorcycle",
    "train",
    "tram",
    "traffic light",
    "stoplight",
    "street sign",
    "parking meter",
    "building",
    "skyscraper",
    "bridge",
  ];

  const landscapeKw = [
    "mountain",
    "alp",
    "volcano",
    "valley",
    "cliff",
    "promontory",
    "lakeside",
    "seashore",
    "beach",
    "sandbar",
    "coral reef",
    "forest",
    "woodland",
    "iceberg",
    "geyser",
    "desert",
    "dune",
  ];

  const people = scoreFromKeywords(results, peopleKw);
  const pets = scoreFromKeywords(results, petsKw);
  // Exclude pet terms from wildlife by subtracting overlap
  const wildlifeAll = scoreFromKeywords(results, wildlifeKw);
  const wildlife = Math.max(0, wildlifeAll.score - pets.score);
  const urban = scoreFromKeywords(results, urbanKw);
  // Landscape as either direct nature keywords, or complement if urban/people/pets/wildlife are low
  const landscapeBase = scoreFromKeywords(results, landscapeKw);
  const otherMax = Math.max(people.score, pets.score, wildlife, urban.score);
  const landscape = Math.max(landscapeBase.score, 1 - otherMax);

  const raw = [people.score, pets.score, wildlife, landscape, urban.score];
  const probs = softmax(raw);
  return {
    raw,
    probs,
    debug: {
      people: people.matched,
      pets: pets.matched,
      wildlife: wildlifeAll.matched,
      urban: urban.matched,
      landscape: landscapeBase.matched,
    },
  };
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Auth: require Authorization: Bearer <token>
    const auth = request.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token || token !== env.CLASSIFY_TOKEN) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }

    const url = new URL(request.url);
    // Routing: / -> single classify via ?url=..., /batch -> enumerate Images API and store
    // Diagnostics: /_health, /_test_d1, /_test_images
    const pathname = url.pathname;

    if (pathname === "/_health") {
      return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
    }

    if (pathname === "/_test_d1") {
      try {
        if (!env.CLASSIFIER_DB || typeof (env.CLASSIFIER_DB as any).exec !== "function") {
          return new Response(
            JSON.stringify({ ok: false, stage: "binding", error: "CLASSIFIER_DB binding is missing or invalid" }),
            { status: 500, headers: { "content-type": "application/json" } }
          );
        }
        await ensureSchema(env);
        return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
      } catch (e: any) {
        return new Response(JSON.stringify({ ok: false, stage: "ensureSchema", error: String(e?.message || e) }), { status: 500, headers: { "content-type": "application/json" } });
      }
    }

    if (pathname === "/_test_images") {
      try {
        const perPage = Math.min(parseInt(url.searchParams.get("per_page") || "1"), 100);
        const mode = (url.searchParams.get("mode") || "cursor").toLowerCase();
        let data: ImagesListResponse;
        let nextCursor: string | null = null;
        let pageNext: number | null = null;
        if (mode === "page") {
          const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
          const r = await listImagesByPage(env, perPage, page);
          data = r.data; pageNext = r.pageNext;
        } else {
          const cursor = url.searchParams.get("cursor") || undefined;
          const r = await listImagesByCursor(env, perPage, cursor);
          data = r.data; nextCursor = r.nextCursor;
        }
        const imgs = data.result?.images || [];
        const ids = imgs.map((i) => i.id).slice(0, 3);
        const preferred = parsePreferredVariants(env);
        const chosen = imgs[0] ? chooseVariant(imgs[0].variants, preferred) : null;
        return new Response(JSON.stringify({
          ok: true,
          nextCursor,
          pageNext,
          result_info: data.result_info || null,
          ids,
          chosenVariant: chosen,
          sample: imgs.slice(0, 1),
        }), { headers: { "content-type": "application/json" } });
      } catch (e: any) {
        return new Response(JSON.stringify({ ok: false, stage: "listImages", error: String(e?.message || e) }), { status: 500, headers: { "content-type": "application/json" } });
      }
    }

    if (pathname === "/_bindings") {
      const has = (v: any) => (v ? true : false);
      const info = {
        AI: has((env as any).AI),
        CLASSIFIER_DB: has((env as any).CLASSIFIER_DB),
        CF_ACCOUNT_ID: typeof env.CF_ACCOUNT_ID === "string" && env.CF_ACCOUNT_ID.length > 0,
      };
      return new Response(JSON.stringify({ ok: true, bindings: info }), { headers: { "content-type": "application/json" } });
    }

    if (pathname === "/_counts") {
      try {
        await ensureSchema(env);
        const totalRow = await env.CLASSIFIER_DB.prepare('SELECT COUNT(*) AS n FROM classifications').first();
        const distinctRow = await env.CLASSIFIER_DB
          .prepare('SELECT COUNT(DISTINCT image_id || "|" || model) AS n FROM classifications')
          .first();
        const maxIdRow = await env.CLASSIFIER_DB.prepare('SELECT MAX(id) AS max_id FROM classifications').first();
        return new Response(
          JSON.stringify({
            ok: true,
            total: (totalRow as any)?.n ?? 0,
            distinct_pairs: (distinctRow as any)?.n ?? 0,
            max_id: (maxIdRow as any)?.max_id ?? null,
          }),
          { headers: { "content-type": "application/json" } }
        );
      } catch (e: any) {
        return new Response(JSON.stringify({ ok: false, error: String(e?.message || e) }), { status: 500, headers: { "content-type": "application/json" } });
      }
    }

    if (pathname === "/_test_llava") {
      try {
        const imageUrl = url.searchParams.get("url");
        if (!imageUrl) {
          return new Response(JSON.stringify({ ok: false, error: "Missing required query param: url" }), { status: 400, headers: { "content-type": "application/json" } });
        }
        const model = url.searchParams.get("model") || "@cf/llava-hf/llava-1.5-7b-hf";
        const cats = parseLabels(env);
        const format = cats.map((c) => `"${c}": <0..1>`).join(", ");
        const hints = parseLabelHints(env);
        const hintText = hints ? ` Definitions: ${hints}.` : '';
        const prompt = `Classify this image into the following categories with a confidence from 0 to 1. Categories: ${cats.join(", ")}.${hintText} Return ONLY strict JSON with keys exactly these categories and numeric values between 0 and 1. Example: { ${format} }.`;

        let raw: any;
        let used = "url";
        try {
          raw = await (env.AI as any).run(model, { image: imageUrl, prompt, temperature: 0 });
        } catch (_e) {
          used = "bytes";
          const bytes = Array.from(new Uint8Array(await readImageAsArrayBuffer(imageUrl)));
          raw = await (env.AI as any).run(model, { image: bytes, prompt, temperature: 0 });
        }
        const text: string = typeof raw === 'string' ? raw : (raw?.response ?? raw?.text ?? JSON.stringify(raw));
        // Robust parse: JSON, then description inner JSON, then first {...} block
        let parsedAny: any = null;
        try { parsedAny = JSON.parse(text); } catch {}
        if (parsedAny && typeof parsedAny === 'object' && typeof parsedAny.description === 'string') {
          try { parsedAny = JSON.parse(parsedAny.description); } catch { parsedAny = null; }
        }
        if (!parsedAny) {
          const start = text.indexOf('{');
          const end = text.lastIndexOf('}');
          if (start >= 0 && end > start) {
            const inner = text.slice(start, end + 1);
            try { parsedAny = JSON.parse(inner); } catch { parsedAny = null; }
          }
        }
        const scores = cats.map((k) => ({ label: k, score: Math.max(0, Math.min(1, Number(parsedAny ? parsedAny[k] : 0) || 0)) }));
        return new Response(
          JSON.stringify({ ok: true, model, input: used, url: imageUrl, text, parsed: parsedAny || {}, scores }),
          { headers: { "content-type": "application/json" } }
        );
      } catch (e: any) {
        return new Response(JSON.stringify({ ok: false, error: String(e?.message || e) }), { status: 500, headers: { "content-type": "application/json" } });
      }
    }

    if (pathname === "/results" && request.method === "GET") {
      try {
        if (!env.CLASSIFIER_DB) {
          return new Response(JSON.stringify({ ok: false, error: "D1 binding missing" }), { status: 500, headers: { "content-type": "application/json" } });
        }
        const cursor = parseInt(url.searchParams.get("cursor") || "0");
        const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
        const imageId = url.searchParams.get("image_id");
        const model = url.searchParams.get("model");
        const data = await readResults(env, { cursor, limit, imageId, model });
        return new Response(JSON.stringify({ ok: true, ...data }), { headers: { "content-type": "application/json" } });
      } catch (e: any) {
        return new Response(JSON.stringify({ ok: false, error: String(e?.message || e) }), { status: 500, headers: { "content-type": "application/json" } });
      }
    }

    if (pathname === "/batch" && request.method === "POST") {
      try {
        let stage = "ensureSchema";
        await ensureSchema(env);
        const perPage = Math.min(parseInt(url.searchParams.get("per_page") || "50"), 100);
        const max = parseInt(url.searchParams.get("max") || "200");
        const requestedModel = url.searchParams.get("model") || "@cf/microsoft/resnet-50";
        const force = url.searchParams.get("force") === "1";
        const mode = (url.searchParams.get("mode") || "cursor").toLowerCase();
        let cursor = url.searchParams.get("start_cursor") || undefined;
        let page = parseInt(url.searchParams.get("start_page") || "0");

        let processed = 0;
        let upserted = 0;
        let skipped = 0;
        const errors: Array<{ imageId?: string; url?: string; error: string }> = [];
        const preferred = parsePreferredVariants(env);

        if (mode === "page") {
          // Single page per invocation (let the client loop pages)
          stage = "listImages";
          const startPage = page > 0 ? page : 1;
          const { data } = await listImagesByPage(env, perPage, startPage);
          const images = data.result?.images || [];
          for (const img of images) {
            if (processed >= max) break;
            processed++;
            const variantUrl = chooseVariant(img.variants, preferred) || '';
            if (!variantUrl) {
              errors.push({ imageId: img.id, error: "No variant URL" });
              continue;
            }
            // Skip if already exists for this model (unless force)
            const modelName = requestedModel;
            if (!force && await existsClassification(env, img.id, modelName)) {
              skipped++;
              continue;
            }
            try {
              stage = "classify";
              const result = requestedModel.startsWith("@cf/llava-hf/")
                ? await classifyWithLLaVA(env, variantUrl, parseLabels(env), requestedModel)
                : await classifyWithResNet(env, variantUrl);
              stage = "upsert";
              await upsertClassification(env, img.id, variantUrl, modelName, result);
              upserted++;
            } catch (e: any) {
              errors.push({ imageId: img.id, url: variantUrl, error: String(e?.message || e) });
            }
          }
        } else {
          // Loop via cursor until we reach max or no more results
          while (processed < max) {
            stage = "listImages";
            const { data, nextCursor } = await listImagesByCursor(env, perPage, cursor);
            const images = data.result?.images || [];
            if (images.length === 0) break;

            for (const img of images) {
              if (processed >= max) break;
              processed++;
              const variantUrl = chooseVariant(img.variants, preferred) || '';
              if (!variantUrl) {
                errors.push({ imageId: img.id, error: "No variant URL" });
                continue;
              }
              // Skip if already exists for this model (unless force)
              const modelName = requestedModel;
              if (!force && await existsClassification(env, img.id, modelName)) {
                skipped++;
                continue;
              }
              try {
                stage = "classify";
                const result = requestedModel.startsWith("@cf/llava-hf/")
                  ? await classifyWithLLaVA(env, variantUrl, parseLabels(env), requestedModel)
                  : await classifyWithResNet(env, variantUrl);
                stage = "upsert";
                await upsertClassification(env, img.id, variantUrl, modelName, result);
                upserted++;
              } catch (e: any) {
                errors.push({ imageId: img.id, url: variantUrl, error: String(e?.message || e) });
              }
            }

            if (!nextCursor) break; // no more
            cursor = nextCursor;
          }
        }

        return new Response(
          JSON.stringify({
            model: requestedModel,
            perPage,
            max,
            processed,
            upserted,
            skipped,
            errors,
            mode,
            force,
            nextCursor: cursor || null,
            startPage: page > 0 ? page : undefined,
          }),
          { headers: { "content-type": "application/json" } }
        );
      } catch (err: any) {
        return new Response(JSON.stringify({ stage: "batch", error: String(err?.message || err) }), {
          status: 500,
          headers: { "content-type": "application/json" },
        });
      }
    }

    // Default single classify mode (kept for ad-hoc testing)
    const imageUrl = url.searchParams.get("url");
    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "Missing required query param: url" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const labels = parseLabels(env);

    try {
      const result = await classifyWithResNet(env, imageUrl);

      const debug = url.searchParams.get("debug") === "1";
      const { raw, probs, debug: dbg } = computeCategoryScores(result);
      const scored = labels.map((label, i) => ({ label, raw: raw[i], prob: probs[i] }));
      // Sort descending by probability for convenience
      scored.sort((a, b) => b.prob - a.prob);

      const payload: any = {
        model: "@cf/microsoft/resnet-50",
        labels,
        scores: scored,
        modelTop: result.slice(0, 10),
      };
      if (debug) {
        payload.rawModelOutput = result;
        payload.matches = dbg;
      }
      return new Response(JSON.stringify(payload), { headers: { "content-type": "application/json" } });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: String(err?.message || err) }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }
  },
};
