import { Tabs } from 'expo-router';
import { t } from '@/i18n';

/**
 * Web preview (UI work only): plain JS tabs. The phone app uses the native
 * Liquid Glass tab bar from _layout.native.tsx.
 */
export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Explore' }} />
      <Tabs.Screen name="apps" options={{ title: 'Apps' }} />
      <Tabs.Screen name="create" options={{ title: 'Create' }} />
      <Tabs.Screen name="gallery" options={{ title: t('tabs.mine') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
