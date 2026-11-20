import { File, Paths } from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { Asset, requestPermissionsAsync } from 'expo-media-library';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, Share, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActionItem, ActionList, DetailHeader, MediaCard, MediaVideo, PromptCard } from '@/components/DetailParts';
import { ReportAction } from '@/components/ReportAction';
import { ScreenBackground } from '@/components/ScreenBackground';
import { PublishIcon, ScissorsIcon } from '@/components/Icons';
import { Button } from '@/components/ui';
import { useJob } from '@/hooks/useJobs';
import { outputUrl, runJobAction, type Job } from '@/lib/api';
import { useModels } from '@/lib/catalog';
import { hasAiConsent } from '@/lib/consent';
import { formatDate, t, tp } from '@/i18n';
import { effectIdOfJob, fx, useEffectById, useJobActions, type Effect } from '@/lib/effects';
import { useCredits } from '@/hooks/useCredits';
import { makeStyles, radius, space, useTheme } from '@/theme';

function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return t('time.justNow');
  if (mins < 60) return tp('time.minutesAgo', mins);
  const h = Math.round(mins / 60);
  if (h < 24) return tp('time.hoursAgo', h);
  return formatDate(iso);
}

/** One of the user's own generations: progress, result, share, save, remix. */
export default function JobDetailScreen() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { job, loading } = useJob(id);
  const { models } = useModels();
  const [url, setUrl] = useState<string | null>(null);
  const credits = useCredits();
  const actions = useJobActions(job?.kind ?? 'image');
  const { effect: sourceEffect } = useEffectById(job ? (effectIdOfJob(job.preset_id) ?? undefined) : undefined);
  const [runningAction, setRunningAction] = useState<string | null>(null);

  useEffect(() => {
    if (job?.status === 'succeeded' && job.output_path) {
      outputUrl(job.output_path).then(setUrl).catch(() => undefined);
    }
  }, [job?.status, job?.output_path]);

  if (!job) {
    return (
      <View style={[s.container, s.center]}>
        {loading ? <ActivityIndicator /> : <Text style={s.muted}>{t('job.notFound')}</Text>}
      </View>
    );
  }

  const model = models.find((m) => m.id === job.model_id);
  const effectId = effectIdOfJob(job.preset_id);
  const modelName = !effectId
    ? (model?.name ?? job.model_id)
    : sourceEffect?.section === 'app'
      ? t('effect.kindApp')
      : sourceEffect?.section === 'action'
        ? t('job.kindTool')
        : t('effect.kindTemplate');
  const canRemix = sourceEffect?.section !== 'action';

  /** Upscale / Add sound: a new job whose input is this one's output. */
  async function runAction(action: Effect) {
    if (!hasAiConsent()) {
      router.push('/consent');
      return;
    }
    if (credits !== null && credits < action.credits) {
      router.push('/paywall');
      return;
    }
    setRunningAction(action.id);
    try {
      const newJob = await runJobAction(action.id, job!.id);
      if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push({ pathname: '/job/[id]', params: { id: newJob } });
    } catch (e) {
      if ((e as { code?: string }).code === 'insufficient_credits') router.push('/paywall');
      else Alert.alert(t('job.couldNotStart'), e instanceof Error ? e.message : String(e));
    } finally {
      setRunningAction(null);
    }
  }
  const remix = () =>
    effectId
      ? router.push({ pathname: '/effect/[id]', params: { id: effectId } })
      : router.push({ pathname: '/create', params: { model: job.model_id, prompt: job.prompt } });

  async function share() {
    if (!url) return;
    await Share.share({ message: `${t('job.shareMessage', { model: modelName, prompt: job!.prompt })}\n${url}` });
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
        <DetailHeader title={job.prompt} subtitle={`${modelName} · ${timeAgo(job.created_at)}`} />

        <MediaCard aspectRatio={job.kind === 'video' ? 9 / 14 : 1}>
          {job.status === 'queued' && (
            <View style={s.center}>
              <ActivityIndicator color={colors.accentInk} size="large" />
              <Text style={s.waiting}>
                {job.kind === 'video'
                  ? t('job.renderingVideo')
                  : t('job.generating')}
              </Text>
            </View>
          )}
          {job.status === 'failed' && (
            <View style={s.center}>
              <Text style={s.error}>{t('job.failed')}</Text>
              <Text style={s.waiting}>{tp('job.refunded', job.cost)}</Text>
            </View>
          )}
          {job.status === 'succeeded' && !url && <ActivityIndicator />}
          {job.status === 'succeeded' && url && job.kind === 'image' && (
            <Image source={{ uri: url }} style={s.fill} contentFit="contain" transition={200} />
          )}
          {job.status === 'succeeded' && url && job.kind === 'video' && <MediaVideo url={url} />}
        </MediaCard>

        <ActionList>
          {job.status === 'succeeded' && url ? (
            <ActionItem icon={<PublishIcon size={28} color={colors.text} strokeWidth={2.4} />} label={t('job.share')} onPress={share} />
          ) : null}
          {job.status === 'succeeded' && url
            ? actions.map((a) => (
                <ActionItem
                  key={a.id}
                  icon={
                    runningAction === a.id ? (
                      <ActivityIndicator color={colors.accent} />
                    ) : (
                      <Text style={s.actionGlyph}>{a.id === 'action-add-sound' ? '♪' : '✦'}</Text>
                    )
                  }
                  label={`${fx.title(a)} · ${a.credits} ⚡`}
                  onPress={() => void runAction(a)}
                />
              ))
            : null}
          {canRemix ? (
            <ActionItem
              icon={<ScissorsIcon size={28} color={colors.text} strokeWidth={2.2} />}
              label={job.status === 'failed' ? t('job.tryAgain') : t('job.remix')}
              onPress={remix}
            />
          ) : null}
          {job.status === 'succeeded' ? <ReportAction targetType="job" targetId={job.id} /> : null}
        </ActionList>

        <PromptCard
          label={effectId ? t('job.templateLabel') : t('job.promptLabel')}
          modelName={modelName}
          credits={job.cost}
          prompt={job.prompt}
          cta={t('job.generateAnother')}
          onCta={remix}
        />

        {job.status === 'succeeded' && url ? <SaveButton job={job} url={url} /> : null}
      </ScrollView>
    </View>
  );
}

function SaveButton({ job, url }: { job: Job; url: string }) {
  const [saving, setSaving] = useState(false);
  if (Platform.OS === 'web') return null;

  async function save() {
    setSaving(true);
    try {
      const { status } = await requestPermissionsAsync(true, ['photo', 'video']);
      if (status !== 'granted') throw new Error(t('job.allowPhotos'));
      const file = new File(Paths.cache, `${job.id}.${job.kind === 'video' ? 'mp4' : 'jpg'}`);
      if (!file.exists) await File.downloadFileAsync(url, file);
      await Asset.create(file.uri);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t('job.saved'), t('job.savedBody'));
    } catch (e) {
      Alert.alert(t('job.couldNotSave'), e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Button
      title={t('job.saveToPhotos')}
      variant="secondary"
      onPress={save}
      loading={saving}
      style={{ height: 50 }}
    />
  );
}

const useStyles = makeStyles((c) => ({
  actionGlyph: { color: c.accent, fontSize: 26, width: 28, textAlign: 'center' },
  container: { flex: 1, backgroundColor: c.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.lg },
  content: { paddingHorizontal: space.md, gap: space.lg },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  muted: { color: c.textMuted, fontSize: 15 },
  waiting: { color: c.textMuted, fontSize: 15, textAlign: 'center' },
  error: { color: c.danger, fontSize: 16, fontWeight: '700', textAlign: 'center' },
}));
