export type WarehouseAssignmentKind = 'משמרת' | 'נוכחות' | 'שונות';

export interface ParsedWarehouseAssignment {
  kind: WarehouseAssignmentKind;
  startTime: string;
  endTime: string;
  note: string;
}

export const WAREHOUSE_DETAIL_PREFIX = 'מחסנאי';

const TIME_RANGE_REGEX = /(\d{2}:\d{2})-(\d{2}:\d{2})/;

export const isWarehouseAssignmentDetails = (details?: string | null) =>
  Boolean(details?.startsWith(WAREHOUSE_DETAIL_PREFIX));

export function parseWarehouseAssignment(details?: string | null): ParsedWarehouseAssignment {
  const fallback: ParsedWarehouseAssignment = {
    kind: 'משמרת',
    startTime: '',
    endTime: '',
    note: '',
  };

  if (!isWarehouseAssignmentDetails(details)) return fallback;

  const parts = (details || '').split('|').map((part) => part.trim());
  const storedKind = parts[1];

  // Backwards compatibility with the existing format:
  // "מחסנאי | 08:00-16:00"
  if (storedKind && TIME_RANGE_REGEX.test(storedKind)) {
    const match = storedKind.match(TIME_RANGE_REGEX);
    return {
      ...fallback,
      startTime: match?.[1] || '',
      endTime: match?.[2] || '',
    };
  }

  if (storedKind === 'נוכחות') {
    return { ...fallback, kind: 'נוכחות' };
  }

  if (storedKind === 'שונות') {
    return {
      ...fallback,
      kind: 'שונות',
      note: parts.slice(2).join(' | ').trim(),
    };
  }

  if (storedKind === 'משמרת') {
    const match = parts.slice(2).join(' | ').match(TIME_RANGE_REGEX);
    return {
      ...fallback,
      startTime: match?.[1] || '',
      endTime: match?.[2] || '',
    };
  }

  // Extra defensive fallback for any older/hand-edited value that still
  // contains a valid time range after the warehouse prefix.
  const match = (details || '').match(TIME_RANGE_REGEX);
  return {
    ...fallback,
    startTime: match?.[1] || '',
    endTime: match?.[2] || '',
  };
}

export function buildWarehouseAssignmentDetails(
  kind: WarehouseAssignmentKind,
  options?: { startTime?: string; endTime?: string; note?: string }
): string {
  if (kind === 'משמרת') {
    return `${WAREHOUSE_DETAIL_PREFIX} | משמרת | ${options?.startTime || ''}-${options?.endTime || ''}`;
  }

  if (kind === 'שונות') {
    const cleanNote = (options?.note || '').replace(/\s+/g, ' ').trim();
    return `${WAREHOUSE_DETAIL_PREFIX} | שונות | ${cleanNote}`;
  }

  return `${WAREHOUSE_DETAIL_PREFIX} | נוכחות`;
}
