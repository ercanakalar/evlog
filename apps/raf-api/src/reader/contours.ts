import type { Point } from './image';

/** The outline points of every blob in a mask, and of every hole inside one. */
export function findContours(mask: Uint8Array, w: number, h: number): Point[][] {
  const label = new Int32Array(w * h);
  const stack: number[] = [];
  const contours: { first: number; points: Point[] }[] = [];
  let next = 0;

  // Fills one area of equal value; blobs also join diagonally, holes don't.
  const fill = (start: number, value: 0 | 1, visit: (x: number, y: number, i: number) => void) => {
    next++;
    label[start] = next;
    stack.push(start);
    while (stack.length > 0) {
      const i = stack.pop()!;
      const x = i % w;
      const y = (i - x) / w;
      visit(x, y, i);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if ((!dx && !dy) || (value === 0 && dx && dy)) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const n = ny * w + nx;
          if (mask[n] === value && label[n] === 0) {
            label[n] = next;
            stack.push(n);
          }
        }
      }
    }
  };

  for (let i = 0; i < mask.length; i++) {
    if (label[i] !== 0) continue;
    const points: Point[] = [];
    if (mask[i] === 1) {
      fill(i, 1, (x, y, p) => {
        const inside =
          x > 0 && y > 0 && x < w - 1 && y < h - 1 &&
          mask[p - 1] && mask[p + 1] && mask[p - w] && mask[p + w];
        if (!inside) points.push([x, y]);
      });
    } else {
      let open = false;
      fill(i, 0, (x, y, p) => {
        if (x === 0 || y === 0 || x === w - 1 || y === h - 1) open = true;
        if (open) return;
        // A hole's outline is the blob pixels around it.
        if (mask[p - 1]) points.push([x - 1, y]);
        if (mask[p + 1]) points.push([x + 1, y]);
        if (mask[p - w]) points.push([x, y - 1]);
        if (mask[p + w]) points.push([x, y + 1]);
      });
      if (open) continue;
    }
    contours.push({ first: i, points });
  }
  // Bottom of the image first.
  return contours.reverse().map((c) => c.points);
}

function convexHull(points: readonly Point[]): Point[] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (sorted.length < 3) return sorted;
  const half = (list: Point[]) => {
    const out: Point[] = [];
    for (const p of list) {
      while (out.length >= 2) {
        const a = out[out.length - 2];
        const b = out[out.length - 1];
        if ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) > 0) break;
        out.pop();
      }
      out.push(p);
    }
    out.pop();
    return out;
  };
  return [...half(sorted), ...half(sorted.reverse())];
}

export interface Rect {
  /** Top left, top right, bottom right, bottom left. */
  corners: Point[];
  shortSide: number;
}

/** The smallest rectangle, at any angle, around the points. */
export function minAreaRect(points: readonly Point[]): Rect | undefined {
  const hull = convexHull(points);
  if (hull.length < 2) return undefined;
  let best: { area: number; corners: Point[]; shortSide: number } | undefined;
  for (let i = 0; i < hull.length; i++) {
    const a = hull[i];
    const b = hull[(i + 1) % hull.length];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (length === 0) continue;
    const ux = (b[0] - a[0]) / length;
    const uy = (b[1] - a[1]) / length;
    let minU = Infinity;
    let maxU = -Infinity;
    let minV = Infinity;
    let maxV = -Infinity;
    for (const p of hull) {
      const u = p[0] * ux + p[1] * uy;
      const v = p[1] * ux - p[0] * uy;
      minU = Math.min(minU, u);
      maxU = Math.max(maxU, u);
      minV = Math.min(minV, v);
      maxV = Math.max(maxV, v);
    }
    const area = (maxU - minU) * (maxV - minV);
    if (best && area >= best.area - 1e-9) continue;
    const at = (u: number, v: number): Point => [u * ux - v * uy, u * uy + v * ux];
    best = {
      area,
      corners: [at(minU, minV), at(maxU, minV), at(maxU, maxV), at(minU, maxV)],
      shortSide: Math.min(maxU - minU, maxV - minV),
    };
  }
  if (!best) return undefined;
  // A hair of rounding must not decide which corners are the left ones.
  const tidy = best.corners.map((p): Point => [Number(p[0].toFixed(4)), Number(p[1].toFixed(4))]);
  return { corners: orderCorners(tidy), shortSide: best.shortSide };
}

/** Top left, top right, bottom right, bottom left. */
export function orderCorners(points: readonly Point[]): Point[] {
  const byX = [...points].sort((a, b) => a[0] - b[0]);
  const [tl, bl] = byX.slice(0, 2).sort((a, b) => a[1] - b[1]);
  const [tr, br] = byX.slice(2).sort((a, b) => a[1] - b[1]);
  return [tl, tr, br, bl];
}

/** Average of the map inside the rectangle: how sure the model is of the text there. */
export function meanInside(map: Float32Array, w: number, h: number, corners: readonly Point[]): number {
  const xs = corners.map((p) => p[0]);
  const ys = corners.map((p) => p[1]);
  const within = (v: number, max: number) => Math.min(Math.max(v, 0), max - 1);
  const x0 = within(Math.floor(Math.min(...xs)), w);
  const y0 = within(Math.floor(Math.min(...ys)), h);
  const y1 = within(Math.ceil(Math.max(...ys)), h);
  const x1 = within(Math.ceil(Math.max(...xs)), w);
  const poly = corners.map((p): Point => [x0 + Math.trunc(p[0] - x0), y0 + Math.trunc(p[1] - y0)]);
  let sum = 0;
  let n = 0;
  for (let y = y0; y <= y1; y++) {
    // Where the outline crosses this row of pixels.
    let left = Infinity;
    let right = -Infinity;
    for (let i = 0; i < 4; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % 4];
      const lo = Math.min(a[1], b[1]);
      const hi = Math.max(a[1], b[1]);
      if (hi < y - 0.5 || lo > y + 0.5) continue;
      for (const at of [Math.max(lo, y - 0.5), Math.min(hi, y + 0.5)]) {
        const x = a[1] === b[1] ? undefined : a[0] + ((b[0] - a[0]) * (at - a[1])) / (b[1] - a[1]);
        for (const v of x === undefined ? [a[0], b[0]] : [x]) {
          left = Math.min(left, v);
          right = Math.max(right, v);
        }
      }
    }
    for (let x = Math.max(x0, Math.round(left)); x <= Math.min(x1, Math.round(right)); x++) {
      sum += map[y * w + x];
      n++;
    }
  }
  return n > 0 ? sum / n : 0;
}

/** The rectangle grown by `ratio` x area / perimeter on every side, with round corners. */
export function unclip(corners: readonly Point[], ratio: number): Point[] {
  let area = 0;
  let perimeter = 0;
  corners.forEach((a, i) => {
    const b = corners[(i + 1) % corners.length];
    area += a[0] * b[1] - b[0] * a[1];
    perimeter += Math.hypot(b[0] - a[0], b[1] - a[1]);
  });
  const delta = ((Math.abs(area) / 2) * ratio) / perimeter;
  if (!(delta > 0)) return [];

  // Whole-pixel corners, without repeats.
  let path = corners.map((p): Point => [Math.trunc(p[0]), Math.trunc(p[1])]);
  path = path.filter((p, i) => {
    const q = path[(i + 1) % path.length];
    return p[0] !== q[0] || p[1] !== q[1];
  });
  if (path.length < 3) return [];
  const signed = path.reduce((s, a, i) => {
    const b = path[(i + 1) % path.length];
    return s + a[0] * b[1] - b[0] * a[1];
  }, 0);
  if (signed < 0) path.reverse();

  const normals = path.map((a, i) => {
    const b = path[(i + 1) % path.length];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return [(b[1] - a[1]) / length, -(b[0] - a[0]) / length] as const;
  });
  const steps = Math.min(Math.PI / Math.acos(1 - Math.min(0.25, delta * 0.25) / delta), delta * Math.PI);
  const out: Point[] = [];
  path.forEach((p, i) => {
    const from = normals[(i + path.length - 1) % path.length];
    const to = normals[i];
    const angle = Math.atan2(from[0] * to[1] - from[1] * to[0], from[0] * to[0] + from[1] * to[1]);
    const n = Math.max(1, Math.round((steps / (2 * Math.PI)) * Math.abs(angle)));
    for (let k = 0; k <= n; k++) {
      const turn = k === n ? angle : Math.min(angle, (k * 2 * Math.PI) / steps);
      const x = from[0] * Math.cos(turn) - from[1] * Math.sin(turn);
      const y = from[0] * Math.sin(turn) + from[1] * Math.cos(turn);
      out.push([Math.round(p[0] + x * delta), Math.round(p[1] + y * delta)]);
    }
  });
  return out;
}
