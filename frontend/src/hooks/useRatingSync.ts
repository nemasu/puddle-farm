import { useState } from "react";
import { fetchRatingSync } from "../utils/playerApi";

export function useRatingSync(
  player_id: bigint,
  onSuccess: () => Promise<void>,
) {
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const handleRatingSync = async () => {
    if (!player_id || syncLoading) return;
    setSyncLoading(true);
    setSyncError(null);
    try {
      const result = await fetchRatingSync(player_id);
      if (result.ok) {
        await onSuccess();
      } else {
        setSyncError(result.error);
      }
    } finally {
      setSyncLoading(false);
    }
  };

  const clearSyncError = () => setSyncError(null);

  return { syncLoading, syncError, handleRatingSync, clearSyncError };
}
