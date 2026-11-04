import {env} from 'cloudflare:workers';
import {assertSameOrigin, getAdminContext} from '@/server/store-data';
import {StoreError} from '@/lib/operations';
import {readProductImage} from '@/server/media';

export async function POST(request: Request) {
  try {
    const context = await getAdminContext(request);
    if (!context.initialized) throw new StoreError(409, 'Set up store management before uploading images.');
    assertSameOrigin(request);
    if (!env.BUCKET) throw new StoreError(503, 'Image storage is unavailable. Please try again later.');
    let image;
    try { image = await readProductImage(request); } catch (error) { throw new StoreError(400, error instanceof Error ? error.message : 'The image could not be read.'); }
    const filename = `${crypto.randomUUID()}.${image.extension}`;
    await env.BUCKET.put(filename, image.bytes, {httpMetadata: {contentType: image.contentType}});
    return Response.json({url: `/api/media/${filename}`}, {status: 201, headers: {'Cache-Control': 'no-store'}});
  } catch (error) {
    return Response.json({error: error instanceof StoreError ? error.message : 'The image could not be saved. Try again.'}, {status: error instanceof StoreError ? error.status : 500, headers: {'Cache-Control': 'no-store'}});
  }
}
