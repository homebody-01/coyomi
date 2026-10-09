import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTokens } from '../theme/tokens';

interface SettingsRowProps {
  label: string;
  value?: string;
  onPress?: () => void;
}

export function SettingsRow({ label, value, onPress }: SettingsRowProps) {
  const tokens = useTokens();
  return (
    <Pressable style={styles.row} onPress={onPress} disabled={!onPress}>
      <Text style={{ color: tokens.color.ink, fontFamily: tokens.font.family, fontSize: 15 }}>{label}</Text>
      <View style={styles.right}>
        {value !== undefined && (
          <Text style={{ color: tokens.color.ink, opacity: 0.6, fontFamily: tokens.font.family, fontSize: 15 }}>
            {value}
          </Text>
        )}
        {onPress && <Text style={{ color: tokens.color.ink, opacity: 0.4, fontSize: 15 }}> ›</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  right: { flexDirection: 'row', alignItems: 'center' },
});
