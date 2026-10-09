import { Picker } from '@expo/ui/community/picker';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTokens } from '../theme/tokens';

interface WheelPickerOption {
  label: string;
  value: number;
}

interface WheelPickerRowProps {
  label: string;
  value: number;
  options: WheelPickerOption[];
  onChange: (value: number) => void;
}

export function WheelPickerRow({ label, value, options, onChange }: WheelPickerRowProps) {
  const tokens = useTokens();
  const [expanded, setExpanded] = useState(false);
  const currentLabel = options.find((o) => o.value === value)?.label ?? '';

  return (
    <View>
      <Pressable style={styles.row} onPress={() => setExpanded((e) => !e)}>
        <Text style={{ color: tokens.color.ink, fontFamily: tokens.font.family, fontSize: 15 }}>{label}</Text>
        <Text style={{ color: tokens.color.ink, fontFamily: tokens.font.family, fontSize: 15, opacity: 0.6 }}>
          {currentLabel} ›
        </Text>
      </Pressable>
      {expanded && (
        // Values are passed through as strings, not numbers: the native
        // wheel tags each row with String(value), and SwiftUI's Picker only
        // resolves an initial highlighted row when the `selection` binding's
        // type matches the tags' type exactly — a numeric selectedValue
        // against string tags silently fails to match anything, so the
        // wheel always opened on the first row regardless of the stored
        // setting.
        <Picker
          selectedValue={String(value)}
          onValueChange={(v) => onChange(Number(v))}
          style={styles.wheel}
        >
          {options.map((option) => (
            <Picker.Item key={option.value} label={option.label} value={String(option.value)} />
          ))}
        </Picker>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  wheel: { height: 180 },
});
