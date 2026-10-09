import { StyleSheet, Text, View } from 'react-native';

import { resolveWeekdayColor, useTokens } from '../theme/tokens';

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

interface WeekdayHeaderProps {
  weekStartsOn: 0 | 1 | 6;
  showWeekendColor?: boolean;
  weekendColorMode?: 'redBlue' | 'shadeOnly';
}

export function WeekdayHeader({
  weekStartsOn,
  showWeekendColor = true,
  weekendColorMode = 'redBlue',
}: WeekdayHeaderProps) {
  const tokens = useTokens();
  const labels = [
    ...WEEKDAY_LABELS.slice(weekStartsOn),
    ...WEEKDAY_LABELS.slice(0, weekStartsOn),
  ];

  return (
    <View style={styles.row}>
      {labels.map((label, index) => {
        const dow = (weekStartsOn + index) % 7;
        const color = resolveWeekdayColor(dow, tokens, showWeekendColor, weekendColorMode);
        return (
          <View key={label} style={styles.cell}>
            <Text style={{ color, fontFamily: tokens.font.family, fontSize: 12 }}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 4 },
});
