import { useLayoutEffect } from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { ScrollView, StyleSheet, Text } from 'react-native';

import licenses from '../../data/licenses.json';
import { useTokens } from '../../theme/tokens';
import type { SettingsStackParamList } from '../../types/navigation';

export default function LicenseDetailScreen() {
  const tokens = useTokens();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<SettingsStackParamList, 'LicenseDetail'>>();
  const item = licenses.find((license) => license.name === route.params.packageName);

  useLayoutEffect(() => {
    navigation.setOptions({ title: route.params.packageName });
  }, [navigation, route.params.packageName]);

  if (!item) return null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: tokens.color.paper }} contentContainerStyle={styles.content}>
      <Text style={{ color: tokens.color.ink, fontFamily: tokens.font.family, fontSize: 17, fontWeight: '700' }}>
        {item.name}
      </Text>
      <Text
        style={{
          color: tokens.color.ink,
          opacity: 0.6,
          fontFamily: tokens.font.family,
          fontSize: 13,
          marginTop: 4,
          marginBottom: 20,
        }}
      >
        v{item.version} ・ {item.license}
      </Text>
      <Text style={{ color: tokens.color.ink, fontFamily: tokens.font.family, fontSize: 13, lineHeight: 20 }}>
        {item.licenseText}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 48 },
});
