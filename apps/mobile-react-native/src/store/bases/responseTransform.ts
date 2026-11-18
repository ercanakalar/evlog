import type { EntityState } from '@reduxjs/toolkit';
import type { Appliance, KitchenSummary, Upkeep } from '@/types/api/models';
import { applianceAdapter } from '../adapters/applianceAdapter';

/** Drops undefined values so query strings stay clean. */
export const compact = <T extends Record<string, unknown>>(value: T) =>
  Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined && v !== '')) as Partial<T>;

export type NormalizedUpkeep = Omit<Upkeep, 'appliances'> & {
  appliances: EntityState<Appliance, string>;
};

/** Upkeep: appliances normalised and kept sorted by next due date. */
export const transformUpkeep = (raw: Upkeep): NormalizedUpkeep => ({
  next: raw.next,
  appliances: applianceAdapter.setAll(applianceAdapter.getInitialState(), raw.appliances),
});

/** Kitchen: newest price changes first, unchanged ones last. */
export const transformKitchen = (raw: KitchenSummary): KitchenSummary => ({
  ...raw,
  priceWatch: [...raw.priceWatch].sort(
    (a, b) => Math.abs(b.changePercent ?? 0) - Math.abs(a.changePercent ?? 0),
  ),
});
