export type Pagination = { count: number; offset: number };
export type PageSearchParams = Record<string, string | string[] | undefined>;

export function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function integer(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function parsePagination(segments: string[] = []): Pagination | null {
  if (segments.length > 2) return null;
  const count = segments[0] === undefined ? 100 : integer(segments[0]);
  const offset = segments[1] === undefined ? 0 : integer(segments[1]);
  if (count === null || count <= 0 || offset === null) return null;
  return { count, offset };
}

export function pageOffset(page: string, count: number): number | null {
  const parsed = integer(page);
  if (
    parsed === null ||
    parsed < 1 ||
    !Number.isSafeInteger(count) ||
    count < 1
  )
    return null;
  const offset = (parsed - 1) * count;
  return Number.isSafeInteger(offset) ? offset : null;
}

export function rankingPath(
  base: string,
  { count, offset }: Pagination,
): string {
  return `${base}/${count}/${offset}`;
}
