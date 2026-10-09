import { Pressable, Text, View } from 'react-native';

import { useTokens } from '../theme/tokens';

interface HeaderTextButtonProps {
  label: string;
  onPress: () => void;
  bold?: boolean;
  disabled?: boolean;
  variant?: 'plain' | 'pill';
  color?: string;
}

export function HeaderTextButton({ label, onPress, bold, disabled, variant = 'plain', color }: HeaderTextButtonProps) {
  const tokens = useTokens();
  const isPill = variant === 'pill';
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      hitSlop={12}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: isPill ? 6 : 0,
        paddingHorizontal: isPill ? 12 : 8,
        paddingVertical: isPill ? 5 : 4,
        borderRadius: isPill ? 14 : 0,
        backgroundColor: isPill ? `${tokens.color.terracotta}1F` : undefined,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {/* Echoes the cycle ribbon symbol used on the calendar grid, so the
          record button reads as "the thing that draws that line" rather
          than a generic action button. */}
      {isPill && (
        <View style={{ width: 10, height: 2, borderRadius: 1, backgroundColor: tokens.color.terracotta }} />
      )}
      <Text
        style={{
          color: color ?? tokens.color.terracotta,
          fontFamily: tokens.font.family,
          fontSize: isPill ? 15 : 16,
          fontWeight: bold || isPill ? '600' : '400',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
