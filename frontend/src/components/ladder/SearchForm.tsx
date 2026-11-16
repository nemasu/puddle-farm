"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { getMessages } from "../../lib/i18n";
import { buildSearchPath } from "../../lib/search";
import type { Language } from "../../lib/site-preferences";
import styles from "./ladder.module.css";

export function SearchForm({
  query,
  exact,
  language,
}: {
  query: string;
  exact: boolean;
  language: Language;
}) {
  const messages = getMessages(language).ladder;
  const router = useRouter();
  const [draft, setDraft] = useState(query);
  const [pending, startTransition] = useTransition();
  useEffect(() => setDraft(query), [query]);
  const search = (value: string, exactMatch: boolean) =>
    startTransition(() => router.push(buildSearchPath(value, exactMatch)));
  return (
    <form
      action="/search"
      method="get"
      className={styles.controls}
      aria-busy={pending || undefined}
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        search(String(form.get("q") ?? ""), form.get("exact") === "true");
      }}
    >
      <div className={styles.searchField}>
        <label htmlFor="player-query">{messages.searchLabel}</label>
        <input
          id="player-query"
          name="q"
          type="search"
          className={styles.search}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          autoComplete="off"
        />
      </div>
      <div className={styles.filterRow}>
        <label className={styles.exactSearch}>
          <input
            name="exact"
            type="checkbox"
            value="true"
            checked={exact}
            onChange={(event) => search(draft, event.target.checked)}
          />
          {messages.exactSearch}
        </label>
        <button type="submit">{messages.searchSubmit}</button>
      </div>
    </form>
  );
}
