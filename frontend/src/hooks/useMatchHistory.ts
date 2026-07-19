import { useCallback } from "react";
import type { PlayerResponse, TagResponse } from "../interfaces/API";
import type { GroupedMatch } from "../interfaces/Player";
import { groupMatches } from "../utils/Player";
import { fetchHistory } from "../utils/playerApi";
import { shouldShowNext } from "../utils/playerUtils";
import { useResettableState } from "./useResettableState";

const EMPTY_STATE: {
  history: GroupedMatch[];
  tags: { [key: string]: TagResponse[] };
  showNext: boolean;
} = { history: [], tags: {}, showNext: true };

export function useMatchHistory(
  player_id: bigint,
  char_short: string | undefined,
  count: string | undefined,
  offset: string | undefined,
) {
  const [state, setState, resetHistory] = useResettableState(EMPTY_STATE);

  const loadHistory = useCallback(
    async (player: PlayerResponse) => {
      if (!char_short) return;
      const historyResult = await fetchHistory(
        player_id,
        char_short,
        count,
        offset,
      );
      if (!historyResult) return;
      setState({
        showNext: shouldShowNext(historyResult.history.length, count),
        history:
          historyResult.history.length !== 0
            ? groupMatches(historyResult.history, player, char_short, !!offset)
            : [],
        tags: historyResult.history.length !== 0 ? historyResult.tags : {},
      });
    },
    [char_short, count, offset, player_id, setState],
  );

  return { ...state, loadHistory, resetHistory };
}
