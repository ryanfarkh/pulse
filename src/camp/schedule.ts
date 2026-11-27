import { addDays, clamp, daysBetween, parseISO, todayISO } from "../format";
import { DEFAULT_LAYOUT, isTemplateId } from "./program";
import { CAMP_WEEKS, type TemplateId } from "./types";

export const CAMP_START_DEFAULT = "2026-11-30";

export function snapToMonday(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return CAMP_START_DEFAULT;
  const d = parseISO(iso);
  const back = d.getDay() === 0 ? 6 : d.getDay() - 1;
  d.setDate(d.getDate() - back);
  return todayISO(d);
}

export function activeCampWeek(start: string, today = todayISO()): number {
  const delta = daysBetween(snapToMonday(start), today);
  if (delta < 0) return 1;
  return clamp(Math.floor(delta / 7) + 1, 1, CAMP_WEEKS);
}

export function campDate(start: string, week: number, day: number): string {
  return addDays(snapToMonday(start), (week - 1) * 7 + clamp(day, 0, 6));
}

export function campDayLabel(iso: string): string {
  const d = parseISO(iso);
  const name = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][(d.getDay() + 6) % 7];
  const md = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${name} ${md}`;
}

export function mondayTitle(iso: string): string {
  return parseISO(iso).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function parseLayout(value: unknown): TemplateId[] | null {
  if (!Array.isArray(value) || value.length !== 7) return null;
  const ids = value.filter((item): item is TemplateId => typeof item === "string" && isTemplateId(item));
  if (new Set(ids).size !== 7) return null;
  return ids;
}

export function layoutOrDefault(override: TemplateId[] | undefined, fallback: TemplateId[] = DEFAULT_LAYOUT): TemplateId[] {
  return override ?? fallback;
}
