import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import type { UploadFile } from '@/types/api/requests';

const MAX_EDGE = 2000;

export class PhotoPermissionError extends Error {}

/**
 * Re-encodes a photo as a JPEG no larger than 2000px on its long edge.
 * Re-encoding also strips EXIF location data.
 */
export async function prepareImage(photo: { uri: string; width: number; height: number }): Promise<UploadFile> {
  const context = ImageManipulator.manipulate(photo.uri);
  if (Math.max(photo.width, photo.height) > MAX_EDGE) {
    context.resize(photo.width >= photo.height ? { width: MAX_EDGE } : { height: MAX_EDGE });
  }
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
  return { uri: saved.uri, name: 'receipt.jpg', type: 'image/jpeg' };
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
