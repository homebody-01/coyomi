import { BottomSheet } from '@expo/ui/community/bottom-sheet';
import { Picker } from '@expo/ui/community/picker';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTokens } from '../theme/tokens';

interface MonthYearPickerSheetProps {
  visible: boolean;
  year: number;
  month: number; // 0-11
  minYear: number;
  maxYear: number;
  onClose: () => void;
  onConfirm: (year: number, month: number) => void;
}

export function MonthYearPickerSheet({
  visible,
  year,
  month,
  minYear,
  maxYear,
  onClose,
  onConfirm,
}: MonthYearPickerSheetProps) {
  const tokens = useTokens();
  const [pendingYear, setPendingYear] = useState(year);
  const [pendingMonth, setPendingMonth] = useState(month);

  // Re-seed the wheels from the currently-displayed month every time the
  // sheet opens, rather than carrying over whatever was left mid-scroll from
  // the last time it was open. Adjusting state during render (React's
  // recommended pattern for "reset on prop change") instead of an effect
  // avoids an extra cascading render.
  const [prevVisible, setPrevVisible] = useState(visible);
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setPendingYear(year);
      setPendingMonth(month);
    }
  }

  const yearOptions: number[] = [];
  for (let y = minYear; y <= maxYear; y += 1) yearOptions.push(y);

  return (
    <BottomSheet
      index={visible ? 0 : -1}
      onClose={onClose}
      enableDynamicSizing
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: tokens.color.paper }}
    >
      <View style={styles.content}>
        <Text
          style={{
            color: tokens.color.ink,
            fontFamily: tokens.font.family,
            fontSize: 17,
            fontWeight: '700',
            textAlign: 'center',
            marginBottom: 12,
          }}
        >
          年月を選択
        </Text>
        <View style={styles.wheelRow}>
          {/* Values are strings, not numbers — SwiftUI's wheel only resolves
              an initial highlighted row when the selection binding's type
              matches the tag() type exactly (see WheelPickerRow). */}
          <Picker selectedValue={String(pendingYear)} onValueChange={(v) => setPendingYear(Number(v))} style={styles.wheel}>
            {yearOptions.map((y) => (
              <Picker.Item key={y} label={`${y}年`} value={String(y)} />
            ))}
          </Picker>
          <Picker selectedValue={String(pendingMonth)} onValueChange={(v) => setPendingMonth(Number(v))} style={styles.wheel}>
            {Array.from({ length: 12 }, (_, i) => i).map((m) => (
              <Picker.Item key={m} label={`${m + 1}月`} value={String(m)} />
            ))}
          </Picker>
        </View>
        <Pressable
          onPress={() => onConfirm(pendingYear, pendingMonth)}
          style={[styles.confirmButton, { backgroundColor: tokens.color.ink, borderRadius: tokens.radius.card }]}
        >
          <Text style={{ color: tokens.color.paper, fontFamily: tokens.font.family, fontSize: 15 }}>移動</Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 24 },
  wheelRow: { flexDirection: 'row' },
  wheel: { flex: 1, height: 180 },
  confirmButton: { paddingVertical: 14, alignItems: 'center', marginTop: 8 },
});
