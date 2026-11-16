import { getMessages } from "../../lib/i18n";
import { type Pagination, rankingPath } from "../../lib/pagination";
import { computePageInput, computePrevPage } from "../../lib/rankings";
import type { Language } from "../../lib/site-preferences";
import { AppLink as Link } from "../AppLink";
import styles from "./ladder.module.css";

export function LadderPagination({
  base,
  pagination,
  showNext,
  position,
  language,
}: {
  base: string;
  pagination: Pagination;
  showNext: boolean;
  position: "top" | "bottom";
  language: Language;
}) {
  const messages = getMessages(language).ladder;
  const { count, offset } = pagination;
  return (
    <nav
      className={styles.pagination}
      aria-label={
        position === "top" ? messages.topPagination : messages.bottomPagination
      }
    >
      <Link href={rankingPath(base, computePrevPage(count, offset))}>
        {messages.prev}
      </Link>
      {showNext && Number.isSafeInteger(offset + count) && (
        <Link href={rankingPath(base, { count, offset: offset + count })}>
          {messages.next}
        </Link>
      )}
      <form action={`${rankingPath(base, pagination)}`} method="get">
        <label htmlFor={`page-${position}`}>{messages.page}</label>
        <input
          id={`page-${position}`}
          key={`${count}-${offset}`}
          name="page"
          type="number"
          min={1}
          step={1}
          required
          defaultValue={computePageInput(count, offset)}
        />
        <button type="submit">{messages.go}</button>
      </form>
    </nav>
  );
}
