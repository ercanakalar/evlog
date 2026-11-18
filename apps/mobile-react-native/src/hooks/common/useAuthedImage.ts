import { useMemo } from 'react';
import { env } from '@/config/env';
import { useAppSelector } from '@/store/hooks';
import { selectAccessToken } from '@/store/slices/authSlice';

/** expo-image source for a protected API file (adds the bearer token). */
export function useAuthedImage(path: string | undefined) {
  const token = useAppSelector(selectAccessToken);
  return useMemo(
    () =>
      path
        ? { uri: `${env.apiUrl}${path}`, headers: token ? { Authorization: `Bearer ${token}` } : undefined }
        : undefined,
    [path, token],
  );
}

export const conditionPhotoPath = (photoId: string) => `/condition-photos/${photoId}/file`;
