export type DayHours = { day: number; open: string; close: string; closed: boolean };

const toMin = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));

/**
 * Is the restaurant open at `now` in its timezone? day: 0 = Monday … 6 = Sunday.
 * Supports closing after midnight (e.g. 10:00–02:00 belongs to the opening day).
 */
export function isOpenAt(hours: DayHours[], now: Date, timeZone = "Asia/Almaty"): boolean {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const wd = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  const day = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(wd);
  const minutes =
    Number(parts.find((p) => p.type === "hour")?.value) * 60 + Number(parts.find((p) => p.type === "minute")?.value);

  const today = hours.find((h) => h.day === day);
  if (today && !today.closed) {
    const o = toMin(today.open);
    const c = toMin(today.close);
    if (c > o ? minutes >= o && minutes < c : minutes >= o) return true;
  }
  const prev = hours.find((h) => h.day === (day + 6) % 7);
  if (prev && !prev.closed) {
    const o = toMin(prev.open);
    const c = toMin(prev.close);
    if (c <= o && minutes < c) return true;
  }
  return false;
}
