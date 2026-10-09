import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTokens } from '../theme/tokens';

interface PickerOption<T> {
  label: string;
  value: T;
}

interface PickerRowProps<T> {
  label: string;
  value: T;
  options: PickerOption<T>[];
  onChange: (value: T) => void;
}

export function PickerRow<T extends string | number | null>({
  label,
  value,
  options,
  onChange,
}: PickerRowProps<T>) {
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
        <View style={styles.options}>
          {options.map((option) => (
            <Pressable
              key={String(option.value)}
              style={styles.optionRow}
              onPress={() => {
                onChange(option.value);
                setExpanded(false);
              }}
            >
              <Text
                style={{
                  color: option.value === value ? tokens.color.terracotta : tokens.color.ink,
                  fontFamily: tokens.font.family,
                  fontSize: 15,
                }}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
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
  options: { paddingBottom: 4 },
  optionRow: { paddingVertical: 8, paddingLeft: 16 },
});
