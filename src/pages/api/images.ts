export const prerender = false;

export async function GET() {
  const accountId = import.meta.env.CLOUDFLARE_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = import.meta.env.CLOUDFLARE_IMAGES_TOKEN || process.env.CLOUDFLARE_IMAGES_TOKEN;

  if (!accountId || !apiToken) {
    return new Response(
      JSON.stringify({ error: "Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_IMAGES_TOKEN" }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }

  try {
    const perPage = 100; // Cloudflare supports pagination; keep requests modest
    let page = 1;
    const all: any[] = [];
    let totalCount: number | undefined = undefined;

    while (true) {
      const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1?page=${page}&per_page=${perPage}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${apiToken}` },
      });
      if (!res.ok) {
        const text = await res.text();
        return new Response(
          JSON.stringify({ error: "Cloudflare API error", detail: text, page }),
          { status: 502, headers: { "content-type": "application/json" } }
        );
      }
      const data: any = await res.json();
      const batch: any[] = (data?.result?.images || []);
      totalCount = totalCount ?? data?.result?.total_count ?? data?.result_info?.total_count;
      for (const img of batch) {
        all.push({
          id: img.id,
          filename: img.filename,
          uploaded: img.uploaded,
          variants: img.variants,
          meta: img.meta || {},
        });
      }
      // Stop if fewer than perPage returned, or we've reached reported total_count, or safety cap
      if (batch.length < perPage) break;
      if (typeof totalCount === 'number' && all.length >= totalCount) break;
      page += 1;
      if (page > 50) break; // safety to avoid runaway
    }

    return new Response(JSON.stringify({ images: all }), {
      status: 200,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: "Unexpected error", detail: err?.message || String(err) }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
