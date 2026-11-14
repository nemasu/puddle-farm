"use client";

import RefreshIcon from "@mui/icons-material/Refresh";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useCallback, useTransition } from "react";
import { useAutoUpdate } from "../../hooks/useAutoUpdate";
import { useRatingSync } from "../../hooks/useRatingSync";
import { usePreferencesContext } from "../DisplayPreferences";

export function PlayerSync({ playerId }: { playerId: bigint }) {
  const router = useRouter();
  const [pending, transition] = useTransition();
  const refresh = useCallback(async () => {
    transition(() => router.refresh());
  }, [router]);
  const { handleRatingSync, syncLoading, syncError, clearSyncError } =
    useRatingSync(playerId, refresh);
  return (
    <>
      <Tooltip title="Sync ratings from game">
        <IconButton
          aria-label="Sync ratings from game"
          onClick={handleRatingSync}
          disabled={pending || syncLoading}
          size="small"
          sx={{ ml: 1, color: "primary.main" }}
        >
          <RefreshIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Dialog
        open={syncError !== null}
        onClose={clearSyncError}
        aria-labelledby="sync-error-title"
      >
        <DialogTitle id="sync-error-title">Rating Sync Error</DialogTitle>
        <DialogContent>
          <DialogContentText>{syncError}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={clearSyncError} autoFocus>
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export function PlayerAutoRefresh() {
  const router = useRouter();
  const [, transition] = useTransition();
  const refresh = useCallback(async () => {
    transition(() => router.refresh());
  }, [router]);
  const preferences = usePreferencesContext();
  const countdown = useAutoUpdate(refresh, preferences?.preferences.autoUpdate);
  return countdown === null ? null : (
    <Typography variant="h6" gutterBottom>
      Auto-update in: {countdown} seconds
    </Typography>
  );
}
