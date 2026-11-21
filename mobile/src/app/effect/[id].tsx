import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DetailHeader, MediaCard, MediaVideo } from '@/components/DetailParts';
import { ScreenBackground } from '@/components/ScreenBackground';
import { Button, Chip } from '@/components/ui';
import { useCredits } from '@/hooks/useCredits';
import { generateEffect } from '@/lib/api';
import { hasAiConsent } from '@/lib/consent';
import { t, tp } from '@/i18n';
import { effectAspect, effectCost, fx, useEffectById } from '@/lib/effects';
import { makeStyles, radius, space, useTheme } from '@/theme';

/**
 * A trend template or an app: see the example, add your photo (and a second one
 * for try-on), pick the options, get the result.
 */
export default function EffectScreen() {
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { effect, loading } = useEffectById(id);
  const credits = useCredits();
  const [photo, setPhoto] = useState<string | null>(null);
  const [photo2, setPhoto2] = useState<string | null>(null);
  const [morePhotos, setMorePhotos] = useState<string[]>([]);
  const [video, setVideo] = useState<{ uri: string; seconds: number } | null>(null);
  const [picked, setPicked] = useState<Record<string, string | number>>({});
  const [script, setScript] = useState('');
  const [consented, setConsented] = useState(false);
  const { colors } = useTheme();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!effect) {
    return (
      <View style={[s.container, s.center]}>
        {loading ? <ActivityIndicator /> : <Text style={s.muted}>{t('errors.unknown_effect')}</Text>}
      </View>
    );
  }

  const isApp = effect.section === 'app';
  const isImage = effect.kind === 'image';
  const textInput = effect.text_input;
  const scriptOk = !textInput || (script.trim().length >= 2 && script.trim().length <= textInput.max);
  const needsConsent = effect.requires_consent || !!textInput?.consent;
  const videoInput = effect.video_input;
  const ready =
    !!photo && (!effect.image2 || !!photo2) && (!videoInput || !!video) && scriptOk && (!needsConsent || consented);
  const cost = effectCost(effect, script);
  // Steps after the photo: the video (if any), the script (if any), then each choice.
  const scriptStep = videoInput ? 3 : 2;
  const firstChoiceStep = scriptStep + (textInput ? 1 : 0);
  const choiceValue = (field: string, fallback: string | number) => picked[field] ?? fallback;

  async function pick(setter: (uri: string) => void) {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (!result.canceled) {
      setter(result.assets[0].uri);
      setError(null);
    }
  }

  async function pickVideo() {
    if (!videoInput) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      videoMaxDuration: videoInput.max_seconds,
      quality: 1,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    const seconds = (asset.duration ?? 0) / 1000;
    if (seconds > videoInput.max_seconds + 0.5) {
      setError(t('effect.videoTooLong', { max: videoInput.max_seconds, seconds: Math.round(seconds) }));
      return;
    }
    setVideo({ uri: asset.uri, seconds });
    setError(null);
  }

  async function onGenerate() {
    if (!effect || !photo || !ready) return;
    if (!hasAiConsent()) {
      router.push('/consent');
      return;
    }
    if (credits !== null && credits < cost) {
      router.push('/paywall');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const choices = Object.fromEntries(effect.choices.map((c) => [c.field, choiceValue(c.field, c.default)]));
      const jobId = await generateEffect(effect.id, photo, {
        choices,
        photo2Uri: photo2 ?? undefined,
        morePhotoUris: morePhotos,
        videoUri: video?.uri,
        text: textInput ? script.trim() : undefined,
        consentSelf: needsConsent ? consented : undefined,
      });
      if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace({ pathname: '/job/[id]', params: { id: jobId } });
    } catch (e) {
      if ((e as { code?: string }).code === 'insufficient_credits') {
        router.push('/paywall');
        return;
      }
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={s.container}>
      <ScreenBackground />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          s.content,
          { paddingTop: Math.max(insets.top, 24) + 8, paddingBottom: Math.max(insets.bottom, 24) + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <DetailHeader
          title={fx.title(effect)}
          subtitle={`${isApp ? t('effect.kindApp') : t('effect.kindTemplate')} · ⚡ ${
            textInput?.credits_per_char ? t('effect.fromCredits', { count: effect.credits }) : tp('common.credits', effect.credits)
          }`}
        />

        <MediaCard aspectRatio={effectAspect(effect)}>
          {(isImage || !effect.preview_url) && effect.poster_url ? (
            <Image source={{ uri: effect.poster_url }} style={s.fill} contentFit="cover" transition={200} />
          ) : effect.preview_url ? (
            <MediaVideo url={effect.preview_url} poster={effect.poster_url} muted />
          ) : (
            <LinearGradient colors={['#2A2A3A', '#0B0B10']} style={[s.fill, s.center]}>
              <Text style={s.placeholderTitle}>{fx.title(effect)}</Text>
              <Text style={s.muted}>{t('effect.exampleSoon')}</Text>
            </LinearGradient>
          )}
        </MediaCard>

        {fx.description(effect) ? <Text style={s.description}>{fx.description(effect)}</Text> : null}

        <View style={s.card}>
          <Text style={s.step}>
            1 · {effect.more_photos ? t('effect.addPhotos', { max: 1 + effect.more_photos }) : t('effect.addPhoto')}
          </Text>
          <Text style={s.tip}>
            {isApp
              ? t('effect.tipApp')
              : t('effect.tipTemplate', { who: fx.subtitle(effect) ?? t('effect.onePerson') })}
          </Text>
          <View style={s.slots}>
            <PhotoSlot uri={photo} label={effect.image2 ? t('effect.yourPhoto') : undefined} onPress={() => pick(setPhoto)} />
            {effect.image2 ? (
              <PhotoSlot uri={photo2} label={fx.image2Label(effect)} onPress={() => pick(setPhoto2)} />
            ) : null}
            {/* Optional extra references appear one at a time, after the previous one is filled. */}
            {Array.from({ length: effect.more_photos }, (_, i) =>
              photo && (i === 0 || morePhotos[i - 1]) ? (
                <PhotoSlot
                  key={i}
                  uri={morePhotos[i] ?? null}
                  label={t('effect.optional')}
                  small
                  onPress={() =>
                    pick((uri) =>
                      setMorePhotos((prev) => {
                        const next = [...prev];
                        next[i] = uri;
                        return next.filter(Boolean);
                      }),
                    )
                  }
                />
              ) : null,
            )}
          </View>

          {videoInput ? (
            <View style={{ marginTop: space.md, gap: space.sm }}>
              <Text style={s.step}>2 · {fx.videoLabel(effect)}</Text>
              <Text style={s.tip}>{t('effect.videoTip')}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={video ? t('effect.changeVideo') : t('effect.chooseVideo')}
                onPress={pickVideo}
                style={({ pressed }) => [s.videoSlot, !video && s.photoSlotEmpty, pressed && s.pressed]}
              >
                <Text style={video ? s.videoPicked : s.plus}>
                  {video ? `🎬  ${t('effect.videoPicked', { seconds: video.seconds.toFixed(1) })}` : '+'}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {textInput ? (
            <View style={{ marginTop: space.md, gap: space.sm }}>
              <Text style={s.step}>
                {scriptStep} · {fx.textLabel(effect)}
              </Text>
              <TextInput
                value={script}
                onChangeText={setScript}
                placeholder={fx.textPlaceholder(effect)}
                placeholderTextColor={colors.textSubtle}
                maxLength={textInput.max}
                multiline
                style={s.script}
              />
              <Text style={s.counter}>
                {script.trim().length}/{textInput.max} · ⚡ {cost}
              </Text>
            </View>
          ) : null}

          {effect.choices.map((c, i) => (
            <View key={c.field} style={{ marginTop: space.md }}>
              <Text style={s.step}>
                {i + firstChoiceStep} · {fx.choiceLabel(effect, c)}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
                {c.options.map((o) => (
                  <Chip
                    key={String(o.value)}
                    label={fx.optionLabel(effect, c, o)}
                    selected={choiceValue(c.field, c.default) === o.value}
                    onPress={() => setPicked((p) => ({ ...p, [c.field]: o.value }))}
                  />
                ))}
              </ScrollView>
            </View>
          ))}

          {needsConsent ? (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: consented }}
              onPress={() => setConsented((v) => !v)}
              style={[s.consentRow, { marginTop: space.md }]}
            >
              <View style={[s.checkbox, consented && s.checkboxOn]}>
                {consented ? <Text style={s.checkMark}>✓</Text> : null}
              </View>
              <Text style={s.consentText}>
                {textInput ? t('effect.consentSpeak') : t('effect.consentPhotos')}
              </Text>
            </Pressable>
          ) : null}

          <Text style={[s.step, { marginTop: space.md }]}>{effect.choices.length + firstChoiceStep} · {t('effect.generateStep')}</Text>
          {error ? <Text style={s.error}>{error}</Text> : null}
          <Button
            title={
              ready
                ? `✦ ${isImage ? t('effect.generate') : t('effect.makeVideo')} · ${cost} ⚡`
                : !photo
                  ? t('errors.image_required')
                  : effect.image2 && !photo2
                    ? t('effect.addSecond', { what: fx.image2Label(effect) })
                    : videoInput && !video
                      ? t('effect.chooseVideo')
                      : !scriptOk
                        ? t('effect.writeScript')
                        : t('effect.confirmPermission')
            }
            onPress={onGenerate}
            disabled={!ready}
            loading={submitting}
            style={{ height: 54 }}
          />
          <Text style={s.fine}>
            {isImage ? t('effect.timeImage') : t('effect.timeVideo')} {t('effect.refundNote')}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function PhotoSlot({
  uri,
  label,
  small,
  onPress,
}: {
  uri: string | null;
  label?: string;
  small?: boolean;
  onPress: () => void;
}) {
  const s = useStyles();
  return (
    <View style={s.slotWrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={uri ? t('effect.changeX', { what: label ?? t('effect.photo') }) : t('effect.chooseX', { what: label ?? t('effect.photo') })}
        onPress={onPress}
        style={({ pressed }) => [s.photoSlot, small && s.photoSlotSmall, !uri && s.photoSlotEmpty, pressed && s.pressed]}
      >
        {uri ? <Image source={{ uri }} style={s.fill} contentFit="cover" /> : <Text style={s.plus}>+</Text>}
      </Pressable>
      {label ? <Text style={s.slotLabel}>{label}</Text> : null}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  container: { flex: 1, backgroundColor: c.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: space.md, gap: space.lg },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  muted: { color: c.textMuted, fontSize: 14 },
  placeholderTitle: { color: '#FFFFFF', fontSize: 28, fontWeight: '800', letterSpacing: -0.8, marginBottom: 6 },
  card: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radius.lg,
    padding: space.md,
    gap: space.sm,
  },
  step: { color: c.text, fontSize: 16, fontWeight: '800' },
  tip: { color: c.textMuted, fontSize: 13 },
  photoSlot: {
    width: 120,
    height: 150,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: c.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoSlotEmpty: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.borderActive },
  pressed: { opacity: 0.8 },
  plus: { color: c.textMuted, fontSize: 34, fontWeight: '300' },
  slots: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-end' },
  photoSlotSmall: { width: 84, height: 105 },
  videoSlot: {
    height: 64,
    borderRadius: radius.md,
    backgroundColor: c.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  videoPicked: { color: c.text, fontSize: 15, fontWeight: '600' },
  slotWrap: { gap: 6 },
  slotLabel: { color: c.textMuted, fontSize: 12, textAlign: 'center' },
  chips: { gap: 6, paddingTop: space.sm },
  description: { color: c.textMuted, fontSize: 15, lineHeight: 21, marginTop: -space.sm },
  script: {
    minHeight: 96,
    color: c.text,
    fontSize: 16,
    backgroundColor: c.surfaceAlt,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    padding: 12,
    textAlignVertical: 'top',
  },
  counter: { color: c.textMuted, fontSize: 12, textAlign: 'right' },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 4 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: c.borderActive,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxOn: { backgroundColor: c.accent, borderColor: c.accent },
  checkMark: { color: '#000000', fontSize: 14, fontWeight: '800' },
  consentText: { flex: 1, color: c.textSoft, fontSize: 13, lineHeight: 18 },
  error: { color: c.danger, fontSize: 13 },
  fine: { color: c.textSubtle, fontSize: 12, textAlign: 'center' },
}));
