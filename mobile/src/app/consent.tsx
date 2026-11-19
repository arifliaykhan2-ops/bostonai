import { router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { Button } from '@/components/ui';
import { setAiConsent } from '@/lib/consent';
import { makeStyles, space } from '@/theme';

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
      <Text style={s.title}>How your data is used</Text>

      <Section heading="What we send">Your text prompts and any photos you choose to animate.</Section>
      <Section heading="Who receives it">
        fal.ai (our AI hosting provider) and the maker of the model you pick, such as Black Forest Labs (Flux),
        Google (Nano Banana, Gemini), OpenAI (GPT Image), ByteDance (Seedance, Seedream), Kuaishou (Kling),
        MiniMax, Alibaba (Wan), xAI (Grok), ShengShu (Vidu) and PixVerse. Trend templates send your photo to the
        provider that runs that template.
      </Section>
      <Section heading="Why">
        Only to generate the image or video you asked for. We don't sell your data or use it for advertising.
      </Section>
      <Section heading="Your choice">
        You can withdraw consent at any time in Profile. Without it, generation is turned off.
      </Section>

      <View style={s.actions}>
        <Button title="I agree" onPress={agree} />
        <Button title="Not now" variant="secondary" onPress={() => router.back()} />
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
}));
