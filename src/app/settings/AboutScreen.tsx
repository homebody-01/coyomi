import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Constants from 'expo-constants';
import { Image, StyleSheet, Text, View } from 'react-native';

import { SettingsRow } from '../../components/SettingsRow';
import { useTokens } from '../../theme/tokens';
import type { SettingsStackParamList } from '../../types/navigation';

export default function AboutScreen() {
  const tokens = useTokens();
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <View style={[styles.container, { backgroundColor: tokens.color.paper }]}>
      <View style={styles.header}>
        <View style={[styles.iconShadow, { borderRadius: tokens.radius.card / 2, backgroundColor: tokens.color.paper }]}>
          <Image
            source={require('../../../assets/icon.png')}
            style={[
              styles.icon,
              { borderRadius: tokens.radius.card / 2, borderColor: `${tokens.color.ink}33` },
            ]}
          />
        </View>
        <Text style={{ color: tokens.color.ink, fontFamily: tokens.font.family, fontSize: 17, fontWeight: '700', marginTop: 12 }}>
          coyomi.
        </Text>
        <Text
          style={{
            color: tokens.color.ink,
            opacity: 0.6,
            fontFamily: tokens.font.family,
            fontSize: 13,
            marginTop: 2,
          }}
        >
          バージョン {version}
        </Text>
      </View>

      <Text style={[styles.disclosure, { color: tokens.color.ink, fontFamily: tokens.font.family }]}>
        記録は、端末内にのみ保存され、外部に送信されません。ロック画面やウィジェットにも表示しません。
      </Text>

      <SettingsRow label="ライセンス" onPress={() => navigation.navigate('Licenses')} />

      <Text style={[styles.copyright, { color: tokens.color.ink, fontFamily: tokens.font.family }]}>
        © {new Date().getFullYear()} coyomi.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  header: { alignItems: 'center', marginBottom: 8 },
  // Shadow lives on this wrapper, not the Image itself — a shadow combined
  // with borderRadius on the same view tends to get clipped away instead of
  // rendering, since the rounded corners force the layer to clip its own
  // bounds (which the shadow needs to extend past).
  iconShadow: {
    width: 56,
    height: 56,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  icon: {
    width: 56,
    height: 56,
    borderWidth: 1,
  },
  disclosure: { fontSize: 15, opacity: 0.8, marginTop: 24, lineHeight: 22 },
  copyright: { fontSize: 12, opacity: 0.4, marginTop: 16, marginBottom: 24 },
});
