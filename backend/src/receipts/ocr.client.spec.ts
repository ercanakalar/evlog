import { ConfigService } from '@nestjs/config';
import { OcrClient } from './ocr.client';

describe('OcrClient.parse', () => {
  const client = new OcrClient(new ConfigService({}) as never, {} as never);

  it('accepts a well-formed result', async () => {
    const result = await client.parse({
      merchantName: 'Migros',
      issuedAt: '2026-11-15T12:30:00+03:00',
      currency: 'TRY',
      items: [{ name: 'Süt', quantity: 1, totalPrice: 42.75 }],
    });
    expect(result.kind).toBe('parsed');
  });

  it('rejects negative prices and missing names', async () => {
    const result = await client.parse({ items: [{ name: '', totalPrice: -3 }] });
    expect(result).toEqual({ kind: 'failed', error: 'UNREADABLE' });
  });

  it('turns what the reader says into a code the app can translate', async () => {
    const codeFor = async (error: string) => ((await client.parse({ error })) as { error: string }).error;
    expect(await codeFor('Image too blurry')).toBe('UNREADABLE');
    expect(await codeFor('No text found in the photo')).toBe('NO_TEXT');
    expect(await codeFor('Could not find any items. Take a closer, straight photo of the receipt.')).toBe('NO_ITEMS');
  });

  it('treats an empty body as an empty receipt', async () => {
    expect((await client.parse(null)).kind).toBe('parsed');
  });
});
