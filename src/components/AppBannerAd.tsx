import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

// AdMob rejects accounts that serve real ad units to a development build's
// invalid traffic, so dev builds always request Google's test creative
// instead of the production unit.
const PRODUCTION_BANNER_UNIT_ID = 'ca-app-pub-5700201963761626/2271691068';
const BANNER_UNIT_ID = __DEV__ ? TestIds.BANNER : PRODUCTION_BANNER_UNIT_ID;

export function AppBannerAd() {
  return (
    <BannerAd
      unitId={BANNER_UNIT_ID}
      size={BannerAdSize.LARGE_ANCHORED_ADAPTIVE_BANNER}
      requestOptions={{ requestNonPersonalizedAdsOnly: true }}
    />
  );
}
