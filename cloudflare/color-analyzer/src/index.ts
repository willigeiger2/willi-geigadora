export interface Env {
  AI: Ai;
  COLOR_TOKEN: string;
  CLASSIFIER_DB: D1Database;
  CF_ACCOUNT_ID: string;
  CF_API_TOKEN: string;
  PREFERRED_VARIANTS?: string;
}

// Color definitions in RGB
const COLORS = {
  Red: [255, 0, 0],
  Orange: [255, 165, 0],
  Yellow: [255, 255, 0],
  Green: [0, 255, 0],
  Blue: [0, 0, 255],
  Purple: [128, 0, 128],
  Brown: [139, 69, 19],
  Black: [0, 0, 0],
  White: [255, 255, 255],
  Gray: [128, 128, 128],
};

type ColorName = keyof typeof COLORS;

// Calculate color distance in RGB space
function colorDistance(rgb1: number[], rgb2: number[]): number {
  const rDiff = rgb1[0] - rgb2[0];
  const gDiff = rgb1[1] - rgb2[1];
  const bDiff = rgb1[2] - rgb2[2];
  return Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);
}

// Extract dominant colors using Workers AI vision model
async function analyzeImageColors(env: Env, imageUrl: string): Promise<Record<ColorName, number>> {
  const colorNames = Object.keys(COLORS) as ColorName[];
  const colorList = colorNames.join(", ");
  
  // Create a prompt asking the AI to analyze dominant colors
  const prompt = `Analyze the dominant colors in this image. For each of these color categories, estimate what percentage of the image's visual area is that color: ${colorList}. Return ONLY valid JSON with these exact color names as keys and numeric percentages as decimal values (0 to 1, where 1 = 100%). The values should sum to approximately 1.0. Example format: {"Red": 0.3, "Orange": 0.1, "Yellow": 0.05, "Green": 0.05, "Blue": 0.05, "Purple": 0.05, "Brown": 0.1, "Black": 0.2, "White": 0.05, "Gray": 0.05}`;
  
  let raw: any;
  try {
    // Try URL input first
    raw = await (env.AI as any).run("@cf/llava-hf/llava-1.5-7b-hf", { 
      image: imageUrl, 
      prompt, 
      temperature: 0 
    });
  } catch (_e) {
    // Fallback to bytes
    const res = await fetch(imageUrl, { cf: { cacheEverything: false } } as RequestInit);
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    raw = await (env.AI as any).run("@cf/llava-hf/llava-1.5-7b-hf", { 
      image: Array.from(bytes), 
      prompt, 
      temperature: 0 
    });
  }
  
  const text: string = typeof raw === 'string' ? raw : (raw?.response ?? raw?.text ?? JSON.stringify(raw));
  
  // Parse JSON response
  let parsed: any = null;
  try {
    parsed = JSON.parse(text);
  } catch {}
  
  // Try to extract JSON from description field
  if (parsed && typeof parsed === 'object' && typeof parsed.description === 'string') {
    try { parsed = JSON.parse(parsed.description); } catch { parsed = null; }
  }
  
  // Try to extract first {...} block
  if (!parsed) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const inner = text.slice(start, end + 1);
      try { parsed = JSON.parse(inner); } catch { parsed = null; }
    }
  }
  
  // Build scores from parsed response
  const scores: Record<string, number> = {};
  for (const colorName of colorNames) {
    const value = parsed ? parsed[colorName] : undefined;
    scores[colorName] = typeof value === 'number' ? Math.max(0, Math.min(1, value)) : 0;
  }
  
  // Normalize to sum to 1
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  const normalized: Record<string, number> = {};
  for (const [color, score] of Object.entries(scores)) {
    normalized[color] = total > 0 ? score / total : 1 / colorNames.length;
  }
  
  return normalized as Record<ColorName, number>;
}

// Extract pixel samples from image by directly parsing image format
async function extractPixelSamples(arrayBuffer: ArrayBuffer): Promise<number[][]> {
  try {
    // Try to use Workers' built-in image decoding if available
    if (typeof createImageBitmap !== 'undefined' && typeof OffscreenCanvas !== 'undefined') {
      const blob = new Blob([arrayBuffer]);
      const imageBitmap = await createImageBitmap(blob);
      const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get 2d context');
      
      ctx.drawImage(imageBitmap, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      const pixels: number[][] = [];
      const sampleRate = Math.max(1, Math.floor(data.length / (1000 * 4)));
      
      for (let i = 0; i < data.length; i += (4 * sampleRate)) {
        pixels.push([data[i], data[i + 1], data[i + 2]]);
      }
      
      return pixels;
    }
    
    // Fallback: Use a simple heuristic based on image bytes
    // This is a very rough approximation that samples bytes from the image data
    // In practice, this will pick up some pixel data from JPEG/PNG format
    const bytes = new Uint8Array(arrayBuffer);
    const pixels: number[][] = [];
    
    // Skip header (first ~500 bytes typically contain metadata)
    // Sample evenly throughout the rest of the file
    const start = Math.min(500, Math.floor(bytes.length * 0.1));
    const sampleCount = 1000;
    const step = Math.max(3, Math.floor((bytes.length - start) / (sampleCount * 3)));
    
    for (let i = start; i < bytes.length - 2 && pixels.length < sampleCount; i += step) {
      // Take groups of 3 bytes as RGB (rough approximation)
      pixels.push([bytes[i], bytes[i + 1], bytes[i + 2]]);
    }
    
    return pixels;
  } catch (e) {
    console.error('Error extracting pixels:', e);
    return [];
  }
}

// Database helpers
async function ensureSchema(env: Env) {
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
}

async function upsertClassification(
  env: Env,
  imageId: string,
  imageUrl: string,
  model: string,
  scores: Record<ColorName, number>
) {
  const now = new Date().toISOString();
  const modelTop = Object.entries(scores)
    .map(([label, score]) => ({ label, score }))
    .sort((a, b) => b.score - a.score);
  const modelTopJson = JSON.stringify(modelTop);
  
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

// Cloudflare Images API
type ImagesListResponse = {
  result?: {
    images?: Array<{
      id: string;
      variants?: string[];
    }>;
  };
  success?: boolean;
  errors?: any[];
};

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
  for (const p of preferred) {
    const hit = entries.find((e) => e.name === p);
    if (hit) return hit.url;
  }
  return variants[0];
}

function parsePreferredVariants(env: Env): string[] {
  const s = env.PREFERRED_VARIANTS?.trim();
  if (!s) return ["480contain", "public"];
  return s.split(/\s*,\s*/).map((v) => v.toLowerCase()).filter(Boolean);
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const auth = request.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token || token !== env.COLOR_TOKEN) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }

    const url = new URL(request.url);
    const pathname = url.pathname;

    if (pathname === "/_health") {
      return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
    }

    if (pathname === "/results" && request.method === "GET") {
      try {
        await ensureSchema(env);
        const cursor = parseInt(url.searchParams.get("cursor") || "0");
        const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
        const imageId = url.searchParams.get("image_id");
        const model = url.searchParams.get("model") || "color-analyzer";
        
        const clauses: string[] = ["id > ?1"];
        const binds: any[] = [cursor];
        if (imageId) { clauses.push("image_id = ?2"); binds.push(imageId); }
        clauses.push("model = ?" + (binds.length + 1));
        binds.push(model);
        
        const where = "WHERE " + clauses.join(" AND ");
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
        
        return new Response(JSON.stringify({ ok: true, items, nextCursor }), {
          headers: { "content-type": "application/json" }
        });
      } catch (e: any) {
        return new Response(JSON.stringify({ ok: false, error: String(e?.message || e) }), {
          status: 500,
          headers: { "content-type": "application/json" }
        });
      }
    }

    if (pathname === "/_test") {
      try {
        const imageUrl = url.searchParams.get("url");
        if (!imageUrl) {
          return new Response(JSON.stringify({ ok: false, error: "Missing url parameter" }), {
            status: 400,
            headers: { "content-type": "application/json" }
          });
        }
        
        const scores = await analyzeImageColors(env, imageUrl);
        return new Response(JSON.stringify({ ok: true, url: imageUrl, scores }), {
          headers: { "content-type": "application/json" }
        });
      } catch (e: any) {
        return new Response(JSON.stringify({ ok: false, error: String(e?.message || e), stack: e?.stack }), {
          status: 500,
          headers: { "content-type": "application/json" }
        });
      }
    }

    if (pathname === "/upload" && request.method === "POST") {
      try {
        await ensureSchema(env);
        
        const body = await request.json() as any;
        const { image_id, image_url, colors } = body;
        
        if (!image_id || !colors || typeof colors !== 'object') {
          return new Response(JSON.stringify({ 
            ok: false, 
            error: 'Missing required fields: image_id, colors' 
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        // Validate colors object has the right structure
        const colorNames = ['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Purple', 'Brown', 'Black', 'White', 'Gray'];
        const scores: Record<string, number> = {};
        
        for (const colorName of colorNames) {
          const value = colors[colorName];
          if (typeof value === 'number' && value >= 0 && value <= 1) {
            scores[colorName] = value;
          } else {
            scores[colorName] = 0;
          }
        }
        
        const model = 'color-analyzer';
        await upsertClassification(env, image_id, image_url || '', model, scores as Record<ColorName, number>);
        
        return new Response(JSON.stringify({ 
          ok: true, 
          image_id,
          message: 'Color analysis uploaded successfully' 
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ 
          ok: false, 
          error: String(err?.message || err) 
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    if (pathname === "/batch" && request.method === "POST") {
      try {
        await ensureSchema(env);
        const perPage = Math.min(parseInt(url.searchParams.get("per_page") || "50"), 100);
        const max = parseInt(url.searchParams.get("max") || "200");
        const force = url.searchParams.get("force") === "1";
        const page = parseInt(url.searchParams.get("start_page") || "1");
        const model = "color-analyzer";

        let processed = 0;
        let upserted = 0;
        let skipped = 0;
        const errors: Array<{ imageId?: string; url?: string; error: string }> = [];
        const preferred = parsePreferredVariants(env);

        const { data } = await listImagesByPage(env, perPage, page);
        const images = data.result?.images || [];
        
        for (const img of images) {
          if (processed >= max) break;
          processed++;
          
          const variantUrl = chooseVariant(img.variants, preferred) || '';
          if (!variantUrl) {
            errors.push({ imageId: img.id, error: "No variant URL" });
            continue;
          }
          
          if (!force && await existsClassification(env, img.id, model)) {
            skipped++;
            continue;
          }
          
          try {
            const scores = await analyzeImageColors(env, variantUrl);
            await upsertClassification(env, img.id, variantUrl, model, scores);
            upserted++;
          } catch (e: any) {
            errors.push({ imageId: img.id, url: variantUrl, error: String(e?.message || e) });
          }
        }

        return new Response(
          JSON.stringify({
            model,
            perPage,
            max,
            processed,
            upserted,
            skipped,
            errors,
            force
          }),
          { headers: { "content-type": "application/json" } }
        );
      } catch (err: any) {
        return new Response(JSON.stringify({ error: String(err?.message || err) }), {
          status: 500,
          headers: { "content-type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  },
};
