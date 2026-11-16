"use client";

import { useState } from "react";
import { API_ENDPOINT } from "../../lib/api-endpoint";

export function PlayerAvatar({
  playerId,
  alt = "Player Avatar",
}: {
  playerId: bigint;
  alt?: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div
      style={{
        width: 256,
        maxWidth: "100%",
        aspectRatio: "1",
        position: "relative",
      }}
    >
      {!failed && (
        // biome-ignore lint/performance/noImgElement: direct API image, without server blob URLs or duplicate requests.
        <img
          src={`${API_ENDPOINT}/avatar/${playerId}`}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
            transform: "scale(0.5)",
          }}
        />
      )}
    </div>
  );
}
