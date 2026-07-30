import { useNavigate } from "react-router-dom";

export function buildSearchPath(searchQuery: string, exact: boolean): string {
  const params = new URLSearchParams({ q: searchQuery });
  if (exact) {
    params.set("exact", "true");
  }
  return `/search?${params.toString()}`;
}

export function useSearchNavigation() {
  const navigate = useNavigate();

  return (searchQuery: string, exact: boolean) =>
    navigate(buildSearchPath(searchQuery, exact));
}
