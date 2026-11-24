import { File } from 'expo-file-system';
import type { UploadFile } from '@/types/api/groceries/requests';

/**
 * Turns a local photo into a FormData part.
 *
 * Expo's fetch (the global fetch on SDK 58) rejects React Native's
 * { uri, name, type } parts with "Unsupported FormDataPart implementation",
 * which RTK Query reports as a network error. It accepts any object that
 * has name, type and a bytes() reader, so the file is read from disk on send.
 */
export function formDataFile(file: UploadFile): Blob {
  if (file.blob) return file.blob; // web
  const local = new File(file.uri);
  const part = { name: file.name, type: file.type, bytes: () => local.bytes() };
  return part as unknown as Blob;
}
