import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { isExpoGo } from './env';
import { supabase } from './supabase';
import { locale } from '@/i18n';

/** Opens the result screen when the user taps a "your video is ready" push. */
export function useNotificationRouting() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = response.notification.request.content.data?.url;
      if (typeof url === 'string' && url.startsWith('/job/')) {
        router.push({ pathname: '/job/[id]', params: { id: url.slice('/job/'.length) } });
      }
    });
    return () => sub.remove();
  }, []);
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/**
 * Stores this device's Expo push token on the profile so fal-webhook can
 * notify the user when a generation finishes. Needs a real device and an
 * EAS project id (run `npx eas-cli@latest init` once).
 */
export async function registerPushToken(userId: string) {
  if (Platform.OS === 'web' || !Device.isDevice || isExpoGo) return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  if (!projectId) return;

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  // The locale lets fal-webhook send the "ready" push in the app's language.
  await supabase.from('profiles').update({ push_token: token, locale }).eq('id', userId);
}
