import { createEntityAdapter } from '@reduxjs/toolkit';
import type { Appliance } from '@/types/api/models';

const nextDue = (a: Appliance) => a.tasks[0]?.nextDueAt ?? '9999';

/** Appliances keyed by id, ordered by their most urgent task. */
export const applianceAdapter = createEntityAdapter<Appliance>({
  sortComparer: (a, b) => nextDue(a).localeCompare(nextDue(b)),
});

export const applianceSelectors = applianceAdapter.getSelectors();
