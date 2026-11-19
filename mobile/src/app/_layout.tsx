import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useNotificationRouting } from '@/lib/notifications';
import { AuthProvider, useAuth } from '@/providers/auth';
import { fonts, ThemeProvider, useTheme } from '@/theme';

export default function RootLayout() {
  // Same type as the web app: Archivo condensed for headlines, Inter for UI.
  const [fontsLoaded, fontError] = useFonts({
    [fonts.display]: require('../../assets/fonts/ArchivoCondensed-Black.ttf'),
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });
  // On a font error, carry on with system fonts rather than a blank screen.
  if (!fontsLoaded && !fontError) return null;

  return (
    <ThemeProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}

function RootNavigator() {
  const { session, loading } = useAuth();
  const { colors, scheme } = useTheme();
  useNotificationRouting();
  if (loading) return null;

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontFamily: fonts.bold },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Protected guard={!!session}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="job/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="showcase/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="effect/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="consent" options={{ presentation: 'modal', title: 'AI & your data' }} />
          <Stack.Screen name="paywall" options={{ presentation: 'modal', title: 'Get credits' }} />
        </Stack.Protected>
        <Stack.Protected guard={!session}>
          <Stack.Screen name="sign-in" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}
