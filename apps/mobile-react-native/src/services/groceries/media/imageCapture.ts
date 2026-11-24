import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import type { UploadFile } from '@/types/api/groceries/requests';

const MAX_EDGE = 2000;
/** A long receipt in one tall photo keeps its width, so its text stays readable. */
const TALL_RATIO = 2;
const TALL_MAX_WIDTH = 1200;
const TALL_MAX_HEIGHT = 6000;

/** The size to send: normal photos fit in 2000 px; tall ones keep up to 1200 px of width. */
export function targetSize(width: number, height: number): { width: number; height: number } {
  if (height > width * TALL_RATIO) {
    const scale = Math.min(1, TALL_MAX_WIDTH / width, TALL_MAX_HEIGHT / height);
    return { width: Math.round(width * scale), height: Math.round(height * scale) };
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export class PhotoPermissionError extends Error {}

/**
 * Re-encodes a photo as a JPEG: no larger than 2000px on its long edge, or
 * for a tall long-receipt photo no wider than 1200px (see targetSize).
 * Re-encoding also strips EXIF location data.
 */
export async function prepareImage(photo: { uri: string; width: number; height: number }): Promise<UploadFile> {
  const context = ImageManipulator.manipulate(photo.uri);
  const size = targetSize(photo.width, photo.height);
  if (size.width < photo.width) context.resize(size);
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
  const file: UploadFile = { uri: saved.uri, name: 'receipt.jpg', type: 'image/jpeg' };
  // A browser cannot read the saved file back from a path; keep its bytes.
  if (Platform.OS === 'web') file.blob = await (await fetch(saved.uri)).blob();
  return file;
}

/**
 * Picks receipt photos from the library: one photo of a whole receipt, or
 * several parts of a long one in the order they are tapped. The same photo
 * picked twice is kept once. Resolves to [] when the user cancels.
 */
export async function pickImages(limit: number): Promise<UploadFile[]> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new PhotoPermissionError();
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 1,
    allowsMultipleSelection: limit > 1,
    selectionLimit: limit,
    orderedSelection: true,
  });
  if (result.canceled) return [];
  const seen = new Set<string>();
  const assets = result.assets.filter((asset) => {
    const id = asset.assetId ?? asset.uri;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  return Promise.all(assets.slice(0, limit).map(prepareImage));
}
