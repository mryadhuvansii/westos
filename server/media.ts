export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export async function readProductImage(request: Request) {
  if (Number(request.headers.get('content-length') || 0) > MAX_IMAGE_BYTES) throw new Error('Choose an image smaller than 5 MB.');
  const type = request.headers.get('content-type')?.split(';')[0].trim();
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(type || '') || !request.body) throw new Error('Choose a JPEG, PNG or WebP image.');
  const reader = request.body.getReader(), chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const {value, done} = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_IMAGE_BYTES) { await reader.cancel(); throw new Error('Choose an image smaller than 5 MB.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  const signature = (start: number, expected: number[]) => expected.every((byte, index) => bytes[start + index] === byte);
  const valid = type === 'image/jpeg' ? length >= 4 && signature(0, [255, 216, 255])
    : type === 'image/png' ? length >= 24 && signature(0, [137, 80, 78, 71, 13, 10, 26, 10])
    : length >= 16 && signature(0, [82, 73, 70, 70]) && signature(8, [87, 69, 66, 80]);
  if (!valid) throw new Error('The file contents do not match the selected image format.');
  return {bytes, contentType: type!, extension: type === 'image/jpeg' ? 'jpg' : type === 'image/png' ? 'png' : 'webp'};
}
