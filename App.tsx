import { DefaultTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import mobileAds from 'react-native-google-mobile-ads';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { initDatabase } from './src/db';
import { RootTabs } from './src/navigation/RootTabs';
import { useCategoryStore } from './src/store/useCategoryStore';
import { useCycleRecordStore } from './src/store/useCycleRecordStore';
import { useDailyNoteStore } from './src/store/useDailyNoteStore';
import { useEventStore } from './src/store/useEventStore';
import { useSettingsStore } from './src/store/useSettingsStore';
import { light } from './src/theme/tokens';

// React Navigation v7 themes require both `colors` and `fonts`. We only
// override `colors` — DefaultTheme.fonts already resolves to
// { fontFamily: 'System', ... } on iOS, matching the design doc's
// font.family token, so no override is needed there.
const navigationTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: light.color.paper,
    card: light.color.paper,
    text: light.color.ink,
    primary: light.color.terracotta,
    border: `${light.color.ink}1A`,
    notification: light.color.terracotta,
  },
};

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    (async () => {
      await initDatabase();
      await Promise.all([
        useCategoryStore.getState().loadCategories(),
        useEventStore.getState().loadEvents(),
        useCycleRecordStore.getState().loadCycleRecords(),
        useDailyNoteStore.getState().loadNotes(),
        useSettingsStore.getState().loadSettings(),
      ]);
      setIsReady(true);
    })();
    // Independent of app data loading — never gate the UI on ad SDK startup.
    mobileAds().initialize();
  }, []);

  if (!isReady) {
    return <View style={{ flex: 1, backgroundColor: light.color.paper }} />;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navigationTheme}>
        <RootTabs />
      </NavigationContainer>
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
