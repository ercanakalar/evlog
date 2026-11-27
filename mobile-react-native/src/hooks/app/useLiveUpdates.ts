import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { env } from '@/config/env';
import { isExpiringSoon } from '@/services/jwt';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { baseApi, TAG_TYPES } from '@/store/middlewares/createApi';
import { meService } from '@/store/services/meService';
import { selectAccessToken } from '@/store/slices/authSlice';

type Tag = (typeof TAG_TYPES)[number];

const EVENTS_URL = `${env.apiUrl.replace(/^http/, 'ws')}/events`;
/** The household changed (joined, left): connect again at once, to the new one. */
const CLOSE_MOVED = 4001;
/** Changes arriving together are fetched once. */
const BATCH_MS = 250;
const MAX_RETRY_MS = 30_000;

const isTag = (value: unknown): value is Tag => TAG_TYPES.includes(value as Tag);

/**
 * Keeps the household's data live while the app is open: the API says which
 * data someone in the household changed, and it is fetched again. Closed in
 * the background (focus refetches then). A dropped connection is reopened,
 * and everything is fetched again in case a change was missed meanwhile.
 */
export function useLiveUpdates(signedIn: boolean) {
  const dispatch = useAppDispatch();
  const token = useAppSelector(selectAccessToken);
  const [active, setActive] = useState(AppState.currentState === 'active');

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => setActive(state === 'active'));
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!signedIn || !token || !active) return;

    let socket: WebSocket | null = null;
    let stopped = false;
    let failures = 0;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let flush: ReturnType<typeof setTimeout> | undefined;
    const pending = new Set<Tag>();

    const refetch = (tags: readonly Tag[]) => {
      for (const tag of tags) pending.add(tag);
      clearTimeout(flush);
      flush = setTimeout(() => {
        dispatch(baseApi.util.invalidateTags([...pending]));
        pending.clear();
      }, BATCH_MS);
    };

    const connect = () => {
      const ws = new WebSocket(EVENTS_URL, ['raf', token]);
      socket = ws;
      ws.onopen = () => {
        if (failures > 0) refetch(TAG_TYPES);
        failures = 0;
      };
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(String(event.data)) as { type?: string; tags?: unknown[] };
          if (message.type === 'changed') refetch((message.tags ?? []).filter(isTag));
          if (message.type === 'resync') refetch(TAG_TYPES);
        } catch {
          // Not a message this version knows.
        }
      };
      ws.onclose = (event) => {
        if (stopped) return;
        if (event.code === CLOSE_MOVED) {
          refetch(TAG_TYPES);
          return connect();
        }
        failures += 1;
        // An expired token is refused: any request refreshes it, and the new token reconnects.
        if (isExpiringSoon(token)) {
          void dispatch(meService.endpoints.getMe.initiate(undefined, { forceRefetch: true, subscribe: false }));
        }
        retry = setTimeout(connect, Math.min(MAX_RETRY_MS, 1_000 * 2 ** (failures - 1)));
      };
    };

    connect();
    return () => {
      stopped = true;
      clearTimeout(retry);
      clearTimeout(flush);
      socket?.close();
    };
  }, [active, dispatch, signedIn, token]);
}
