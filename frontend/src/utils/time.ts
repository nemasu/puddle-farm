export type EpochMs = number & { readonly __brand: "EpochMs" };
export type DurationMs = number & { readonly __brand: "DurationMs" };

export const ONE_DAY_MS = 86400_000 as DurationMs;

export function addDuration(epoch: EpochMs, duration: DurationMs): EpochMs {
  return (epoch + duration) as EpochMs;
}

export function parseUtcTimestamp(dateTimeString: string): EpochMs | null {
  const ms = new Date(`${dateTimeString}Z`).getTime();
  return Number.isNaN(ms) ? null : (ms as EpochMs);
}
