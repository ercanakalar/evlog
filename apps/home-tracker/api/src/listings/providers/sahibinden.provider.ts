import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.validation';
import {
  ListingProviderAdapter,
  ListingReference,
  ListingSnapshot,
} from './listing-provider';

const HOSTS = new Set(['sahibinden.com', 'www.sahibinden.com', 'm.sahibinden.com']);
const ID_IN_PATH = /(?:-|\/ilan\/)(\d{7,12})(?:\/detay)?\/?$/;

/**
 * sahibinden.com does not offer a public API; listing data is available to
 * corporate members (e.g. real-estate offices) through their partner API.
 * When SAHIBINDEN_API_URL/KEY are set, `fetch` calls that API — adapt the
 * mapping below to the contract you receive. Without credentials the app
 * runs in link-only mode: links are validated and stored, nothing is
 * scraped (scraping is against the site's terms).
 */
@Injectable()
export class SahibindenProvider extends ListingProviderAdapter {
  readonly provider = 'SAHIBINDEN' as const;

  constructor(private readonly config: ConfigService<Env, true>) {
    super();
  }

  get canSync(): boolean {
    return Boolean(
      this.config.get('SAHIBINDEN_API_URL', { infer: true }) &&
        this.config.get('SAHIBINDEN_API_KEY', { infer: true }),
    );
  }

  parseReference(input: string): ListingReference | null {
    const value = input.trim();
    if (/^\d{7,12}$/.test(value)) {
      return { externalId: value, url: `https://www.sahibinden.com/ilan/${value}` };
    }
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      return null;
    }
    if (url.protocol !== 'https:' || !HOSTS.has(url.hostname)) return null;
    const match = ID_IN_PATH.exec(url.pathname);
    if (!match) return null;
    return {
      externalId: match[1],
      url: `https://www.sahibinden.com${url.pathname}`,
    };
  }

  async fetch(externalId: string): Promise<ListingSnapshot | null> {
    if (!this.canSync) return null;
    const base = this.config.get('SAHIBINDEN_API_URL', { infer: true })!;
    const response = await fetch(new URL(`listings/${externalId}`, base.endsWith('/') ? base : `${base}/`), {
      headers: {
        Accept: 'application/json',
        'X-Api-Key': this.config.get('SAHIBINDEN_API_KEY', { infer: true })!,
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`sahibinden answered ${response.status}`);
    const body = (await response.json()) as {
      title?: unknown;
      price?: { amount?: unknown; currency?: unknown };
      category?: unknown;
    };
    const amount = Number(body.price?.amount);
    return {
      title: typeof body.title === 'string' ? body.title.slice(0, 200) : undefined,
      price: Number.isFinite(amount) && amount >= 0 ? amount : undefined,
      currency:
        typeof body.price?.currency === 'string' && /^[A-Z]{3}$/.test(body.price.currency)
          ? body.price.currency
          : undefined,
      type:
        typeof body.category === 'string' && /satilik|sale/i.test(body.category)
          ? 'SALE'
          : 'RENT',
    };
  }
}
