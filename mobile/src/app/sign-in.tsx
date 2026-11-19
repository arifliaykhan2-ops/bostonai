import * as AppleAuthentication from 'expo-apple-authentication';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Text, TextInput, View } from 'react-native';
import { Button } from '@/components/ui';
import { isExpoGo } from '@/lib/env';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { makeStyles, radius, space, useTheme } from '@/theme';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const styles = useStyles();
  const { colors, scheme } = useTheme();
  const [linkSent, setLinkSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function signInWithApple() {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) throw new Error('No identity token from Apple');
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });
      if (error) throw error;
    } catch (e) {
      if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return;
      Alert.alert('Sign in failed', e instanceof Error ? e.message : String(e));
    }
  }

  async function sendLink() {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      // The link returns to the app: boson:// (build), exp://… (Expo Go), localhost (web).
      options: { emailRedirectTo: Linking.createURL('/') },
    });
    setBusy(false);
    if (error) Alert.alert('Could not send email', error.message);
    else setLinkSent(true);
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.hero}>
        <Text style={styles.logo}>Boson AI</Text>
        <Text style={styles.subtitle}>Turn ideas and photos into cinematic video.</Text>
      </View>

      {!isSupabaseConfigured && (
        <Text style={styles.warning}>
          Supabase is not configured. Copy .env.example to .env and fill in your project keys.
        </Text>
      )}

      <View style={styles.form}>
        {Platform.OS === 'ios' && !isExpoGo && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={
              scheme === 'dark'
                ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
            }
            cornerRadius={radius.md}
            style={{ height: 52 }}
            onPress={signInWithApple}
          />
        )}

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          editable={!linkSent}
          style={styles.input}
        />
        {linkSent ? (
          <>
            <Text style={styles.hint}>
              We sent a sign-in link to {email.trim()}. Open the email on this phone and tap the link — the app
              will sign you in automatically.
            </Text>
            <Button title="Resend link" variant="secondary" loading={busy} onPress={sendLink} />
            <Button title="Use a different email" variant="secondary" onPress={() => setLinkSent(false)} />
          </>
        ) : (
          <Button
            title="Continue with email"
            variant={Platform.OS === 'ios' && !isExpoGo ? 'secondary' : 'primary'}
            loading={busy}
            disabled={!isSupabaseConfigured || !email.includes('@')}
            onPress={sendLink}
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.bg, padding: space.lg, justifyContent: 'center', gap: space.xl },
  hero: { gap: space.sm },
  logo: { color: c.accentInk, fontSize: 44, fontWeight: '900', letterSpacing: -1 },
  subtitle: { color: c.textMuted, fontSize: 17 },
  warning: { color: c.danger, fontSize: 14 },
  hint: { color: c.textMuted, fontSize: 14, lineHeight: 20 },
  form: { gap: space.md },
  input: {
    backgroundColor: c.surface,
    borderColor: c.border,
    borderWidth: 1,
    borderRadius: radius.md,
    color: c.text,
    fontSize: 16,
    paddingHorizontal: space.md,
    minHeight: 52,
  },
}));
