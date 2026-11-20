import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenBackground } from '@/components/ScreenBackground';
import { PageHeader } from '@/components/ui';
import { EffectTile } from '@/components/EffectTile';
import { effectAspect, useEffects, type Effect } from '@/lib/effects';
import { makeStyles, space } from '@/theme';
import { t } from '@/i18n';

const COLUMNS = 2;

/** Landscape clips get a full-width row of their own; portrait and square ones share 2 columns. */
const isWide = (e: Effect) => effectAspect(e) > 1.05;

type Block = { kind: 'wide'; item: Effect } | { kind: 'grid'; cols: Effect[][] };

/**
 * Newest-first list → layout blocks. A landscape clip that arrives while a
 * 2-column run has an odd count waits for the next portrait, so no row is
 * left half empty (the order shifts by at most one tile).
 */
function toBlocks(items: Effect[]): Block[] {
  const blocks: Block[] = [];
  let run: Effect[] = [];
  let waiting: Effect[] = [];
  const flush = () => {
    if (run.length) blocks.push({ kind: 'grid', cols: toColumns(run) });
    run = [];
  };
  const emitWaiting = () => {
    for (const item of waiting) blocks.push({ kind: 'wide', item });
    waiting = [];
  };
  for (const item of items) {
    if (isWide(item)) {
      if (run.length % 2 === 0) {
        flush();
        blocks.push({ kind: 'wide', item });
      } else waiting.push(item);
    } else {
      run.push(item);
      if (run.length % 2 === 0 && waiting.length) {
        flush();
        emitWaiting();
      }
    }
  }
  flush();
  emitWaiting();
  return blocks;
}

/** Spreads templates over 2 columns, always adding to the shortest one (masonry), keeping newest-first order. */
function toColumns(items: Effect[]) {
  const cols: Effect[][] = Array.from({ length: COLUMNS }, () => []);
  const heights = new Array(COLUMNS).fill(0);
  for (const item of items) {
    const i = heights.indexOf(Math.min(...heights));
    cols[i].push(item);
    heights[i] += 1 / effectAspect(item);
  }
  return cols;
}

/** Home: every Vidu trend template, newest first. Tap one → add a photo → get the video. */
export default function HomeScreen() {
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const { height: windowH } = useWindowDimensions();
  const { effects, loading, error, reload } = useEffects();
  const [refreshing, setRefreshing] = useState(false);

  // Which tiles are on screen → only those play their clip.
  const [scrollY, setScrollY] = useState(0);
  const gridTop = useRef(0);
  const tileBoxes = useRef(new Map<string, { block: number; y: number; h: number }>()).current;
  const blockTops = useRef(new Map<number, number>()).current;
  // Tiles report their position after the first paint; re-render once they have,
  // so the clips already on screen start without waiting for a scroll.
  const [, setLayoutTick] = useState(0);
  const layoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onTileLayout = (id: string, block: number, y: number, h: number) => {
    tileBoxes.set(id, { block, y, h });
    if (layoutTimer.current) clearTimeout(layoutTimer.current);
    layoutTimer.current = setTimeout(() => setLayoutTick((t) => t + 1), 120);
  };

  const blocks = useMemo(() => toBlocks(effects), [effects]);

  const isWithin = (id: string, margin: number) => {
    const box = tileBoxes.get(id);
    if (!box) return margin > 0; // not measured yet: show covers, don't autoplay
    const top = gridTop.current + (blockTops.get(box.block) ?? 0) + box.y;
    return top + box.h > scrollY - margin && top < scrollY + windowH + margin;
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    if (Math.abs(y - scrollY) > 80) setScrollY(y);
  };

  const open = (effect: Effect) => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/effect/[id]', params: { id: effect.id } });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  return (
    <View style={s.container}>
      <ScreenBackground />

      <ScrollView
        style={s.scrollView}
        onScroll={onScroll}
        scrollEventThrottle={100}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={[
          s.content,
          { paddingTop: Math.max(insets.top, 24) + 12, paddingBottom: Math.max(insets.bottom, 24) + 90 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <PageHeader title={t('trends.title')} subtitle={t('trends.subtitle')} />

        {loading ? (
          <ActivityIndicator style={{ marginTop: space.xl }} />
        ) : error && !effects.length ? (
          <Pressable onPress={() => void reload()} accessibilityRole="button">
            <Text style={s.empty}>{t('trends.loadError')}</Text>
          </Pressable>
        ) : (
          <View style={s.feed} onLayout={(e) => (gridTop.current = e.nativeEvent.layout.y)}>
            {blocks.map((block, bi) => {
              const tile = (effect: Effect) => (
                <EffectTile
                  key={effect.id}
                  effect={effect}
                  active={isWithin(effect.id, 0)}
                  near={isWithin(effect.id, windowH * 2)}
                  onPress={() => open(effect)}
                  onLayout={(e) => onTileLayout(effect.id, bi, e.nativeEvent.layout.y, e.nativeEvent.layout.height)}
                />
              );
              return (
                <View
                  key={block.kind === 'wide' ? block.item.id : `grid-${bi}`}
                  onLayout={(e) => blockTops.set(bi, e.nativeEvent.layout.y)}
                  style={block.kind === 'grid' ? s.grid : undefined}
                >
                  {block.kind === 'wide'
                    ? tile(block.item)
                    : block.cols.map((col, ci) => (
                        <View key={ci} style={s.column}>
                          {col.map(tile)}
                        </View>
                      ))}
                </View>
              );
            })}
          </View>
        )}

        {effects.length > 0 && <Text style={s.credit}>{effects.length} templates · new ones appear at the top</Text>}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  container: { flex: 1, backgroundColor: c.bg },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: space.md },
  feed: { gap: 10 },
  grid: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  column: { flex: 1, gap: 10 },
  empty: { color: c.textMuted, fontSize: 15, textAlign: 'center', marginTop: space.xl },
  credit: { color: c.textSubtle, fontSize: 11, textAlign: 'center', marginTop: space.lg },
}));
