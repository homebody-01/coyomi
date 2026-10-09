import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Image } from 'react-native';

import { CalendarStack } from './CalendarStack';
import { SettingsStack } from './SettingsStack';
import { useTokens } from '../theme/tokens';
import type { RootTabParamList } from '../types/navigation';

const Tab = createBottomTabNavigator<RootTabParamList>();

export function RootTabs() {
  const tokens = useTokens();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tokens.color.ink,
        tabBarInactiveTintColor: `${tokens.color.ink}4D`,
        tabBarStyle: {
          backgroundColor: tokens.color.paper,
          borderTopColor: `${tokens.color.ink}1A`,
        },
      }}
    >
      <Tab.Screen
        name="Calendar"
        component={CalendarStack}
        options={{
          title: 'カレンダー',
          tabBarIcon: ({ size, focused }) => (
            <Image
              source={require('../../assets/calendar.png')}
              resizeMode="contain"
              style={{
                width: size * 0.9,
                height: size * 0.9,
                tintColor: focused ? tokens.color.ink : `${tokens.color.ink}4D`,
              }}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsStack}
        options={{
          title: '設定',
          tabBarIcon: ({ size, focused }) => (
            <Image
              source={require('../../assets/settings.png')}
              resizeMode="contain"
              style={{
                width: size * 1.2,
                height: size * 1.2,
                tintColor: focused ? tokens.color.ink : `${tokens.color.ink}4D`,
              }}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
