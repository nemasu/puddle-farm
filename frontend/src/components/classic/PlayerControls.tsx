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
import { useCallback, useState, useTransition } from "react";
import { useAutoUpdate } from "../../hooks/useAutoUpdate";
import { useRatingSync } from "../../hooks/useRatingSync";
import { API_ENDPOINT } from "../../lib/api-endpoint";
import { getMessages } from "../../lib/i18n";
import type { Language } from "../../lib/site-preferences";
import { usePreferencesContext } from "../DisplayPreferences";

export function PlayerSync({
  playerId,
  language = "en",
}: {
  playerId: bigint;
  language?: Language;
}) {
  const messages = getMessages(language).player;
  const router = useRouter();
  const [pending, transition] = useTransition();
  const refresh = useCallback(async () => {
    transition(() => router.refresh());
  }, [router]);
  const { handleRatingSync, syncLoading, syncError, clearSyncError } =
    useRatingSync(playerId, refresh);
  return (
    <>
      <Tooltip title={messages.sync}>
        <IconButton
          aria-label={messages.sync}
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
        <DialogTitle id="sync-error-title">{messages.syncError}</DialogTitle>
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

export function PlayerAutoRefresh({
  language = "en",
}: {
  language?: Language;
} = {}) {
  const messages = getMessages(language).player;
  const router = useRouter();
  const [, transition] = useTransition();
  const refresh = useCallback(async () => {
    transition(() => router.refresh());
  }, [router]);
  const preferences = usePreferencesContext();
  const countdown = useAutoUpdate(refresh, preferences?.preferences.autoUpdate);
  return countdown === null ? null : (
    <Typography variant="h6" gutterBottom>
      {messages.autoUpdate} {countdown} {messages.seconds}
    </Typography>
  );
}

export function PlayerProfileRefresh({
  playerId,
  language = "en",
}: {
  playerId: bigint;
  language?: Language;
}) {
  const messages = getMessages(language).player;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setRefreshing(true);
    setError(null);
    try {
      const response = await fetch(
        `${API_ENDPOINT}/profile_refresh/${playerId}`,
        {
          method: "POST",
        },
      );
      if (response.status === 429) {
        setError(messages.refreshProfileLimit);
        return;
      }
      if (!response.ok) {
        setError(messages.refreshProfileError);
        if (response.status === 503) startTransition(() => router.refresh());
        return;
      }
      startTransition(() => router.refresh());
    } catch {
      setError(messages.refreshProfileError);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <>
      <Button
        size="small"
        startIcon={<RefreshIcon />}
        onClick={refresh}
        disabled={refreshing || pending}
      >
        {messages.refreshProfile}
      </Button>
      {error && (
        <Typography role="alert" color="error" variant="body2">
          {error}
        </Typography>
      )}
    </>
  );
}
