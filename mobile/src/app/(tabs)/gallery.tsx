import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenBackground } from '@/components/ScreenBackground';
import { PlayIcon } from '@/components/Icons';
import { Button, PageHeader, Segmented } from '@/components/ui';
import { useJobs } from '@/hooks/useJobs';
import { outputUrl, type Job } from '@/lib/api';
import { makeStyles, radius, space, useTheme } from '@/theme';

type Filter = 'all' | 'video' | 'image';
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'video', label: 'Videos' },
  { value: 'image', label: 'Images' },
];

/** The user's own generations, newest first. */
export default function CreatedByMeScreen() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { jobs, loading, refresh } = useJobs();
  const [filter, setFilter] = useState<Filter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const shown = useMemo(() => jobs.filter((j) => filter === 'all' || j.kind === filter), [jobs, filter]);

  return (
    <View style={s.container}>
      <ScreenBackground />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          s.content,
          { paddingTop: Math.max(insets.top, 24) + 8, paddingBottom: Math.max(insets.bottom, 24) + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.textMuted}
            onRefresh={async () => {
              setRefreshing(true);
              await refresh();
              setRefreshing(false);
            }}
          />
        }
      >
        <PageHeader
          title="My creations"
          subtitle={jobs.length === 0 ? 'Your videos and images live here.' : jobs.length === 1 ? '1 creation' : `${jobs.length} creations`}
        />

        {jobs.length > 0 && <Segmented value={filter} options={FILTERS} onChange={setFilter} />}

        {loading ? (
          <ActivityIndicator style={{ marginTop: space.xl }} />
        ) : jobs.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyText}>Nothing here yet.</Text>
            <Button
              title="Start creating"
              onPress={() => router.push('/')}
              style={{ alignSelf: 'stretch', height: 52 }}
            />
          </View>
        ) : shown.length === 0 ? (
          <Text style={s.emptyText}>No {filter === 'video' ? 'videos' : 'images'} yet.</Text>
        ) : (
          <View style={s.grid}>
            {shown.map((job) => (
              <JobTile key={job.id} job={job} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function JobTile({ job }: { job: Job }) {
  const s = useStyles();
  const { colors } = useTheme();
  const [thumb, setThumb] = useState<string | null>(null);

  useEffect(() => {
    if (job.status === 'succeeded' && job.kind === 'image' && job.output_path) {
      outputUrl(job.output_path).then(setThumb).catch(() => undefined);
    }
  }, [job.status, job.kind, job.output_path]);

  return (
    <Pressable
      style={({ pressed }) => [s.tile, pressed && s.pressed]}
      onPress={() => router.push({ pathname: '/job/[id]', params: { id: job.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${job.kind}, ${job.status}. ${job.prompt}`}
    >
      {thumb && <Image source={{ uri: thumb }} style={s.fill} contentFit="cover" transition={200} />}
      <View style={[s.fill, s.center]}>
        {job.status === 'queued' && <ActivityIndicator color={colors.text} />}
        {job.status === 'failed' && <Text style={s.failed}>Failed · refunded</Text>}
        {job.status === 'succeeded' && job.kind === 'video' && (
          <View style={s.play}>
            <PlayIcon size={18} color="#FFFFFF" />
          </View>
        )}
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  container: { flex: 1, backgroundColor: c.bg },
  content: { paddingHorizontal: space.md, gap: space.md },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  tile: {
    width: '48.5%',
    aspectRatio: 9 / 13,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  center: { alignItems: 'center', justifyContent: 'center' },
  failed: { color: c.danger, fontWeight: '600', fontSize: 13 },
  play: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { gap: space.md, marginTop: space.xl },
  emptyText: { color: c.textMuted, fontSize: 15, textAlign: 'center' },
}));
