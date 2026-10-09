import { useColorScheme } from 'react-native';

export interface Palette {
  color: {
    paper: string;
    ink: string;
    terracotta: string;
    sunday: string;
    saturday: string;
    category: readonly [
      string, string, string, string, string, string, string, string, string,
    ];
  };
  font: {
    family: string;
  };
  radius: {
    card: number;
    ribbonEnd: number;
  };
  stroke: {
    ribbon: number;
  };
  layout: {
    dayCell: {
      minHeight: number;
      dateRowHeight: number;
      holidayRowHeight: number;
      ribbonRowHeight: number;
      eventRowHeight: number;
      maxVisibleEvents: number;
    };
  };
}

export const light: Palette = {
  color: {
    paper: '#FBF9F6',
    ink: '#1B1A18',
    terracotta: '#A8543C',
    sunday: '#9A4F49',
    saturday: '#4E6E83',
    category: [
      '#4A6B63',
      '#8A5A46',
      '#3F6C8E',
      '#8E5570',
      '#8A6A3C',
      '#3A3733',
      '#7A6AA0',
      '#6E7F4A',
      '#5E7E86',
    ],
  },
  font: {
    family: 'System',
  },
  radius: {
    card: 16,
    ribbonEnd: 2,
  },
  stroke: {
    ribbon: 2,
  },
  // First-pass round numbers, not measured from the concept deck's mockup
  // proportions — the ribbon/note-dot rows must stay a fixed-height reserved
  // slot so Step 4/5 can fill them without reflowing the grid. Tune later.
  layout: {
    dayCell: {
      minHeight: 92,
      dateRowHeight: 24,
      holidayRowHeight: 12,
      ribbonRowHeight: 6,
      eventRowHeight: 16,
      maxVisibleEvents: 2,
    },
  },
};

// SEAM FOR FUTURE DARK MODE — do not fill this in with invented hex values.
// The design doc notes dark-mode colors exist only in an external concept
// slide not included in the doc. When that palette is available, define
// `export const dark: Palette = { ... }` and switch useTokens() below to
// select it. Until then it always resolves to `light`, regardless of scheme.
export function useTokens(): Palette {
  useColorScheme();
  return light;
}

/**
 * Resolves the date-number/weekday-label color for a given day of week,
 * respecting Settings.showWeekendColor/weekendColorMode. Shared by DayCell,
 * WeekdayHeader, and the calendar-settings preview strip so none of them can
 * visually drift from one another.
 *
 * `isHoliday` only makes sense for an actual calendar date (not the abstract
 * weekday-label row), so it's optional and defaults to false — WeekdayHeader
 * and the settings preview strip don't pass it. A holiday is treated exactly
 * like Sunday: same gating on showWeekendColor, same color in `redBlue`
 * mode (red, even if the holiday falls on a Saturday), same shade in
 * `shadeOnly` mode.
 */
export function resolveWeekdayColor(
  dow: number,
  tokens: Palette,
  showWeekendColor: boolean,
  weekendColorMode: 'redBlue' | 'shadeOnly',
  isHoliday = false,
): string {
  const isSpecialDay = dow === 0 || dow === 6 || isHoliday;
  if (!isSpecialDay || !showWeekendColor) return tokens.color.ink;
  if (weekendColorMode === 'redBlue') return dow === 6 && !isHoliday ? tokens.color.saturday : tokens.color.sunday;
  return `${tokens.color.ink}99`; // shade-only: opacity only, no hue — distinct from the `66` used elsewhere for generic muted text
}
