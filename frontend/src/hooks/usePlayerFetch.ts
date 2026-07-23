import { useCallback, useEffect, useState } from "react";
import type { PlayerResponse, PlayerResponsePlayer } from "../interfaces/API";
import { fetchPlayer } from "../utils/playerApi";
import { findCharData, isEmptyPlayer } from "../utils/playerUtils";
import { useMatchHistory } from "./useMatchHistory";
import { usePlayerProfile } from "./usePlayerProfile";

export function usePlayerFetch(
  player_id: bigint,
  char_short: string | undefined,
  count: string | undefined,
  offset: string | undefined,
) {
  const [player, setPlayer] = useState<PlayerResponse | null>(null);
  const [currentCharData, setCurrentCharData] =
    useState<PlayerResponsePlayer | null>(null);
  const [loading, setLoading] = useState(true);

  const { history, tags, showNext, loadHistory, resetHistory } =
    useMatchHistory(player_id, char_short, count, offset);
  const { alias, avatar, comment, loadProfile, resetProfile } =
    usePlayerProfile(player_id);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const player_result = await fetchPlayer(player_id);
      setPlayer(player_result);

      if (isEmptyPlayer(player_result)) {
        resetHistory();
        setCurrentCharData(null);
        resetProfile();
        return;
      }

      if (!char_short) return;

      setCurrentCharData(findCharData(player_result.ratings, char_short));

      const results = await Promise.allSettled([
        loadHistory(player_result),
        loadProfile(player_result.name),
      ]);
      for (const result of results) {
        if (result.status === "rejected") {
          console.error("Error fetching player data:", result.reason);
        }
      }
    } catch (error) {
      console.error("Error fetching player data:", error);
    } finally {
      setLoading(false);
    }
  }, [
    player_id,
    char_short,
    loadHistory,
    loadProfile,
    resetHistory,
    resetProfile,
  ]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    player,
    currentCharData,
    history,
    tags,
    showNext,
    loading,
    alias,
    avatar,
    comment,
    reloadPlayer: load,
  };
}
