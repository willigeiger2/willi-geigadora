export interface Env {
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

// Extract dominant colors using simple sampling and clustering
async function analyzeImageColors(imageUrl: string): Promise<Record<ColorName, number>> {
  // Fetch the image
  const res = await fetch(imageUrl, { cf: { cacheEverything: false } } as RequestInit);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  
  const blob = await res.blob();
  const arrayBuffer = await blob.arrayBuffer();
  
  // For Workers, we'll use a simple approach: decode image and sample pixels
  // Note: This is a simplified version. For production, you might want to use
  // a proper image processing library or external API
  
  // Sample pixels from the image
  const pixels = await extractPixelSamples(arrayBuffer);
  
  if (pixels.length === 0) {
    throw new Error('Failed to extract pixels from image - Canvas API may not be available');
  }
  
  // Score against each color
  const scores: Record<string, number> = {};
  const colorNames = Object.keys(COLORS) as ColorName[];
  
  for (const colorName of colorNames) {
    const targetRgb = COLORS[colorName];
    let totalScore = 0;
    
    // For each sampled pixel, calculate inverse distance to target color
    for (const pixel of pixels) {
      const distance = colorDistance(pixel, targetRgb);
      // Convert distance to score (0-1), closer = higher score
      // Max distance in RGB space is sqrt(3 * 255^2) ≈ 441
      const score = Math.max(0, 1 - (distance / 441));
      totalScore += score;
    }
    
    // Average score across all pixels
    scores[colorName] = pixels.length > 0 ? totalScore / pixels.length : 0;
  }
  
  // Normalize scores to sum to 1
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  const normalized: Record<string, number> = {};
  for (const [color, score] of Object.entries(scores)) {
    normalized[color] = total > 0 ? score / total : 0;
  }
  
  return normalized as Record<ColorName, number>;
}

// Extract pixel samples from image using Canvas API
async function extractPixelSamples(arrayBuffer: ArrayBuffer): Promise<number[][]> {
  try {
    // Create a blob from the array buffer
    const blob = new Blob([arrayBuffer]);
    
    // Create an ImageBitmap from the blob (supported in Workers)
    const imageBitmap = await createImageBitmap(blob);
    
    // Create an offscreen canvas
    const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2d context');
    
    // Draw the image
    ctx.drawImage(imageBitmap, 0, 0);
    
    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data; // RGBA array
    
    // Sample pixels (every Nth pixel to keep it manageable)
    const pixels: number[][] = [];
    const sampleRate = Math.max(1, Math.floor(data.length / (1000 * 4))); // Sample ~1000 pixels
    
    for (let i = 0; i < data.length; i += (4 * sampleRate)) {
      pixels.push([
        data[i],     // R
        data[i + 1], // G
        data[i + 2]  // B
        // Skip alpha channel (data[i + 3])
      ]);
    }
    
    return pixels;
  } catch (e) {
    console.error('Error extracting pixels:', e);
    // Fallback to empty array if decoding fails
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

    if (pathname === "/_test") {
      try {
        const imageUrl = url.searchParams.get("url");
        if (!imageUrl) {
          return new Response(JSON.stringify({ ok: false, error: "Missing url parameter" }), {
            status: 400,
            headers: { "content-type": "application/json" }
          });
        }
        
        const scores = await analyzeImageColors(imageUrl);
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
            const scores = await analyzeImageColors(variantUrl);
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
