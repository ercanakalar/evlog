import type { ListingProvider, ListingType } from '../../generated/prisma/enums';

export interface ListingReference {
  externalId: string;
  url: string;
}

export interface ListingSnapshot {
  title?: string;
  price?: number;
  currency?: string;
  type?: ListingType;
}

/** One adapter per listing site. */
export abstract class ListingProviderAdapter {
  abstract readonly provider: ListingProvider;

  /** Parses a pasted link or bare id. Returns null when it is not ours. */
  abstract parseReference(input: string): ListingReference | null;

  /** Whether live sync is configured. Without it, links are stored only. */
  abstract get canSync(): boolean;

  /** Fetches current listing data. Throws on transport errors. */
  abstract fetch(externalId: string): Promise<ListingSnapshot | null>;
}
