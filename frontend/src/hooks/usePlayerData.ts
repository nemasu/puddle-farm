import { useState } from "react";
import { useParams } from "react-router-dom";
import { filterHistory, parsePlayerId } from "../utils/playerUtils";
import { useAutoUpdate } from "./useAutoUpdate";
import { usePlayerFetch } from "./usePlayerFetch";
import { useRatingSync } from "./useRatingSync";

export function usePlayerData() {
  const { player_id, char_short, count, offset } = useParams();
  const player_id_checked = parsePlayerId(player_id);

  const {
    player,
    currentCharData,
    history,
    tags,
    showNext,
    loading,
    alias,
    avatar,
    comment,
    reloadPlayer,
  } = usePlayerFetch(player_id_checked, char_short, count, offset);

  const { syncLoading, syncError, handleRatingSync, clearSyncError } =
    useRatingSync(player_id_checked, reloadPlayer);

  const [matchFilter, _setMatchFilter] = useState<"all" | "ranked" | "tower">(
    "all",
  );
  const filteredHistory = filterHistory(history, matchFilter);
  const countdown = useAutoUpdate(reloadPlayer);

  return {
    player,
    currentCharData,
    alias,
    loading,
    showNext,
    tags,
    countdown,
    avatar,
    comment,
    filteredHistory,
    syncLoading,
    syncError,
    player_id_checked,
    char_short,
    count,
    offset,
    handleRatingSync,
    clearSyncError,
  };
}
