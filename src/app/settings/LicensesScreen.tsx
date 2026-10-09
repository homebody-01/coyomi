import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { SettingsRow } from '../../components/SettingsRow';
import licenses from '../../data/licenses.json';
import { useTokens } from '../../theme/tokens';
import type { SettingsStackParamList } from '../../types/navigation';

export default function LicensesScreen() {
  const tokens = useTokens();
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: tokens.color.paper }} contentContainerStyle={styles.content}>
      <Text style={{ color: tokens.color.ink, opacity: 0.6, fontFamily: tokens.font.family, fontSize: 12, marginBottom: 8 }}>
        本アプリは、以下のオープンソースソフトウェアを使用しています。
      </Text>
      <View>
        {licenses.map((item) => (
          <SettingsRow
            key={item.name}
            label={item.name}
            value={item.license}
            onPress={() => navigation.navigate('LicenseDetail', { packageName: item.name })}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 48 },
});
