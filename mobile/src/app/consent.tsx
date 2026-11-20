import { router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { Button } from '@/components/ui';
import { setAiConsent } from '@/lib/consent';
import { openLegal, PRIVACY_URL } from '@/lib/legal';
import { makeStyles, space } from '@/theme';
import { t } from '@/i18n';

/**
 * App Store guideline 5.1.2(i) consent screen. Shown before the first
 * generation; nothing is sent to an AI provider until the user agrees.
 */
export default function ConsentScreen() {
  const s = useStyles();

  function agree() {
    setAiConsent(true);
    router.back();
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <Text style={s.title}>{t('consent.title')}</Text>

      <Section heading={t('consent.whatHeading')}>{t('consent.what')}</Section>
      <Section heading={t('consent.whoHeading')}>{t('consent.who')}</Section>
      <Section heading={t('consent.whyHeading')}>{t('consent.why')}</Section>
      <Section heading={t('consent.choiceHeading')}>{t('consent.choice')}</Section>

      <Text style={s.link} onPress={() => openLegal(PRIVACY_URL)} accessibilityRole="link">
        {t('legal.readPrivacy')}
      </Text>

      <View style={s.actions}>
        <Button title={t('consent.agree')} onPress={agree} />
        <Button title={t('consent.notNow')} variant="secondary" onPress={() => router.back()} />
      </View>
    </ScrollView>
  );
}

function Section({ heading, children }: { heading: string; children: string }) {
  const s = useStyles();
  return (
    <View style={s.section}>
      <Text style={s.heading}>{heading}</Text>
      <Text style={s.body}>{children}</Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.bg },
  content: { padding: space.lg, gap: space.lg },
  title: { color: c.text, fontSize: 26, fontWeight: '800' },
  section: { gap: space.xs },
  heading: { color: c.text, fontSize: 16, fontWeight: '700' },
  body: { color: c.textMuted, fontSize: 15, lineHeight: 22 },
  actions: { gap: space.sm, marginTop: space.md },
  link: { color: c.accent, fontSize: 15, fontWeight: '600', textDecorationLine: 'underline' },
}));
