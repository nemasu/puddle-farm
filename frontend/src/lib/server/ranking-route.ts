import "server-only";

import { redirect } from "next/navigation";
import {
  firstParam,
  type PageSearchParams,
  pageOffset,
  parsePagination,
  rankingPath,
} from "../pagination";

export function resolveRankingRoute(
  base: string,
  segments: string[] | undefined,
  searchParams: PageSearchParams,
) {
  const pagination = parsePagination(segments);
  // Reject malformed/unsafe values before issuing API reads.
  if (!pagination) redirect("/");
  const requestedPage = firstParam(searchParams.page);
  if (requestedPage !== undefined) {
    const offset = pageOffset(requestedPage, pagination.count);
    redirect(
      rankingPath(base, { ...pagination, offset: offset ?? pagination.offset }),
    );
  }
  return pagination;
}
