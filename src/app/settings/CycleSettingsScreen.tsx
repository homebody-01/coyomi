import { StyleSheet, Switch, Text, View } from 'react-native';

import { useSettingsStore } from '../../store/useSettingsStore';
import { useTokens } from '../../theme/tokens';
import { WheelPickerRow } from '../../components/WheelPickerRow';

// 20〜60日(初期値28日)/ 1〜10日間(初期値5日間) — defaults match useSettingsStore's own.
const CYCLE_LENGTH_OPTIONS = Array.from({ length: 41 }, (_, i) => ({ label: `${20 + i}日`, value: 20 + i }));
const PERIOD_LENGTH_OPTIONS = Array.from({ length: 10 }, (_, i) => ({ label: `${1 + i}日間`, value: 1 + i }));

export default function CycleSettingsScreen() {
  const tokens = useTokens();
  const settings = useSettingsStore((state) => state.settings);
  const updateSettings = useSettingsStore((state) => state.updateSettings);

  return (
    <View style={[styles.container, { backgroundColor: tokens.color.paper }]}>
      <Text style={[styles.sectionLabel, { color: tokens.color.ink, fontFamily: tokens.font.family }]}>平均</Text>
      <WheelPickerRow
        label="周期の長さ"
        value={settings.cycleLengthDays}
        options={CYCLE_LENGTH_OPTIONS}
        onChange={(value) => updateSettings({ cycleLengthDays: value })}
      />
      <WheelPickerRow
        label="1回の日数"
        value={settings.periodLengthDays}
        options={PERIOD_LENGTH_OPTIONS}
        onChange={(value) => updateSettings({ periodLengthDays: value })}
      />

      <Text style={[styles.sectionLabel, { color: tokens.color.ink, fontFamily: tokens.font.family }]}>予測</Text>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: tokens.color.ink, fontFamily: tokens.font.family, fontSize: 15 }}>予測を表示</Text>
          <Text style={{ color: tokens.color.ink, opacity: 0.6, fontFamily: tokens.font.family, fontSize: 12 }}>
            カレンダーに破線で表示します
          </Text>
        </View>
        <Switch
          value={settings.showForecast}
          onValueChange={(value) => updateSettings({ showForecast: value })}
          trackColor={{ true: tokens.color.terracotta }}
        />
      </View>

      <Text style={[styles.footer, { color: tokens.color.ink, fontFamily: tokens.font.family }]}>
        予測は直近3回の記録から計算します。記録が少ない項目は、補足としてここで設定した値を使うことがあります。
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  sectionLabel: { fontSize: 12, opacity: 0.5, marginTop: 20, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  footer: { fontSize: 12, opacity: 0.5, marginTop: 16 },
});
