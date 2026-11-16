"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useTransition } from "react";
import { selectRankingCharacter } from "../../app/actions/ranking-navigation";
import styles from "./ladder.module.css";

export function CharacterForm({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <form
      action={selectRankingCharacter}
      className={styles.controls}
      aria-busy={pending || undefined}
      onSubmit={(event) => {
        event.preventDefault();
        const character = new FormData(event.currentTarget).get("character");
        const path =
          typeof character === "string" && character
            ? `/top/${encodeURIComponent(character)}`
            : "/top_global";
        startTransition(() => router.push(path));
      }}
    >
      {children}
    </form>
  );
}
