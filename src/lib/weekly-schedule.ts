import type { WeeklySchedule } from '@/types';

const DAY_ORDER = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

const DAY_LABELS: Record<(typeof DAY_ORDER)[number], string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
};

export function formatWeeklySchedule(schedule: WeeklySchedule | null | undefined): string[] {
  if (!schedule) return [];

  return DAY_ORDER
    .map((day) => {
      const ranges = schedule[day];
      if (!ranges || ranges.length === 0) return null;
      const summary = ranges.map((range) => `${range.start}-${range.end}`).join(', ');
      return `${DAY_LABELS[day]} ${summary}`;
    })
    .filter((entry): entry is string => Boolean(entry));
}

export function serializeWeeklyScheduleDay(
  schedule: WeeklySchedule | null | undefined,
  day: keyof WeeklySchedule
): string {
  const ranges = schedule?.[day];
  if (!ranges || ranges.length === 0) {
    return '';
  }

  return ranges.map((range) => `${range.start}-${range.end}`).join(', ');
}

export function parseWeeklyScheduleInput(
  raw: Partial<Record<keyof WeeklySchedule, string>>
): WeeklySchedule {
  const nextSchedule: WeeklySchedule = {};

  for (const day of DAY_ORDER) {
    const value = raw[day]?.trim();
    if (!value) continue;

    const ranges = value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const [start, end] = entry.split('-').map((part) => part.trim());
        if (!start || !end) {
          throw new Error(`Invalid time range for ${DAY_LABELS[day]}. Use HH:MM-HH:MM.`);
        }
        if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) {
          throw new Error(`Invalid time format for ${DAY_LABELS[day]}. Use HH:MM-HH:MM.`);
        }
        return { start, end };
      });

    if (ranges.length > 0) {
      nextSchedule[day] = ranges;
    }
  }

  return nextSchedule;
}
