/**
 * Shrinks a photo in the browser BEFORE it is uploaded, so storage stays tiny and pages load fast.
 *  - longest side is cut to 1280 px (still enough to read small print on a poster or a price list)
 *  - re-encoded as WebP (JPEG where WebP is not available), quality walks down until the file is about 110 KB
 *  - EXIF data (including GPS location) is dropped, because the picture is redrawn on a canvas
 * A 4 MB phone photo ends up around 60 - 130 KB.
 */
export type Packed = { blob: Blob; ext: 'webp' | 'jpg'; width: number; height: number; before: number; after: number };

const MAX_SIDE = 1280;
const MIN_SIDE = 720;
const TARGET = 110 * 1024;   // aim for this
const HARD_MAX = 290 * 1024; // the bucket refuses anything above 300 KB
const START_Q = 0.72;
const MIN_Q = 0.42;

function toBlob(canvas: HTMLCanvasElement, type: string, q: number): Promise<Blob | null> {
  return new Promise(res => canvas.toBlob(b => res(b), type, q));
}

async function decode(file: File): Promise<{ src: CanvasImageSource; w: number; h: number; done: () => void }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as any);
      return { src: bmp, w: bmp.width, h: bmp.height, done: () => bmp.close() };
    } catch { /* fall back to <img> below */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return { src: img, w: img.naturalWidth, h: img.naturalHeight, done: () => {} };
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
}

export async function compressImage(file: File): Promise<Packed> {
  if (!/^image\//.test(file.type) && !/\.(jpe?g|png|webp|heic|heif|gif|bmp)$/i.test(file.name)) throw new Error('That file is not a photo');
  let img;
  try { img = await decode(file); } catch { throw new Error('This photo type is not supported. Try a JPG or PNG'); }
  try {
    if (!img.w || !img.h) throw new Error('This photo could not be read');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Your browser cannot process photos');
    // WebP is ~30% smaller than JPEG at the same look. Safari older than 14 cannot encode it: use JPEG there.
    const webp = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    const type = webp ? 'image/webp' : 'image/jpeg';
    let side = MAX_SIDE;
    let best: Blob | null = null, bw = 0, bh = 0;
    for (;;) {
      const k = Math.min(1, side / Math.max(img.w, img.h));
      const w = Math.max(1, Math.round(img.w * k)), h = Math.max(1, Math.round(img.h * k));
      canvas.width = w; canvas.height = h;
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); // transparent PNGs get a white background
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img.src, 0, 0, w, h);
      let q = START_Q;
      let blob = await toBlob(canvas, type, q);
      while (blob && blob.size > TARGET && q > MIN_Q) { q = Math.max(MIN_Q, q - 0.08); blob = await toBlob(canvas, type, q); }
      if (!blob) throw new Error('Could not shrink this photo');
      best = blob; bw = w; bh = h;
      if (blob.size <= TARGET || side <= MIN_SIDE) break;
      side = Math.max(MIN_SIDE, Math.round(side * 0.85)); // still too big: fewer pixels, then try again
    }
    if (!best || best.size > HARD_MAX) throw new Error('This photo is too detailed to shrink enough. Try another one');
    return { blob: best, ext: webp ? 'webp' : 'jpg', width: bw, height: bh, before: file.size, after: best.size };
  } finally {
    img.done();
  }
}

export const prettySize = (n: number) => n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
