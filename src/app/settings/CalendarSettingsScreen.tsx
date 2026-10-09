import { eachDayOfInterval, endOfWeek, startOfWeek } from 'date-fns';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { SegmentedControl } from '../../components/SegmentedControl';
import { WeekdayHeader } from '../../components/WeekdayHeader';
import { useSettingsStore } from '../../store/useSettingsStore';
import { resolveWeekdayColor, useTokens } from '../../theme/tokens';

const WEEK_START_OPTIONS: { label: string; value: 0 | 1 | 6 }[] = [
  { label: '日曜', value: 0 },
  { label: '月曜', value: 1 },
  { label: '土曜', value: 6 },
];

const WEEKEND_COLOR_MODE_OPTIONS: { label: string; value: 'redBlue' | 'shadeOnly' }[] = [
  { label: '赤と青', value: 'redBlue' },
  { label: '濃さだけ', value: 'shadeOnly' },
];

function PreviewStrip({
  weekStartsOn,
  showWeekendColor,
  weekendColorMode,
}: {
  weekStartsOn: 0 | 1 | 6;
  showWeekendColor: boolean;
  weekendColorMode: 'redBlue' | 'shadeOnly';
}) {
  const tokens = useTokens();
  const start = startOfWeek(new Date(), { weekStartsOn });
  const end = endOfWeek(new Date(), { weekStartsOn });
  const days = eachDayOfInterval({ start, end });

  return (
    <View>
      <WeekdayHeader weekStartsOn={weekStartsOn} showWeekendColor={showWeekendColor} weekendColorMode={weekendColorMode} />
      <View style={{ flexDirection: 'row' }}>
        {days.map((date) => (
          <View key={date.toISOString()} style={styles.previewCell}>
            <Text
              style={{
                color: resolveWeekdayColor(date.getDay(), tokens, showWeekendColor, weekendColorMode),
                fontFamily: tokens.font.family,
                fontSize: 14,
              }}
            >
              {date.getDate()}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function CalendarSettingsScreen() {
  const tokens = useTokens();
  const settings = useSettingsStore((state) => state.settings);
  const updateSettings = useSettingsStore((state) => state.updateSettings);

  return (
    <View style={[styles.container, { backgroundColor: tokens.color.paper }]}>
      <Text style={[styles.sectionLabel, { color: tokens.color.ink, fontFamily: tokens.font.family }]}>
        週の開始曜日
      </Text>
      <SegmentedControl
        options={WEEK_START_OPTIONS}
        value={settings.weekStartsOn}
        onChange={(value) => updateSettings({ weekStartsOn: value })}
      />

      <Text style={[styles.sectionLabel, { color: tokens.color.ink, fontFamily: tokens.font.family }]}>
        休日の表示
      </Text>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: tokens.color.ink, fontFamily: tokens.font.family, fontSize: 15 }}>
            土曜・日曜に色をつける
          </Text>
          <Text style={{ color: tokens.color.ink, opacity: 0.6, fontFamily: tokens.font.family, fontSize: 12 }}>
            日付の文字色を変えます
          </Text>
        </View>
        <Switch
          value={settings.showWeekendColor}
          onValueChange={(value) => updateSettings({ showWeekendColor: value })}
          trackColor={{ true: tokens.color.terracotta }}
        />
      </View>
      {settings.showWeekendColor && (
        <SegmentedControl
          options={WEEKEND_COLOR_MODE_OPTIONS}
          value={settings.weekendColorMode}
          onChange={(value) => updateSettings({ weekendColorMode: value })}
        />
      )}

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: tokens.color.ink, fontFamily: tokens.font.family, fontSize: 15 }}>祝日を表示</Text>
          <Text style={{ color: tokens.color.ink, opacity: 0.6, fontFamily: tokens.font.family, fontSize: 12 }}>
            日付の文字色を変え、祝日名を表示します
          </Text>
        </View>
        <Switch
          value={settings.showHolidays}
          onValueChange={(value) => updateSettings({ showHolidays: value })}
          trackColor={{ true: tokens.color.terracotta }}
        />
      </View>

      <Text style={[styles.sectionLabel, { color: tokens.color.ink, fontFamily: tokens.font.family }]}>
        プレビュー
      </Text>
      <PreviewStrip
        weekStartsOn={settings.weekStartsOn}
        showWeekendColor={settings.showWeekendColor}
        weekendColorMode={settings.weekendColorMode}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  sectionLabel: { fontSize: 12, opacity: 0.5, marginTop: 20, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  previewCell: { flex: 1, alignItems: 'center', paddingVertical: 4 },
});
