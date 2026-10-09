import holidayJp from '@holiday-jp/holiday_jp';

/**
 * Japanese public-holiday name for `date` ('yyyy-MM-dd'), or null. Looks up
 * the bundled dict by plain date-string key directly — deliberately not
 * holidayJp.isHoliday()/between(), which take Date objects and would
 * reintroduce the local/UTC parsing ambiguity plainDate.ts's own comment
 * warns against.
 *
 * Coverage: bundled data extends to 2050, well past MonthScreen's ~5-year
 * paging range. Dates without an entry (e.g. before the dataset's start)
 * simply return null rather than guessing.
 */
export function getHolidayName(date: string): string | null {
  const holidays = holidayJp.holidays as Record<string, { name: string } | undefined>;
  return holidays[date]?.name ?? null;
}
