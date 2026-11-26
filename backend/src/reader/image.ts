import sharp from 'sharp';

/**
 * Pixels as 3 bytes each, blue first (the order the OCR models were trained
 * on). Resizing and warping follow OpenCV, which the models' own pipeline
 * uses: no smoothing when shrinking, and the same cubic curve.
 */
export interface Image {
  width: number;
  height: number;
  data: Uint8Array;
}

export class UnreadableImageError extends Error {}

/** Well above any phone photo; keeps a tiny file from unpacking into gigabytes. */
const MAX_PIXELS = 60_000_000;

/** Decodes a JPEG / PNG / WebP, upright. */
export async function decode(file: Uint8Array): Promise<Image> {
  try {
    const { data, info } = await sharp(file, { limitInputPixels: MAX_PIXELS, failOn: 'none' })
      .autoOrient()
      .removeAlpha()
      .toColourspace('srgb')
      .raw()
      .toBuffer({ resolveWithObject: true });
    const pixels = info.width * info.height;
    const bgr = new Uint8Array(pixels * 3);
    for (let i = 0; i < pixels; i++) {
      const from = i * info.channels;
      // One channel: grey.
      bgr[i * 3] = data[info.channels === 3 ? from + 2 : from];
      bgr[i * 3 + 1] = data[info.channels === 3 ? from + 1 : from];
      bgr[i * 3 + 2] = data[from];
    }
    return { width: info.width, height: info.height, data: bgr };
  } catch (error) {
    throw new UnreadableImageError(error instanceof Error ? error.message : String(error));
  }
}

const clamp = (v: number, max: number) => (v < 0 ? 0 : v > max ? max : v);

/** Weights of the 4 pixels around a position (0 ≤ t < 1 past the second). */
function cubic(t: number): [number, number, number, number] {
  const A = -0.75;
  const w0 = ((A * (t + 1) - 5 * A) * (t + 1) + 8 * A) * (t + 1) - 4 * A;
  const w1 = ((A + 2) * t - (A + 3)) * t * t + 1;
  const u = 1 - t;
  const w2 = ((A + 2) * u - (A + 3)) * u * u + 1;
  return [w0, w1, w2, 1 - w0 - w1 - w2];
}

const linear = (t: number): [number, number] => [1 - t, t];

/** For each output position: the source positions to mix, and how much of each. */
function taps(from: number, to: number, kind: 'linear' | 'cubic') {
  const n = kind === 'cubic' ? 4 : 2;
  const index = new Int32Array(to * n);
  const weight = new Float32Array(to * n);
  for (let i = 0; i < to; i++) {
    const at = ((i + 0.5) * from) / to - 0.5;
    const base = Math.floor(at);
    const w = kind === 'cubic' ? cubic(at - base) : linear(at - base);
    for (let k = 0; k < n; k++) {
      index[i * n + k] = clamp(base + k - (n === 4 ? 1 : 0), from - 1);
      weight[i * n + k] = w[k];
    }
  }
  return { n, index, weight };
}

export function resize(img: Image, width: number, height: number, kind: 'linear' | 'cubic' = 'linear'): Image {
  if (width === img.width && height === img.height) return img;
  const across = taps(img.width, width, kind);
  const down = taps(img.height, height, kind);
  const out = new Uint8ClampedArray(width * height * 3);
  const rowLength = width * 3;

  // Source rows already resized across, kept while neighbouring output rows need them.
  const cache = new Map<number, Float32Array>();
  const row = (y: number) => {
    const known = cache.get(y);
    if (known) return known;
    const line = new Float32Array(rowLength);
    const start = y * img.width * 3;
    for (let x = 0; x < width; x++) {
      let b = 0;
      let g = 0;
      let r = 0;
      for (let k = x * across.n; k < (x + 1) * across.n; k++) {
        const p = start + across.index[k] * 3;
        const w = across.weight[k];
        b += img.data[p] * w;
        g += img.data[p + 1] * w;
        r += img.data[p + 2] * w;
      }
      line[x * 3] = b;
      line[x * 3 + 1] = g;
      line[x * 3 + 2] = r;
    }
    cache.set(y, line);
    return line;
  };

  for (let y = 0; y < height; y++) {
    const first = y * down.n;
    for (const key of cache.keys()) if (key < down.index[first]) cache.delete(key);
    const rows = Array.from({ length: down.n }, (_, k) => row(down.index[first + k]));
    const at = y * rowLength;
    if (down.n === 2) {
      const [r0, r1] = rows;
      const w0 = down.weight[first];
      const w1 = down.weight[first + 1];
      for (let i = 0; i < rowLength; i++) out[at + i] = r0[i] * w0 + r1[i] * w1;
    } else {
      const [r0, r1, r2, r3] = rows;
      const [w0, w1, w2, w3] = down.weight.subarray(first, first + 4);
      for (let i = 0; i < rowLength; i++) out[at + i] = r0[i] * w0 + r1[i] * w1 + r2[i] * w2 + r3[i] * w3;
    }
  }
  return { width, height, data: new Uint8Array(out.buffer) };
}

/** Black bands above and below (very wide, short images). */
export function padVertically(img: Image, pad: number): Image {
  const data = new Uint8Array(img.width * (img.height + 2 * pad) * 3);
  data.set(img.data, img.width * pad * 3);
  return { width: img.width, height: img.height + 2 * pad, data };
}

/** Turned by quarter turns: 90 is clockwise. */
export function rotate(img: Image, degrees: 90 | 180 | 270): Image {
  const { width: w, height: h } = img;
  const width = degrees === 180 ? w : h;
  const height = degrees === 180 ? h : w;
  const data = new Uint8Array(img.data.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sx = degrees === 180 ? w - 1 - x : degrees === 90 ? y : w - 1 - y;
      const sy = degrees === 180 ? h - 1 - y : degrees === 90 ? h - 1 - x : x;
      const from = (sy * w + sx) * 3;
      const to = (y * width + x) * 3;
      data[to] = img.data[from];
      data[to + 1] = img.data[from + 1];
      data[to + 2] = img.data[from + 2];
    }
  }
  return { width, height, data };
}

export type Point = readonly [x: number, y: number];
/** Top left, top right, bottom right, bottom left. */
export type Quad = readonly [Point, Point, Point, Point];

const distance = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Cuts a (possibly tilted) text line out of the image and straightens it. */
export function cropQuad(img: Image, quad: Quad): Image | undefined {
  const [tl, tr, br, bl] = quad;
  const width = Math.trunc(Math.max(distance(tl, tr), distance(br, bl)));
  const height = Math.trunc(Math.max(distance(tl, bl), distance(tr, br)));
  if (width < 1 || height < 1) return undefined;

  // The perspective map from the straight rectangle to the quad.
  const dx1 = tr[0] - br[0];
  const dy1 = tr[1] - br[1];
  const dx2 = bl[0] - br[0];
  const dy2 = bl[1] - br[1];
  const sx = tl[0] - tr[0] + br[0] - bl[0];
  const sy = tl[1] - tr[1] + br[1] - bl[1];
  const det = dx1 * dy2 - dx2 * dy1;
  if (det === 0) return undefined;
  const g = (sx * dy2 - dx2 * sy) / det;
  const hh = (dx1 * sy - sx * dy1) / det;
  const m = [
    (tr[0] - tl[0] + g * tr[0]) / width, (bl[0] - tl[0] + hh * bl[0]) / height, tl[0],
    (tr[1] - tl[1] + g * tr[1]) / width, (bl[1] - tl[1] + hh * bl[1]) / height, tl[1],
    g / width, hh / height,
  ];

  // Positions are rounded to 1/32 pixel, as OpenCV does.
  const weights = Array.from({ length: 32 }, (_, i) => cubic(i / 32));
  const out = new Uint8ClampedArray(width * height * 3);
  const { data, width: w, height: h } = img;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const k = m[6] * x + m[7] * y + 1;
      const px = Math.round(((m[0] * x + m[1] * y + m[2]) / k) * 32);
      const py = Math.round(((m[3] * x + m[4] * y + m[5]) / k) * 32);
      const wx = weights[px & 31];
      const wy = weights[py & 31];
      const ix = (px >> 5) - 1;
      const iy = (py >> 5) - 1;
      let b = 0;
      let gr = 0;
      let r = 0;
      for (let j = 0; j < 4; j++) {
        const row = clamp(iy + j, h - 1) * w;
        for (let i = 0; i < 4; i++) {
          const p = (row + clamp(ix + i, w - 1)) * 3;
          const f = wy[j] * wx[i];
          b += data[p] * f;
          gr += data[p + 1] * f;
          r += data[p + 2] * f;
        }
      }
      const to = (y * width + x) * 3;
      out[to] = b;
      out[to + 1] = gr;
      out[to + 2] = r;
    }
  }
  const crop = { width, height, data: new Uint8Array(out.buffer) };
  // Text running up the side is turned to read left to right.
  return height / width >= 1.5 ? rotate(crop, 270) : crop;
}

// ───────── Evened lighting ─────────

/** How bright the paper is around each pixel: a very wide blur, done on a shrunken copy. */
function background(gray: Uint8Array, w: number, h: number, sigma: number): Float32Array {
  const f = Math.max(1, Math.floor(sigma / 8));
  const sw = Math.ceil(w / f);
  const sh = Math.ceil(h / f);
  const sum = new Float32Array(sw * sh);
  const n = new Uint32Array(sw * sh);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = Math.floor(y / f) * sw + Math.floor(x / f);
      sum[i] += gray[y * w + x];
      n[i]++;
    }
  }
  for (let i = 0; i < sum.length; i++) sum[i] /= n[i];

  const s = sigma / f;
  const radius = Math.ceil(s * 3);
  const kernel = Array.from({ length: radius * 2 + 1 }, (_, i) => Math.exp(-((i - radius) ** 2) / (2 * s * s)));
  const total = kernel.reduce((a, b) => a + b, 0);
  // Past the edge the image is mirrored.
  const mirror = (i: number, size: number) => {
    if (size === 1) return 0;
    const period = 2 * (size - 1);
    const m = ((i % period) + period) % period;
    return m < size ? m : period - m;
  };
  const blur = (src: Float32Array, across: boolean) => {
    const out = new Float32Array(src.length);
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        let v = 0;
        for (let k = -radius; k <= radius; k++) {
          const i = across ? y * sw + mirror(x + k, sw) : mirror(y + k, sh) * sw + x;
          v += src[i] * kernel[k + radius];
        }
        out[y * sw + x] = v / total;
      }
    }
    return out;
  };
  const small = blur(blur(sum, true), false);

  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const fy = Math.max(0, Math.min(sh - 1, (y + 0.5) / f - 0.5));
    const y0 = Math.floor(fy);
    const y1 = Math.min(sh - 1, y0 + 1);
    for (let x = 0; x < w; x++) {
      const fx = Math.max(0, Math.min(sw - 1, (x + 0.5) / f - 0.5));
      const x0 = Math.floor(fx);
      const x1 = Math.min(sw - 1, x0 + 1);
      const top = small[y0 * sw + x0] * (1 - fx + x0) + small[y0 * sw + x1] * (fx - x0);
      const bottom = small[y1 * sw + x0] * (1 - fx + x0) + small[y1 * sw + x1] * (fx - x0);
      out[y * w + x] = top * (1 - fy + y0) + bottom * (fy - y0);
    }
  }
  return out;
}

/** Contrast boosted tile by tile (CLAHE, 8 x 8 tiles). */
function clahe(gray: Uint8Array, w: number, h: number, clipLimit: number): Uint8Array {
  const TILES = 8;
  const tw = Math.ceil(w / TILES);
  const th = Math.ceil(h / TILES);
  const area = tw * th;
  const clip = Math.max(1, Math.floor((clipLimit * area) / 256));
  const luts = Array.from({ length: TILES * TILES }, (_, t) => {
    const hist = new Int32Array(256);
    const left = (t % TILES) * tw;
    const top = Math.floor(t / TILES) * th;
    for (let y = top; y < top + th; y++) {
      for (let x = left; x < left + tw; x++) {
        // Tiles past the edge mirror the image.
        const sx = Math.max(0, x < w ? x : 2 * w - 2 - x);
        const sy = Math.max(0, y < h ? y : 2 * h - 2 - y);
        hist[gray[sy * w + sx]]++;
      }
    }
    let clipped = 0;
    for (let i = 0; i < 256; i++) {
      if (hist[i] > clip) {
        clipped += hist[i] - clip;
        hist[i] = clip;
      }
    }
    const each = Math.floor(clipped / 256);
    let rest = clipped - each * 256;
    for (let i = 0; i < 256; i++) hist[i] += each;
    if (rest > 0) {
      const step = Math.max(1, Math.floor(256 / rest));
      for (let i = 0; i < 256 && rest > 0; i += step, rest--) hist[i]++;
    }
    const lut = new Uint8ClampedArray(256);
    let sum = 0;
    for (let i = 0; i < 256; i++) {
      sum += hist[i];
      lut[i] = (sum * 255) / area;
    }
    return lut;
  });
  const out = new Uint8ClampedArray(w * h);
  for (let y = 0; y < h; y++) {
    const fy = y / th - 0.5;
    const ty = Math.floor(fy);
    const ya = fy - ty;
    const y0 = clamp(ty, TILES - 1) * TILES;
    const y1 = clamp(ty + 1, TILES - 1) * TILES;
    for (let x = 0; x < w; x++) {
      const fx = x / tw - 0.5;
      const tx = Math.floor(fx);
      const xa = fx - tx;
      const x0 = clamp(tx, TILES - 1);
      const x1 = clamp(tx + 1, TILES - 1);
      const v = gray[y * w + x];
      out[y * w + x] =
        (luts[y0 + x0][v] * (1 - xa) + luts[y0 + x1][v] * xa) * (1 - ya) +
        (luts[y1 + x0][v] * (1 - xa) + luts[y1 + x1][v] * xa) * ya;
    }
  }
  return new Uint8Array(out.buffer);
}

/**
 * Evens out the lighting and boosts contrast: glare on a shiny pack and dark
 * print on a dark or colourful carton otherwise leave no readable text.
 */
export function evened(img: Image): Image {
  const { width: w, height: h, data } = img;
  const gray = new Uint8ClampedArray(w * h);
  for (let i = 0; i < gray.length; i++) {
    gray[i] = data[i * 3] * 0.114 + data[i * 3 + 1] * 0.587 + data[i * 3 + 2] * 0.299;
  }
  const bytes = new Uint8Array(gray.buffer);
  const paper = background(bytes, w, h, Math.max(w, h) / 30);
  const flat = new Uint8ClampedArray(w * h);
  for (let i = 0; i < flat.length; i++) flat[i] = paper[i] > 0 ? (bytes[i] * 200) / paper[i] : 0;
  const sharp = clahe(new Uint8Array(flat.buffer), w, h, 3);
  const out = new Uint8Array(w * h * 3);
  for (let i = 0; i < sharp.length; i++) out.fill(sharp[i], i * 3, i * 3 + 3);
  return { width: w, height: h, data: out };
}
