import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import type { UploadFile } from '@/types/api/requests';

const MAX_EDGE = 2000;

export class CameraPermissionError extends Error {}

/**
 * Takes (or picks) a photo and re-encodes it as a JPEG no larger than
 * 2000px on its long edge. Re-encoding also strips EXIF location data.
 * Resolves to null when the user cancels.
 */
export async function captureImage(source: 'camera' | 'library'): Promise<UploadFile | null> {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new CameraPermissionError();
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) return null;

  const context = ImageManipulator.manipulate(asset.uri);
  if (Math.max(asset.width, asset.height) > MAX_EDGE) {
    context.resize(asset.width >= asset.height ? { width: MAX_EDGE } : { height: MAX_EDGE });
  }
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
  return { uri: saved.uri, name: 'photo.jpg', type: 'image/jpeg' };
}
