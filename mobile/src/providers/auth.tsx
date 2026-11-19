import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { Platform } from 'react-native';
import { registerPushToken } from '@/lib/notifications';
import { configurePurchases, resetPurchases } from '@/lib/purchases';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

type AuthState = { session: Session | null; loading: boolean };

/**
 * Temporary: skip the sign-in screen and start every new install as a Supabase
 * anonymous (guest) user. Turn off once email/Apple sign-in is wired up; guests
 * can then link an email with supabase.auth.updateUser({ email }).
 */
const GUEST_MODE = true;

async function exchangeAuthCode(url: string) {
  const code = Linking.parse(url).queryParams?.code;
  if (typeof code !== 'string') return;
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) console.warn('Email link sign-in failed:', error.message);
}

const AuthContext = createContext<AuthState>({ session: null, loading: true });

export function AuthProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AuthState>({ session: null, loading: isSupabaseConfigured });

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session && GUEST_MODE) {
        // onAuthStateChange delivers the new guest session.
        const { error } = await supabase.auth.signInAnonymously();
        if (!error) return;
        console.warn('Guest sign-in failed:', error.message);
      }
      setState({ session: data.session, loading: false });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ session, loading: false });
    });

    // Magic-link / confirm-signup emails open boson://…?code=… on the device.
    const linkSub =
      Platform.OS === 'web' ? null : Linking.addEventListener('url', ({ url }) => void exchangeAuthCode(url));
    if (Platform.OS !== 'web') void Linking.getInitialURL().then((url) => {
      if (url) void exchangeAuthCode(url);
    });

    return () => {
      sub.subscription.unsubscribe();
      linkSub?.remove();
    };
  }, []);

  const userId = state.session?.user.id;
  useEffect(() => {
    if (userId) {
      configurePurchases(userId);
      void registerPushToken(userId).catch(() => undefined);
    } else {
      void resetPurchases();
    }
  }, [userId]);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
