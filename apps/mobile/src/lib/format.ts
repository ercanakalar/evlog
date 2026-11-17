const DAY = 86_400_000;

const tl = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "842.5" -> "842,50 TL" */
export const money = (value: string | number | null | undefined, currency = 'TRY') =>
  value === null || value === undefined
    ? '—'
    : `${tl.format(Number(value))} ${currency === 'TRY' ? 'TL' : currency}`;

export const shortDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—';

export const longDate = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

export const monthYear = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });

/** "6 days ago", "5 weeks ago" */
export const ago = (iso: string) => {
  const days = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / DAY));
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  return `${Math.round(days / 30)} months ago`;
};

export const every = (days: number) => {
  if (days % 365 === 0) return days === 365 ? 'every year' : `every ${days / 365} years`;
  if (days % 30 === 0) return days === 30 ? 'every month' : `every ${days / 30} months`;
  if (days % 7 === 0) return days === 7 ? 'every week' : `every ${days / 7} weeks`;
  return `every ${days} days`;
};

export const ROOM_LABEL: Record<string, string> = {
  LIVING_ROOM: 'Living room',
  KITCHEN: 'Kitchen',
  BEDROOM: 'Bedroom',
  BATHROOM: 'Bathroom',
  BALCONY: 'Balcony',
  HALLWAY: 'Hallway',
  METERS: 'Meters',
  OTHER: 'Other',
};

export const CATEGORY_LABEL: Record<string, { title: string; hint: string }> = {
  HOME_CONDITION: { title: 'Home condition', hint: 'Walls, floors, doors, windows' },
  NEIGHBORHOOD: { title: 'Neighborhood', hint: 'Noise, safety, transport' },
  INFRASTRUCTURE: { title: 'Infrastructure', hint: 'Water, power, internet' },
  HEATING_EFFICIENCY: { title: 'Heating efficiency', hint: 'Warmth vs. gas used' },
  RENOVATIONS: { title: 'Renovations', hint: 'Work done during your stay' },
};

export const RECEIPT_KIND_LABEL: Record<string, string> = {
  GROCERY: 'Groceries',
  RENT: 'Rent',
  UTILITY_ELECTRICITY: 'Electricity bill',
  UTILITY_WATER: 'Water bill',
  UTILITY_GAS: 'Gas bill',
  UTILITY_INTERNET: 'Internet bill',
  RENOVATION: 'Renovation',
  APPLIANCE: 'Appliance purchase',
  SERVICE: 'Service invoice',
  OTHER: 'Other',
};
