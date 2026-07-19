import { useCallback } from "react";
import { fetchAlias, fetchAvatar, fetchComment } from "../utils/playerApi";
import { useResettableState } from "./useResettableState";

const EMPTY_STATE: {
  alias: string[];
  avatar: string | null;
  comment: string | null;
} = { alias: [], avatar: null, comment: null };

export function usePlayerProfile(player_id: bigint) {
  const [state, setState, resetProfile] = useResettableState(EMPTY_STATE);

  const loadProfile = useCallback(
    async (playerName: string) => {
      const [aliasResult, avatarResult, commentResult] =
        await Promise.allSettled([
          fetchAlias(player_id, playerName),
          fetchAvatar(player_id),
          fetchComment(player_id),
        ]);
      for (const result of [aliasResult, avatarResult, commentResult]) {
        if (result.status === "rejected") {
          console.error("Error fetching player profile:", result.reason);
        }
      }
      setState({
        alias: aliasResult.status === "fulfilled" ? aliasResult.value : [],
        avatar: avatarResult.status === "fulfilled" ? avatarResult.value : null,
        comment:
          commentResult.status === "fulfilled" ? commentResult.value : null,
      });
    },
    [player_id, setState],
  );

  return { ...state, loadProfile, resetProfile };
}
