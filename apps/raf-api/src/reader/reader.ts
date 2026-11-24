import { decode, UnreadableImageError } from './image';
import { LabelResult, parseLabel } from './label-parser';
import { labelViews, Ocr } from './ocr';
import { parseReceipt, ReceiptResult } from './receipt-parser';

const UNSUPPORTED = 'Unsupported image format, send a JPEG or PNG';

export async function readReceipt(ocr: Ocr, file: Uint8Array): Promise<ReceiptResult> {
  try {
    return parseReceipt(await ocr.recognize(await decode(file)));
  } catch (error) {
    if (error instanceof UnreadableImageError) return { error: UNSUPPORTED, items: [] };
    throw error;
  }
}

/**
 * Reads the photo as taken; when no expiry date is found, tries it turned and
 * with evened-out lighting before giving up.
 */
export async function readLabel(ocr: Ocr, file: Uint8Array): Promise<Partial<LabelResult>> {
  try {
    let result: LabelResult | undefined;
    for (const [, view] of labelViews(await decode(file))) {
      result = parseLabel(await ocr.recognize(view));
      if (result.expiresOn) return result;
    }
    return { ...result, error: 'No expiry date found. Photograph the date printed on the pack, close up.' };
  } catch (error) {
    if (error instanceof UnreadableImageError) return { error: UNSUPPORTED };
    throw error;
  }
}
