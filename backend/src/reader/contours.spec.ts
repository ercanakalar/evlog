import { findContours, meanInside, minAreaRect, unclip } from './contours';
import { cropQuad, decode, resize, rotate, UnreadableImageError } from './image';
import { characterList } from './onnx-metadata';

const mask = (...rows: string[]) => Uint8Array.from(rows.join(''), (c) => Number(c));

describe('contours', () => {
  it('finds blobs, joined diagonally, and the holes in them', () => {
    expect(findContours(mask('10000', '01000', '00011'), 5, 3)).toHaveLength(2);
    expect(findContours(mask('00000', '01110', '01010', '01110', '00000'), 5, 5)).toHaveLength(2);
  });

  it('puts the smallest rectangle around tilted points', () => {
    const rect = minAreaRect([[0, 10], [10, 0], [40, 30], [30, 40], [20, 20]])!;
    expect(rect.shortSide).toBeCloseTo(Math.hypot(10, 10), 3);
    // + 0 turns -0 into 0.
    expect(rect.corners.map((p) => p.map((v) => Math.round(v) + 0))).toEqual([[10, 0], [40, 30], [30, 40], [0, 10]]);
  });

  it('has no rectangle for a single point', () => {
    expect(minAreaRect([[3, 3]])).toBeUndefined();
    expect(unclip([[3, 3], [3, 3], [3, 3], [3, 3]], 1.6)).toEqual([]);
  });

  it('grows a box by area / perimeter on every side', () => {
    const grown = minAreaRect(unclip([[100, 100], [200, 100], [200, 120], [100, 120]], 1.6))!;
    // 100 x 20 x 1.6 / 240 = 13.3
    expect(grown.corners).toEqual([[87, 87], [213, 87], [213, 133], [87, 133]]);
  });

  it('averages the map inside a box', () => {
    const map = Float32Array.from({ length: 100 }, (_, i) => (i % 10 < 5 ? 1 : 0));
    expect(meanInside(map, 10, 10, [[0, 0], [4, 0], [4, 9], [0, 9]])).toBe(1);
    expect(meanInside(map, 10, 10, [[0, 0], [9, 0], [9, 9], [0, 9]])).toBe(0.5);
  });
});

describe('images', () => {
  // 2 x 1: a blue pixel, then a red one.
  const img = { width: 2, height: 1, data: Uint8Array.from([255, 0, 0, 0, 0, 255]) };

  it('turns', () => {
    expect(rotate(img, 180).data).toEqual(Uint8Array.from([0, 0, 255, 255, 0, 0]));
    expect(rotate(img, 90)).toEqual({ width: 1, height: 2, data: img.data });
    expect(rotate(rotate(img, 90), 270)).toEqual(img);
  });

  it('resizes by mixing neighbours', () => {
    expect(resize(img, 4, 1).data).toEqual(Uint8Array.from([255, 0, 0, 191, 0, 64, 64, 0, 191, 0, 0, 255]));
  });

  it('cuts out a straight piece unchanged and turns upright text', () => {
    const big = { width: 8, height: 8, data: Uint8Array.from({ length: 192 }, (_, i) => Math.floor(i / 3)) };
    const crop = cropQuad(big, [[2, 1], [6, 1], [6, 4], [2, 4]])!;
    expect([crop.width, crop.height, crop.data[0], crop.data.at(-1)]).toEqual([4, 3, 10, 29]);
    expect(cropQuad(big, [[2, 1], [4, 1], [4, 6], [2, 6]])).toMatchObject({ width: 5, height: 2 });
    expect(cropQuad(big, [[2, 1], [2, 1], [2, 1], [2, 1]])).toBeUndefined();
  });

  it('refuses a file that is not an image', async () => {
    await expect(decode(Buffer.from('not an image'))).rejects.toBeInstanceOf(UnreadableImageError);
  });
});

describe('model metadata', () => {
  const field = (n: number, content: Buffer) => Buffer.concat([Buffer.from([n * 8 + 2, content.length]), content]);
  const pair = (key: string, value: string) =>
    field(14, Buffer.concat([field(1, Buffer.from(key)), field(2, Buffer.from(value))]));

  it('finds the character list past the other fields', () => {
    const model = Buffer.concat([
      Buffer.from([8, 200, 1]), field(7, Buffer.alloc(100)), pair('other', 'x'), pair('character', 'a\nİ\n₺'),
    ]);
    expect(characterList(model)).toEqual(['a', 'İ', '₺']);
  });

  it('refuses a model without one', () => {
    expect(() => characterList(pair('other', 'x'))).toThrow('no character list');
  });
});
