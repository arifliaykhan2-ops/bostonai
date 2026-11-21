import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenBackground } from '@/components/ScreenBackground';
import { PageHeader } from '@/components/ui';
import { fx, useApps, type Effect } from '@/lib/effects';
import { fonts, makeStyles, space } from '@/theme';
import { t } from '@/i18n';

/** Apps: one-photo tools (Relight, Headshot, Hair, Outfit Swap…), like Higgsfield's Apps. */
export default function AppsScreen() {
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const { apps, loading } = useApps();

  return (
    <View style={s.container}>
      <ScreenBackground />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          s.content,
          { paddingTop: Math.max(insets.top, 24) + 12, paddingBottom: Math.max(insets.bottom, 24) + 90 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <PageHeader title={t('apps.title')} subtitle={t('apps.subtitle')} />
        {loading ? (
          <ActivityIndicator style={{ marginTop: space.xl }} />
        ) : (
          <View style={s.grid}>
            {apps.map((app) => (
              <AppCard key={app.id} app={app} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function AppCard({ app }: { app: Effect }) {
  const s = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${fx.title(app)}. ${fx.subtitle(app) ?? ''}`}
      onPress={() => {
        if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({ pathname: '/effect/[id]', params: { id: app.id } });
      }}
      style={({ pressed }) => [s.card, pressed && s.pressed]}
    >
      <View style={s.thumbWrap}>
        {app.poster_url ? (
          <Image source={{ uri: app.poster_url }} style={s.thumb} contentFit="cover" transition={200} />
        ) : (
          // No example yet: a calm placeholder with the app's name instead of an empty box.
          <View style={s.placeholder}>
            <Text style={s.placeholderMark}>✦</Text>
            <Text numberOfLines={2} style={s.placeholderTitle}>
              {fx.title(app)}
            </Text>
          </View>
        )}
        {app.before_url ? (
          <View style={s.before}>
            <Image source={{ uri: app.before_url }} style={s.thumb} contentFit="cover" transition={200} />
          </View>
        ) : null}
      </View>
      <Text numberOfLines={1} style={s.title}>
        {fx.title(app)}
      </Text>
      {app.subtitle ? (
        <Text numberOfLines={1} style={s.subtitle}>
          {fx.subtitle(app)}
        </Text>
      ) : null}
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  container: { flex: 1, backgroundColor: c.bg },
  content: { paddingHorizontal: space.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  card: {
    width: '48.5%',
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 14,
    padding: 6,
    paddingBottom: 10,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  thumbWrap: { borderRadius: 10, overflow: 'hidden', backgroundColor: c.surfaceAlt, aspectRatio: 1 },
  thumb: { width: '100%', height: '100%' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 12, gap: 6 },
  placeholderMark: { color: c.accent, fontSize: 28 },
  placeholderTitle: { color: c.textMuted, fontSize: 18, fontFamily: fonts.display, textAlign: 'center', textTransform: 'uppercase' },
  // Example input, inset bottom-left over the example result.
  before: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    width: '34%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
    backgroundColor: c.surfaceAlt,
  },
  title: { color: c.text, fontSize: 15, fontWeight: '700', marginTop: 8, paddingHorizontal: 4 },
  subtitle: { color: c.textMuted, fontSize: 12, marginTop: 2, paddingHorizontal: 4 },
}));
