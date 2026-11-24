import { createEntityAdapter } from '@reduxjs/toolkit';
import type { Receipt } from '@/types/api/models';

/** Receipts keyed by id, newest first; merges pages without duplicates. */
export const receiptAdapter = createEntityAdapter<Receipt>({
  sortComparer: (a, b) => b.createdAt.localeCompare(a.createdAt),
});

export const receiptSelectors = receiptAdapter.getSelectors();

export const normalizeReceiptPages = (pages: Receipt[][] | undefined) =>
  receiptAdapter.setAll(receiptAdapter.getInitialState(), (pages ?? []).flat());
