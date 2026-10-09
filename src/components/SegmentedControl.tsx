import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTokens } from '../theme/tokens';

interface SegmentedControlOption<T> {
  label: string;
  value: T;
}

interface SegmentedControlProps<T extends string | number> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string | number>({ options, value, onChange }: SegmentedControlProps<T>) {
  const tokens = useTokens();
  return (
    <View style={[styles.row, { borderColor: `${tokens.color.ink}33` }]}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            onPress={() => onChange(option.value)}
            style={[styles.segment, active && { backgroundColor: tokens.color.ink }]}
          >
            <Text
              style={{
                color: active ? tokens.color.paper : tokens.color.ink,
                fontFamily: tokens.font.family,
                fontSize: 14,
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', borderWidth: 1, borderRadius: 10, overflow: 'hidden' },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 8 },
});
