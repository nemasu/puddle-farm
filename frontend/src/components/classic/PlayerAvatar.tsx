import { Suspense } from "react";
import { getPlayerAvatar } from "../../lib/server/player";

async function AvatarImage({
  playerId,
  alt,
}: {
  playerId: bigint;
  alt: string;
}) {
  const src = await getPlayerAvatar(playerId);
  if (!src) return null;

  return (
    // biome-ignore lint/performance/noImgElement: inline PNG supplied by the server.
    <img
      src={src}
      alt={alt}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "contain",
        transform: "scale(0.5)",
      }}
    />
  );
}

export function PlayerAvatar({
  playerId,
  alt,
}: {
  playerId: bigint;
  alt: string;
}) {
  return (
    <div
      data-avatar-frame=""
      style={{
        width: 256,
        maxWidth: "100%",
        aspectRatio: "1",
        position: "relative",
      }}
    >
      <Suspense fallback={null}>
        <AvatarImage playerId={playerId} alt={alt} />
      </Suspense>
    </div>
  );
}
