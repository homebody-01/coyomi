import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AboutScreen from '../app/settings/AboutScreen';
import CalendarSettingsScreen from '../app/settings/CalendarSettingsScreen';
import CycleSettingsScreen from '../app/settings/CycleSettingsScreen';
import LicenseDetailScreen from '../app/settings/LicenseDetailScreen';
import LicensesScreen from '../app/settings/LicensesScreen';
import SettingsScreen from '../app/settings/SettingsScreen';
import { useTokens } from '../theme/tokens';
import type { SettingsStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export function SettingsStack() {
  const tokens = useTokens();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: tokens.color.paper },
        headerTintColor: tokens.color.ink,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: '設定' }} />
      <Stack.Screen name="CycleSettings" component={CycleSettingsScreen} options={{ title: '周期の設定' }} />
      <Stack.Screen name="CalendarSettings" component={CalendarSettingsScreen} options={{ title: 'カレンダー設定' }} />
      <Stack.Screen name="About" component={AboutScreen} options={{ title: 'アプリ情報' }} />
      <Stack.Screen name="Licenses" component={LicensesScreen} options={{ title: 'ライセンス' }} />
      <Stack.Screen name="LicenseDetail" component={LicenseDetailScreen} />
    </Stack.Navigator>
  );
}
