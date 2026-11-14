export function buildSearchPath(searchQuery: string, exact: boolean): string {
  const params = new URLSearchParams({ q: searchQuery });
  if (exact) params.set("exact", "true");
  return `/search?${params}`;
}
