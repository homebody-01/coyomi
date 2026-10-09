export type CalendarStackParamList = {
  Month: undefined;
  EventForm:
    | { mode: 'create'; prefillDate?: string } // 'yyyy-MM-dd'
    // occurrenceDate ('yyyy-MM-dd'): which calendar day was tapped to reach
    // this edit — lets deleting a recurring event offer "this occurrence
    // only" vs. "the whole series". Omitted when there's no specific day to
    // anchor to (e.g. a future non-DayDetailSheet entry point).
    | { mode: 'edit'; eventId: string; occurrenceDate?: string };
  Record: undefined;
  DailyNote: { date: string }; // 'yyyy-MM-dd'
};

export type SettingsStackParamList = {
  Settings: undefined;
  CycleSettings: undefined;
  CalendarSettings: undefined;
  About: undefined;
  Licenses: undefined;
  LicenseDetail: { packageName: string };
};

export type RootTabParamList = {
  Calendar: undefined;
  Settings: undefined;
};
