import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import * as ort from 'onnxruntime-node';
import { findContours, meanInside, minAreaRect, orderCorners, unclip } from './contours';
import { cropQuad, evened, Image, padVertically, Point, Quad, resize, rotate } from './image';
import { characterList } from './onnx-metadata';
import { round, Word } from './words';

export const DETECTOR = 'PP-OCRv6_det_medium.onnx';
export const RECOGNIZER = 'PP-OCRv6_rec_medium.onnx';

const MAX_SIDE = 4000;
/** Text the recogniser is less sure of than this is left out. */
const MIN_TEXT_SCORE = 0.5;
const TEXT_THRESHOLD = 0.3;
const BOX_THRESHOLD = 0.5;
const MAX_BOXES = 1000;
const UNCLIP_RATIO = 1.6;
const LINE_HEIGHT = 48;
const MIN_LINE_RATIO = 320 / 48;
const BATCH = 6;

const multipleOf32 = (size: number) => round(size / 32) * 32;

/**
 * Local OCR: PaddleOCR's PP-OCRv6 models on ONNX Runtime. One model finds the
 * lines of text, the other reads each line. Free and offline.
 */
export class Ocr {
  private constructor(
    private readonly detector: ort.InferenceSession,
    private readonly recognizer: ort.InferenceSession,
    /** What each output of the recogniser stands for; the first means "nothing". */
    private readonly characters: string[],
  ) {}

  static async load(modelDir: string, threads?: number): Promise<Ocr> {
    const options: ort.InferenceSession.SessionOptions = {
      graphOptimizationLevel: 'all',
      enableCpuMemArena: false,
      logSeverityLevel: 4,
      ...(threads ? { intraOpNumThreads: threads } : {}),
    };
    const recognizerFile = join(modelDir, RECOGNIZER);
    const detector = await ort.InferenceSession.create(join(modelDir, DETECTOR), options);
    const recognizer = await ort.InferenceSession.create(recognizerFile, options);
    return new Ocr(detector, recognizer, ['', ...characterList(await readFile(recognizerFile)), ' ']);
  }

  /** Every word found in the image with its position. */
  async recognize(photo: Image): Promise<Word[]> {
    // Receipt text is small in a phone photo; it reads far better enlarged
    // (2x, within MAX_SIDE). The app sends photos of at most 2000px.
    const scale = Math.min(2, MAX_SIDE / Math.max(photo.width, photo.height));
    let img = photo;
    if (scale > 1.05) img = resize(img, round(img.width * scale), round(img.height * scale), 'cubic');
    const { width, height } = img;
    const long = Math.max(width, height);
    if (long > MAX_SIDE) img = withRatio(img, MAX_SIDE / long);
    const short = Math.min(img.width, img.height);
    if (short < 30) img = withRatio(img, 30 / short);
    const ratioX = width / img.width;
    const ratioY = height / img.height;

    let pad = 0;
    if (img.height <= 30 || img.width / img.height > 8) {
      const target = Math.max(Math.trunc(img.width / 8), 30) * 2;
      pad = Math.trunc(Math.abs(target - img.height) / 2);
      img = padVertically(img, pad);
    }

    const found = (await this.detect(img)).flatMap((box) => {
      const crop = cropQuad(img, box);
      return crop ? [{ box, crop }] : [];
    });
    const texts = await this.read(found.map((f) => f.crop));
    return found.flatMap(({ box }, i): Word[] => {
      const { text, score } = texts[i];
      if (!text.trim() || score < MIN_TEXT_SCORE) return [];
      const xs = box.map((p) => Math.min(Math.max(Math.trunc(p[0] * ratioX), 0), width));
      const ys = box.map((p) => Math.min(Math.max(Math.trunc((p[1] - pad) * ratioY), 0), height));
      return [
        { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys), text: text.trim(), score },
      ];
    });
  }

  /** The boxes around the lines of text, in reading order. */
  private async detect(img: Image): Promise<Quad[]> {
    const ratio = Math.max(1, 736 / Math.min(img.width, img.height));
    const width = multipleOf32(Math.trunc(img.width * ratio));
    const height = multipleOf32(Math.trunc(img.height * ratio));
    if (width <= 0 || height <= 0) return [];
    const input = new Float32Array(3 * width * height);
    writePixels(resize(img, width, height), input, 0, width);
    const out = await run(this.detector, input, [1, 3, height, width]);
    const [h, w] = out.dims.slice(-2);
    const map = out.data as Float32Array;

    // Where the model sees text, grown by a pixel so broken letters join up.
    const mask = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        mask[i] =
          map[i] > TEXT_THRESHOLD ||
          (x > 0 && map[i - 1] > TEXT_THRESHOLD) ||
          (y > 0 && map[i - w] > TEXT_THRESHOLD) ||
          (x > 0 && y > 0 && map[i - w - 1] > TEXT_THRESHOLD)
            ? 1
            : 0;
      }
    }

    const boxes: Quad[] = [];
    for (const contour of findContours(mask, w, h).slice(0, MAX_BOXES)) {
      const core = minAreaRect(contour);
      if (!core || core.shortSide < 3) continue;
      if (meanInside(map, w, h, core.corners) < BOX_THRESHOLD) continue;
      const grown = minAreaRect(unclip(core.corners, UNCLIP_RATIO));
      if (!grown || grown.shortSide < 5) continue;
      const onImage = grown.corners.map((p): Point => [
        toPixel(round((p[0] / w) * img.width), img.width),
        toPixel(round((p[1] / h) * img.height), img.height),
      ]);
      const [tl, tr, br, bl] = orderCorners(onImage);
      const sideX = Math.trunc(Math.hypot(tl[0] - tr[0], tl[1] - tr[1]));
      const sideY = Math.trunc(Math.hypot(tl[0] - bl[0], tl[1] - bl[1]));
      if (sideX > 3 && sideY > 3) boxes.push([tl, tr, br, bl]);
    }
    return inReadingOrder(boxes);
  }

  /** Reads each cut-out line. Lines of similar length go through the model together. */
  private async read(lines: Image[]): Promise<{ text: string; score: number }[]> {
    const results: { text: string; score: number }[] = [];
    const order = lines.map((l, i) => ({ i, ratio: l.width / l.height })).sort((a, b) => a.ratio - b.ratio);
    for (let start = 0; start < order.length; start += BATCH) {
      const batch = order.slice(start, start + BATCH);
      const width = Math.trunc(LINE_HEIGHT * Math.max(MIN_LINE_RATIO, ...batch.map((b) => b.ratio)));
      const size = 3 * LINE_HEIGHT * width;
      const input = new Float32Array(batch.length * size);
      batch.forEach(({ i, ratio }, n) => {
        const line = resize(lines[i], Math.min(width, Math.ceil(LINE_HEIGHT * ratio)), LINE_HEIGHT);
        writePixels(line, input, n * size, width);
      });
      const out = await run(this.recognizer, input, [batch.length, 3, LINE_HEIGHT, width]);
      const [, steps, classes] = out.dims;
      const probabilities = out.data as Float32Array;
      batch.forEach(({ i }, n) => {
        results[i] = this.decode(probabilities, n * steps * classes, steps, classes);
      });
    }
    return results;
  }

  /** The likeliest character at each step, without repeats and blanks. */
  private decode(p: Float32Array, offset: number, steps: number, classes: number) {
    let text = '';
    let total = 0;
    let n = 0;
    let previous = -1;
    for (let s = 0; s < steps; s++) {
      const at = offset + s * classes;
      let best = 0;
      for (let c = 1; c < classes; c++) if (p[at + c] > p[at + best]) best = c;
      if (best !== 0 && best !== previous) {
        text += this.characters[best] ?? '';
        total += round(p[at + best], 5);
        n++;
      }
      previous = best;
    }
    return { text, score: n > 0 ? round(total / n, 5) : 0 };
  }
}

const toPixel = (v: number, size: number) => Math.min(Math.max(v, 0), size - 1);

const withRatio = (img: Image, ratio: number) =>
  resize(img, multipleOf32(Math.trunc(img.width * ratio)), multipleOf32(Math.trunc(img.height * ratio)));

/** Copies pixels as three planes (blue, green, red) scaled to -1…1. */
function writePixels(img: Image, out: Float32Array, offset: number, stride: number) {
  const plane = stride * img.height;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const from = (y * img.width + x) * 3;
      const to = offset + y * stride + x;
      out[to] = img.data[from] / 127.5 - 1;
      out[to + plane] = img.data[from + 1] / 127.5 - 1;
      out[to + 2 * plane] = img.data[from + 2] / 127.5 - 1;
    }
  }
}

async function run(session: ort.InferenceSession, data: Float32Array, dims: number[]): Promise<ort.Tensor> {
  const results = await session.run({ [session.inputNames[0]]: new ort.Tensor('float32', data, dims) });
  return results[session.outputNames[0]];
}

/** Top to bottom; boxes whose tops are close are one line, left to right. */
function inReadingOrder(boxes: Quad[]): Quad[] {
  const sorted = [...boxes].sort((a, b) => a[0][1] - b[0][1]);
  let line = 0;
  return sorted
    .map((box, i) => {
      if (i > 0 && box[0][1] - sorted[i - 1][0][1] >= 10) line++;
      return { box, line };
    })
    .sort((a, b) => a.line - b.line || a.box[0][0] - b.box[0][0])
    .map((b) => b.box);
}

/**
 * Ways to look at a pack photo, most likely first. Dates are printed at any
 * angle (lids, can bottoms, box sides).
 */
export function* labelViews(img: Image): Generator<[name: string, view: Image]> {
  yield ['as taken', img];
  yield ['upside down', rotate(img, 180)];
  const even = evened(img);
  yield ['evened lighting', even];
  yield ['turned right', rotate(img, 90)];
  yield ['turned left', rotate(img, 270)];
  yield ['evened, upside down', rotate(even, 180)];
}
