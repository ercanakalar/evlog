import type { EntityState } from '@reduxjs/toolkit';
import type { Appliance, Upkeep } from '@/types/api/models';
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

