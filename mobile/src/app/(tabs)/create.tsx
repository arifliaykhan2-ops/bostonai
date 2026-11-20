import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenBackground } from '@/components/ScreenBackground';
import { ImageSlots } from '@/components/ImageSlots';
import { ModelCard } from '@/components/ModelCard';
import { ParamControls } from '@/components/ParamControls';
import { Button, Card, Chip, PageHeader, SectionLabel, Segmented } from '@/components/ui';
import { useCredits } from '@/hooks/useCredits';
import { generate } from '@/lib/api';
import { modeOf, useModels, type CreateMode } from '@/lib/catalog';
import { hasAiConsent } from '@/lib/consent';
import { presetLabel, presetsFor } from '@/lib/presets';
import { quoteCredits, type ParamValues } from '@/lib/pricing';
import { t } from '@/i18n';
import { makeStyles, radius, space, useTheme } from '@/theme';

const MODE_OPTIONS: { value: CreateMode; label: string }[] = [
  { value: 'video', label: t('create.modeVideo') },
  { value: 'image', label: t('create.modeImage') },
  { value: 'edit', label: t('create.modeEdit') },
];

const PLACEHOLDERS: Record<CreateMode, string> = {
  video: t('create.placeholderVideo'),
  image: t('create.placeholderImage'),
  edit: t('create.placeholderEdit'),
};

export default function CreateScreen() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const credits = useCredits();
  const { models: allModels, loading: modelsLoading, error: modelsError } = useModels();
  const { model: modelParam, preset: presetParam, prompt: promptParam } = useLocalSearchParams<{
    model?: string;
    preset?: string;
    prompt?: string;
  }>();

  const [mode, setMode] = useState<CreateMode>('video');
  const [modelId, setModelId] = useState<string | null>(null);
  const [params, setParams] = useState<ParamValues>({});
  const [images, setImages] = useState<Record<string, string>>({});
  const [prompt, setPrompt] = useState(promptParam ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const models = useMemo(() => allModels.filter((m) => modeOf(m) === mode), [allModels, mode]);
  const model = models.find((m) => m.id === modelId) ?? models[0];
  const presets = useMemo(() => presetsFor(model?.kind ?? 'video'), [model?.kind]);
  const [presetId, setPresetId] = useState(presetParam ?? presets[0]?.id ?? 'none-video');

  useEffect(() => {
    if (promptParam) setPrompt(promptParam);
  }, [promptParam]);

  useEffect(() => {
    const target = allModels.find((m) => m.id === modelParam);
    if (target) {
      setMode(modeOf(target));
      setModelId(target.id);
    }
  }, [modelParam, allModels]);

  useEffect(() => {
    if (presetParam && presets.some((p) => p.id === presetParam)) {
      setPresetId(presetParam);
    }
  }, [presetParam, presets]);

  // Keep a valid selection when the mode or catalog changes — preferring the
  // model passed in from Explore/Remix, which the effect above may set in the
  // same render (this effect still sees the old modelId).
  useEffect(() => {
    if (!models.length || models.some((m) => m.id === modelId)) return;
    const fromParam = models.find((m) => m.id === modelParam);
    setModelId(fromParam?.id ?? models[0].id);
  }, [models, modelId, modelParam]);

  useEffect(() => {
    setParams({});
    setImages((prev) => {
      const keep: Record<string, string> = {};
      for (const slot of model?.image_slots ?? []) if (prev[slot.key]) keep[slot.key] = prev[slot.key];
      return keep;
    });
    setError(null);
  }, [model?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!presets.some((p) => p.id === presetId)) setPresetId(presets[0]?.id ?? '');
  }, [presets, presetId]);

  const cost = model ? quoteCredits(model.pricing, model.params, params) : 0;
  const missingImage = !!model?.image_slots.some((slot) => slot.required && !images[slot.key]);
  const canSubmit = !!model && prompt.trim().length > 2 && !missingImage;

  async function onGenerate() {
    if (!model) return;
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
      const jobId = await generate({ modelId: model.id, presetId, prompt: prompt.trim(), params, images });
      if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push({ pathname: '/job/[id]', params: { id: jobId } });
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
        style={s.scrollView}
        contentContainerStyle={[
          s.content,
          {
            paddingTop: Math.max(insets.top, 24) + 12,
            paddingBottom: Math.max(insets.bottom, 24) + 100,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <PageHeader title={t('create.title')} subtitle={t('create.subtitle')} />

        {promptParam && prompt === promptParam && (
          <View style={s.remixRow}>
            <Text style={s.remixText}>{t('create.remixing')}</Text>
            <Pressable onPress={() => setPrompt('')} accessibilityRole="button" hitSlop={8}>
              <Text style={s.remixClear}>{t('create.clear')}</Text>
            </Pressable>
          </View>
        )}

        <Segmented value={mode} options={MODE_OPTIONS} onChange={setMode} />

        <SectionLabel>{t('create.model')}</SectionLabel>

        {modelsLoading ? (
          <ActivityIndicator color={colors.textMuted} style={{ marginVertical: space.lg }} />
        ) : modelsError && models.length === 0 ? (
          <Text style={s.error}>{t('create.modelsError', { error: modelsError })}</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.modelRow}>
            {models.map((m) => (
              <ModelCard key={m.id} model={m} selected={m.id === model?.id} onPress={() => setModelId(m.id)} />
            ))}
          </ScrollView>
        )}

        {model && model.image_slots && model.image_slots.length > 0 && (
          <ImageSlots
            slots={model.image_slots}
            values={images}
            onChange={(key, uri) =>
              setImages((prev) => {
                const next = { ...prev };
                if (uri) next[key] = uri;
                else delete next[key];
                return next;
              })
            }
          />
        )}

        <SectionLabel>{t('create.prompt')}</SectionLabel>
        <Card style={s.inputCard}>
          <TextInput
            value={prompt}
            onChangeText={setPrompt}
            placeholder={PLACEHOLDERS[mode]}
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={1000}
            style={s.input}
          />
        </Card>

        {mode !== 'edit' && presets.length > 0 && (
          <>
            <SectionLabel>{mode === 'video' ? t('create.motion') : t('create.style')}</SectionLabel>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
              {presets.map((p) => (
                <Chip key={p.id} label={presetLabel(p)} selected={p.id === presetId} onPress={() => setPresetId(p.id)} />
              ))}
            </ScrollView>
          </>
        )}

        {model && model.params && model.params.length > 0 && (
          <ParamControls
            specs={model.params}
            values={params}
            onChange={(key, value) => setParams((prev) => ({ ...prev, [key]: value }))}
          />
        )}

        <Button
          title={model ? `${t('effect.generate')} · ⚡ ${cost}` : t('effect.generate')}
          onPress={onGenerate}
          disabled={!canSubmit}
          loading={submitting}
          style={{ marginTop: space.lg, height: 56 }}
        />
        {missingImage && <Text style={s.hint}>{t('create.addPhoto')}</Text>}
        {error && <Text style={s.error}>{error}</Text>}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  container: { flex: 1, backgroundColor: c.bg },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: space.md, gap: space.sm },
  remixRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 2 },
  remixText: { color: c.textMuted, fontSize: 13, fontWeight: '600' },
  remixClear: { color: c.text, fontSize: 13, fontWeight: '700' },
  modelRow: { gap: space.sm, paddingVertical: 2, paddingBottom: space.sm },
  inputCard: {
    padding: 0,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radius.lg,
  },
  input: { color: c.text, fontSize: 16, minHeight: 110, padding: space.md, textAlignVertical: 'top' },
  chips: { gap: space.sm, paddingVertical: 2 },
  hint: { color: c.textMuted, fontSize: 13, textAlign: 'center' },
  error: { color: c.danger, fontSize: 14, textAlign: 'center', marginTop: space.sm },
}));
