import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';

import { AppBannerAd } from '../../components/AppBannerAd';
import { SettingsRow } from '../../components/SettingsRow';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useTokens } from '../../theme/tokens';
import type { SettingsStackParamList } from '../../types/navigation';

export default function SettingsScreen() {
  const tokens = useTokens();
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const settings = useSettingsStore((state) => state.settings);

  return (
    <View style={[styles.container, { backgroundColor: tokens.color.paper }]}>
      <Text style={[styles.sectionLabel, { color: tokens.color.ink, fontFamily: tokens.font.family }]}>記録</Text>
      <SettingsRow
        label="周期の設定"
        value={`${settings.cycleLengthDays}日 / ${settings.periodLengthDays}日間`}
        onPress={() => navigation.navigate('CycleSettings')}
      />

      <Text style={[styles.sectionLabel, { color: tokens.color.ink, fontFamily: tokens.font.family }]}>表示</Text>
      <SettingsRow label="カレンダー設定" onPress={() => navigation.navigate('CalendarSettings')} />

      <Text style={[styles.sectionLabel, { color: tokens.color.ink, fontFamily: tokens.font.family }]}>
        その他
      </Text>
      <SettingsRow label="アプリ情報" onPress={() => navigation.navigate('About')} />

      <View style={styles.bannerSlot}>
        <AppBannerAd />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  sectionLabel: { fontSize: 12, opacity: 0.5, marginTop: 20, marginBottom: 4 },
  bannerSlot: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', marginHorizontal: -16 },
});
