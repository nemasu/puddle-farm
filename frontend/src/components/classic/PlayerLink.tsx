"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useTransition } from "react";
import { resolvePlayerDestination } from "../../app/actions/player-navigation";
import { LinkButton } from "./LinkButton";

export function PlayerLink({
  playerId,
  children,
}: {
  playerId: bigint;
  children: ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <LinkButton
      href={`/player/${playerId}`}
      sx={{ fontSize: 16 }}
      aria-busy={pending || undefined}
      onNavigate={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const destination = await resolvePlayerDestination(playerId).catch(
            () => `/player/${playerId}`,
          );
          router.push(destination);
        });
      }}
    >
      {children}
    </LinkButton>
  );
}
