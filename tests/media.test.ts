import assert from 'node:assert/strict';
import {readProductImage, MAX_IMAGE_BYTES} from '../server/media.ts';

const request = (bytes: Uint8Array, type: string) => new Request('https://westos.test/api/admin/media', {method:'POST', headers:{'Content-Type':type}, body:new Uint8Array(bytes).buffer});
const png = new Uint8Array(24); png.set([137,80,78,71,13,10,26,10]);
assert.equal((await readProductImage(request(png, 'image/png'))).extension, 'png');
await assert.rejects(readProductImage(request(png,'image/jpeg')), /do not match/);
await assert.rejects(readProductImage(request(new TextEncoder().encode('<svg onload="alert(1)"></svg>'),'image/svg+xml')), /JPEG/);
await assert.rejects(readProductImage(request(new Uint8Array(MAX_IMAGE_BYTES + 1),'image/png')), /smaller/);
console.log('Product image upload boundary checks passed.');
