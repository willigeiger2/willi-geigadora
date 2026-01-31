import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const model = url.searchParams.get('model') || '@cf/llava-hf/llava-1.5-7b-hf';
  const category = url.searchParams.get('category') || '';
  const minStr = url.searchParams.get('min') || '0.5';
  const limitStr = url.searchParams.get('limit') || '1000';
  const cursorStr = url.searchParams.get('cursor') || '';
  
  const min = Number(minStr);
  const limit = Number(limitStr);

  // Get classifier worker URL from env or use default
  // Route to color-analyzer worker if model=color-analyzer
  let WORKER_BASE_URL = import.meta.env.CLASSIFIER_BASE_URL || 'https://image-classifier-worker.willigeiger.workers.dev';
  if (model === 'color-analyzer') {
    WORKER_BASE_URL = 'https://color-analyzer-worker.willigeiger.workers.dev';
  }
  const CLASSIFY_TOKEN = import.meta.env.CLASSIFY_TOKEN || '';

  try {
    // Fetch from classifier worker
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (CLASSIFY_TOKEN) {
      headers['Authorization'] = `Bearer ${CLASSIFY_TOKEN}`;
    }

    const workerUrl = new URL('/results', WORKER_BASE_URL);
    workerUrl.searchParams.set('model', model);
    if (category) workerUrl.searchParams.set('category', category);
    if (minStr) workerUrl.searchParams.set('min', minStr);
    if (limitStr) workerUrl.searchParams.set('limit', limitStr);
    if (cursorStr) workerUrl.searchParams.set('cursor', cursorStr);

    const res = await fetch(workerUrl.toString(), { headers });
    if (!res.ok) {
      return new Response(JSON.stringify({ error: 'Failed to fetch results' }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('Error fetching results:', e);
    return new Response(JSON.stringify({ error: e.message || 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
