"use client";

import { useState } from "react";
import { API_ENDPOINT } from "../../lib/api-endpoint";

export function PlayerAvatar({ playerId }: { playerId: bigint }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    // biome-ignore lint/performance/noImgElement: direct API image, without server blob URLs or duplicate requests.
    <img
      src={`${API_ENDPOINT}/avatar/${playerId}`}
      alt="Player Avatar"
      loading="lazy"
      onError={() => setFailed(true)}
      style={{ maxWidth: "100%", height: "auto", transform: "scale(0.5)" }}
    />
  );
}
