const ISO8601_DURATION = /^P(?:\d+D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/;

/** Parses an ISO 8601 duration ("PT30M", "PT1H15M") into whole minutes. Returns null if unparseable/empty. */
export function parseIso8601DurationToMinutes(input: unknown): number | null {
  if (typeof input !== "string" || input.trim() === "") return null;

  const match = ISO8601_DURATION.exec(input.trim());
  if (!match) return null;

  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);

  const totalMinutes = hours * 60 + minutes + seconds / 60;
  if (totalMinutes === 0 && !match[1] && !match[2] && !match[3]) return null;

  return Math.round(totalMinutes);
}
