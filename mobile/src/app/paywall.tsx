import { router } from 'expo-router';
import { Text, View } from 'react-native';
import RevenueCatUI from 'react-native-purchases-ui';
import { Button } from '@/components/ui';
import { purchasesAvailable } from '@/lib/purchases';
import { makeStyles, space } from '@/theme';

/**
 * The paywall layout and products are configured in the RevenueCat dashboard.
 * Credits are granted server-side by the revenuecat-webhook function, and the
 * balance updates live through Realtime.
 */
export default function PaywallScreen() {
  const s = useStyles();

  if (!purchasesAvailable()) {
    return (
      <View style={s.fallback}>
        <Text style={s.title}>Purchases unavailable</Text>
        <Text style={s.body}>
          In-app purchases don't run in Expo Go. They need an iOS development build with
          EXPO_PUBLIC_REVENUECAT_IOS_KEY set.
        </Text>
        <Button title="Close" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <RevenueCatUI.Paywall
      onDismiss={() => router.back()}
      onPurchaseCompleted={() => router.back()}
      onRestoreCompleted={() => router.back()}
    />
  );
}

const useStyles = makeStyles((c) => ({
  fallback: { flex: 1, backgroundColor: c.bg, padding: space.lg, gap: space.md, justifyContent: 'center' },
  title: { color: c.text, fontSize: 22, fontWeight: '800' },
  body: { color: c.textMuted, fontSize: 15, lineHeight: 22 },
}));
