import {env} from 'cloudflare:workers';

export async function GET(_request: Request, {params}: {params: Promise<{filename: string}>}) {
  const {filename} = await params;
  if (!/^[a-f0-9-]{36}\.(?:jpg|png|webp)$/.test(filename)) return new Response('Not found', {status: 404});
  if (!env.BUCKET) return new Response('Image storage unavailable', {status: 503});
  const object = await env.BUCKET.get(filename);
  if (!object) return new Response('Not found', {status: 404});
  return new Response(object.body, {headers: {
    'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
    'Content-Length': String(object.size), 'ETag': object.httpEtag,
    'Cache-Control': 'private, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'",
  }});
}
