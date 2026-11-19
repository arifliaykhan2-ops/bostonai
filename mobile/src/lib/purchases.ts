import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';
import { isExpoGo } from './env';

let configured = false;

/**
 * RevenueCat uses the Supabase user id as its app user id, so the
 * revenuecat-webhook function knows whose balance to credit.
 */
export function configurePurchases(userId: string) {
  const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
  if (Platform.OS !== 'ios' || !apiKey || isExpoGo) return;

  if (!configured) {
    Purchases.configure({ apiKey, appUserID: userId });
    configured = true;
  } else {
    void Purchases.logIn(userId);
  }
}

export async function resetPurchases() {
  if (configured) await Purchases.logOut().catch(() => undefined);
}

export const purchasesAvailable = () => configured;
