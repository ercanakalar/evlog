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

/** Picks a receipt photo from the library. Resolves to null when the user cancels. */
export async function pickImage(): Promise<UploadFile | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new PhotoPermissionError();
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
  const asset = result.canceled ? undefined : result.assets[0];
  return asset ? prepareImage(asset) : null;
}
