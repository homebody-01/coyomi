import { createNativeStackNavigator } from '@react-navigation/native-stack';

import EventFormScreen from '../app/calendar/EventFormScreen';
import MonthScreen from '../app/calendar/MonthScreen';
import DailyNoteScreen from '../app/note/DailyNoteScreen';
import RecordScreen from '../app/record/RecordScreen';
import { useTokens } from '../theme/tokens';
import type { CalendarStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<CalendarStackParamList>();

export function CalendarStack() {
  const tokens = useTokens();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: tokens.color.paper },
        headerTintColor: tokens.color.ink,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="Month" component={MonthScreen} options={{ headerShown: false }} />
      <Stack.Screen name="EventForm" component={EventFormScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="Record" component={RecordScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="DailyNote" component={DailyNoteScreen} options={{ presentation: 'modal' }} />
      {/* DayDetailSheet is not a stack screen — it's an always-mounted
          overlay rendered from MonthScreen (@expo/ui's BottomSheet). */}
    </Stack.Navigator>
  );
}
