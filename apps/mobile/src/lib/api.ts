import { API_URL } from './config';
import { tokenStore, type Tokens } from './token-store';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly body: unknown,
  ) {
    super(message);
  }

  /** Field-level messages from the API's ValidationPipe. */
  get messages(): string[] {
    const message = (this.body as { message?: unknown } | null)?.message;
    if (Array.isArray(message)) return message.map(String);
    return [this.message];
  }
}

/** A local file picked from the camera or library, ready for multipart upload. */
export interface UploadFile {
  uri: string;
  name: string;
  type: string;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  form?: Record<string, string | UploadFile | undefined>;
  auth?: boolean;
  signal?: AbortSignal;
}

let refreshing: Promise<boolean> | null = null;

/** One refresh at a time, however many requests hit 401 together. */
function refreshTokens(): Promise<boolean> {
  refreshing ??= (async () => {
    const tokens = tokenStore.get();
    if (!tokens) return false;
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });
      if (!res.ok) {
        await tokenStore.set(null);
        return false;
      }
      const next = (await res.json()) as Tokens;
      await tokenStore.set({ accessToken: next.accessToken, refreshToken: next.refreshToken });
      return true;
    } catch {
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

function buildBody(options: RequestOptions): { body?: BodyInit; headers: Record<string, string> } {
  if (options.form) {
    const form = new FormData();
    for (const [key, value] of Object.entries(options.form)) {
      if (value === undefined) continue;
      // React Native's FormData accepts { uri, name, type } for files.
      form.append(key, value as unknown as Blob);
    }
    return { body: form, headers: {} };
  }
  if (options.body !== undefined) {
    return {
      body: JSON.stringify(options.body),
      headers: { 'Content-Type': 'application/json' },
    };
  }
  return { headers: {} };
}

export async function api<T>(path: string, options: RequestOptions = {}, retried = false): Promise<T> {
  const { body, headers } = buildBody(options);
  const token = tokenStore.get()?.accessToken;
  if (options.auth !== false && token) headers.Authorization = `Bearer ${token}`;
  headers.Accept = 'application/json';

  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body,
    signal: options.signal,
  });

  if (res.status === 401 && options.auth !== false && !retried && (await refreshTokens())) {
    return api<T>(path, options, true);
  }
  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data: unknown = text ? JSON.parse(text) : undefined;
  if (!res.ok) {
    const message =
      (data as { message?: unknown } | undefined)?.message ?? `Request failed (${res.status})`;
    throw new ApiError(res.status, Array.isArray(message) ? String(message[0]) : String(message), data);
  }
  return data as T;
}

/** URL + headers for <Image> sources that need the bearer token. */
export function authedImage(path: string) {
  const token = tokenStore.get()?.accessToken;
  return {
    uri: `${API_URL}${path}`,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  };
}
