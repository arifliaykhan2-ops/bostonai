import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Purchases from 'react-native-purchases';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenBackground } from '@/components/ScreenBackground';
import { Button, PageHeader } from '@/components/ui';
import { useCredits } from '@/hooks/useCredits';
import { deleteAccount } from '@/lib/api';
import { isRTL, t } from '@/i18n';
import { hasAiConsent, setAiConsent } from '@/lib/consent';
import { openLegal, PRIVACY_URL, SUPPORT_EMAIL, TERMS_URL } from '@/lib/legal';
import { purchasesAvailable } from '@/lib/purchases';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth';
import { fonts, makeStyles, space } from '@/theme';

export default function ProfileScreen() {
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const credits = useCredits();
  const isGuest = !!session?.user.is_anonymous;
  const [consent, setConsent] = useState(hasAiConsent());
  const [deleting, setDeleting] = useState(false);

  async function restore() {
    if (!purchasesAvailable()) return;
    try {
      await Purchases.restorePurchases();
      Alert.alert(t('profile.restored'), t('profile.restoredBody'));
    } catch (e) {
      Alert.alert(t('profile.restoreFailed'), e instanceof Error ? e.message : String(e));
    }
  }

  function revokeConsent() {
    setAiConsent(false);
    setConsent(false);
  }

  function confirmDelete() {
    const run = async () => {
      setDeleting(true);
      try {
        await deleteAccount();
      } catch (e) {
        Alert.alert(t('profile.couldNotDelete'), e instanceof Error ? e.message : String(e));
      } finally {
        setDeleting(false);
      }
    };
    if (Platform.OS === 'web') {
      void run();
      return;
    }
    Alert.alert(
      t('profile.deleteTitle'),
      t('profile.deleteBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: () => void run() },
      ],
    );
  }

  return (
    <View style={s.container}>
      <ScreenBackground />

      <ScrollView
        style={s.scrollView}
        contentContainerStyle={[
          s.content,
          {
            paddingTop: Math.max(insets.top, 24) + 12,
            paddingBottom: Math.max(insets.bottom, 24) + 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <PageHeader
          title={t('profile.title')}
          subtitle={isGuest ? t('profile.guest') : (session?.user.email ?? t('profile.signedInApple'))}
        />

        <View style={s.creditsCard}>
          <View>
            <Text style={s.creditsValue}>{credits ?? '–'}</Text>
            <Text style={s.creditsLabel}>{t('profile.creditsLabel')}</Text>
          </View>
          <Button title={`⚡ ${t('profile.getMore')}`} onPress={() => router.push('/paywall')} style={s.getMore} />
        </View>

        <View style={s.group}>
          <Row label={t('profile.restore')} onPress={restore} />
          <Row
            label={t('profile.consent')}
            value={consent ? t('common.on') : t('common.off')}
            onPress={consent ? revokeConsent : () => router.push('/consent')}
          />
          <Row label={t('profile.signOut')} onPress={() => void supabase.auth.signOut()} last />
        </View>

        <View style={s.group}>
          <Row label={t('legal.privacy')} onPress={() => openLegal(PRIVACY_URL)} />
          <Row label={t('legal.terms')} onPress={() => openLegal(TERMS_URL)} />
          <Row label={t('profile.support')} onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} last />
        </View>

        <Pressable onPress={confirmDelete} disabled={deleting} accessibilityRole="button" style={s.deleteRow}>
          <Text style={s.deleteText}>{deleting ? t('profile.deleting') : t('profile.deleteAccount')}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

/** One line of a settings group: label, optional value, chevron. */
function Row({ label, value, onPress, last }: { label: string; value?: string; onPress: () => void; last?: boolean }) {
  const s = useStyles();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [s.row, !last && s.rowDivider, pressed && s.rowPressed]}
    >
      <Text style={s.rowLabel}>{label}</Text>
      <View style={s.rowRight}>
        {value ? <Text style={s.rowValue}>{value}</Text> : null}
        <Text style={s.chevron}>{isRTL ? '‹' : '›'}</Text>
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  container: { flex: 1, backgroundColor: c.bg },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: space.md, gap: space.md },
  creditsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 14,
    paddingHorizontal: space.md,
    paddingVertical: 14,
  },
  creditsValue: { fontFamily: fonts.display, color: c.text, fontSize: 40, lineHeight: 40, letterSpacing: -0.4 },
  creditsLabel: { color: c.textMuted, fontSize: 13, fontWeight: '500' },
  getMore: { minHeight: 44, paddingHorizontal: 18 },
  group: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 14, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.md,
    paddingVertical: 15,
  },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  rowPressed: { backgroundColor: c.surfaceAlt },
  rowLabel: { color: c.text, fontSize: 16, fontWeight: '500' },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowValue: { color: c.textMuted, fontSize: 15 },
  chevron: { color: c.textSubtle, fontSize: 22, lineHeight: 22, marginTop: -2 },
  deleteRow: { alignSelf: 'center', paddingVertical: space.sm, marginTop: space.sm },
  deleteText: { color: c.danger, fontSize: 15, fontWeight: '600' },
}));
