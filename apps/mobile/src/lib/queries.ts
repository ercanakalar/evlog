import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type UploadFile } from './api';
import type {
  ConditionPhoto,
  ConditionSession,
  ConditionSessionType,
  Dashboard,
  KitchenSummary,
  Listing,
  Me,
  PublishedRating,
  RatingCategory,
  RatingEligibility,
  Receipt,
  ReceiptKind,
  Room,
  Upkeep,
} from './types';

export const keys = {
  me: ['me'] as const,
  home: (id: string) => ['home', id] as const,
  sessions: (homeId: string) => ['home', homeId, 'sessions'] as const,
  session: (id: string) => ['session', id] as const,
  eligibility: (homeId: string) => ['home', homeId, 'eligibility'] as const,
  ratings: (homeId: string) => ['home', homeId, 'ratings'] as const,
  kitchen: (homeId: string) => ['home', homeId, 'kitchen'] as const,
  upkeep: (homeId: string) => ['home', homeId, 'upkeep'] as const,
  listings: (homeId: string) => ['home', homeId, 'listings'] as const,
  receipt: (id: string) => ['receipt', id] as const,
};

// ───────── Account & home ─────────

export const useMe = (enabled = true) =>
  useQuery({ queryKey: keys.me, queryFn: () => api<Me>('/me'), enabled });

export const useDashboard = (homeId: string) =>
  useQuery({ queryKey: keys.home(homeId), queryFn: () => api<Dashboard>(`/homes/${homeId}`) });

export function useCreateHome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      city: string;
      district: string;
      neighborhood?: string;
      addressLine: string;
      roomLayout: string;
      areaM2?: number;
    }) => api<{ id: string }>('/homes', { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.me }),
  });
}

export function useJoinHome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) =>
      api('/tenancies/accept', { method: 'POST', body: { code: code.trim().toUpperCase() } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.me }),
  });
}

export const useInviteTenant = (homeId: string) =>
  useMutation({
    mutationFn: (startDate: string) =>
      api<{ inviteCode: string }>(`/homes/${homeId}/tenancies/invite`, {
        method: 'POST',
        body: { startDate },
      }),
  });

// ───────── Condition record ─────────

export const useSessions = (homeId: string) =>
  useQuery({
    queryKey: keys.sessions(homeId),
    queryFn: () => api<ConditionSession[]>(`/homes/${homeId}/condition-sessions`),
  });

export const useSession = (id: string) =>
  useQuery({
    queryKey: keys.session(id),
    queryFn: () =>
      api<ConditionSession & { photos: ConditionPhoto[] }>(`/condition-sessions/${id}`),
  });

export function useStartSession(homeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (type: ConditionSessionType) =>
      api<ConditionSession>(`/homes/${homeId}/condition-sessions`, {
        method: 'POST',
        body: { type },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['home', homeId] }),
  });
}

export function useAddPhoto(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, room }: { file: UploadFile; room: Room }) =>
      api<ConditionPhoto>(`/condition-sessions/${sessionId}/photos`, {
        method: 'POST',
        form: { file, room, capturedAt: new Date().toISOString() },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.session(sessionId) }),
  });
}

export function useSessionAction(sessionId: string, homeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (action: 'lock' | 'confirm') =>
      api<ConditionSession>(`/condition-sessions/${sessionId}/${action}`, { method: 'POST' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.session(sessionId) });
      void qc.invalidateQueries({ queryKey: ['home', homeId] });
    },
  });
}

// ───────── Receipts ─────────

export function useScanReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { file: UploadFile; kind: ReceiptKind; homeId?: string }) =>
      api<Receipt>('/receipts', {
        method: 'POST',
        form: { file: input.file, kind: input.kind, homeId: input.homeId },
      }),
    onSuccess: (receipt) => qc.setQueryData(keys.receipt(receipt.id), receipt),
  });
}

/** Polls while the reader is still working (asynchronous callback mode). */
export const useReceipt = (id: string) =>
  useQuery({
    queryKey: keys.receipt(id),
    queryFn: () => api<Receipt>(`/receipts/${id}`),
    refetchInterval: (query) =>
      query.state.data?.status === 'PROCESSING' || query.state.data?.status === 'PENDING'
        ? 2000
        : false,
  });

export function useUpdateReceipt(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<{ merchantName: string; issuedAt: string; totalAmount: number }>) =>
      api<Receipt>(`/receipts/${id}`, { method: 'PATCH', body }),
    onSuccess: (receipt) => qc.setQueryData(keys.receipt(id), receipt),
  });
}

export function useConfirmReceipt(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<Receipt>(`/receipts/${id}/confirm`, { method: 'POST' }),
    onSuccess: (receipt) => {
      qc.setQueryData(keys.receipt(id), receipt);
      void qc.invalidateQueries({ queryKey: ['home'] });
    },
  });
}

// ───────── Ratings ─────────

export const useEligibility = (homeId: string, enabled: boolean) =>
  useQuery({
    queryKey: keys.eligibility(homeId),
    queryFn: () => api<RatingEligibility>(`/homes/${homeId}/ratings/eligibility`),
    enabled,
  });

export const useRatings = (homeId: string) =>
  useQuery({
    queryKey: keys.ratings(homeId),
    queryFn: () => api<PublishedRating[]>(`/homes/${homeId}/ratings`),
  });

export function useSubmitRating(homeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      scores: { category: RatingCategory; score: number }[];
      noteForNextTenant?: string;
    }) => api(`/homes/${homeId}/ratings`, { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['home', homeId] }),
  });
}

// ───────── Kitchen ─────────

export const useKitchen = (homeId: string) =>
  useQuery({
    queryKey: keys.kitchen(homeId),
    queryFn: () => api<KitchenSummary>(`/homes/${homeId}/kitchen`),
  });

export const useAddToShoppingList = (homeId: string) =>
  useMutation({
    mutationFn: (name: string) =>
      api(`/homes/${homeId}/shopping-list`, { method: 'POST', body: { name } }),
  });

// ───────── Upkeep ─────────

export const useUpkeep = (homeId: string) =>
  useQuery({
    queryKey: keys.upkeep(homeId),
    queryFn: () => api<Upkeep>(`/homes/${homeId}/upkeep`),
  });

export function useCompleteTask(homeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) =>
      api(`/maintenance-tasks/${taskId}/done`, { method: 'POST', body: {} }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['home', homeId] }),
  });
}

export function useAddAppliance(homeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { type: string; name: string }) =>
      api(`/homes/${homeId}/appliances`, { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['home', homeId] }),
  });
}

// ───────── Listings ─────────

export const useListings = (homeId: string) =>
  useQuery({
    queryKey: keys.listings(homeId),
    queryFn: () => api<Listing[]>(`/homes/${homeId}/listings`),
  });

export function useLinkListing(homeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reference: string) =>
      api<Listing>(`/homes/${homeId}/listings`, { method: 'POST', body: { reference } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['home', homeId] }),
  });
}

export function useUpdateListing(homeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Partial<Pick<Listing, 'sharePhotos' | 'shareRatings' | 'shareHeatingBills'>>) =>
      api<Listing>(`/listings/${id}`, { method: 'PATCH', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.listings(homeId) }),
  });
}

export function useAddBroker(homeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; agencyName: string; email: string }) =>
      api<{ shareUrl: string }>(`/listings/${id}/brokers`, { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.listings(homeId) }),
  });
}

export function useSendListingUpdate(homeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api<{ recipients: number }>(`/listings/${id}/send-update`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.listings(homeId) }),
  });
}
