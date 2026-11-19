import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { PlayIcon } from '@/components/Icons';
import { REELS_SAMPLES, type ReelItem } from '@/lib/showcaseData';
import { radius, space } from '@/theme';

const MODEL_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'kling', label: 'Kling 4' },
  { key: 'minimax', label: 'MiniMax' },
  { key: 'seedance', label: 'Seedance' },
  { key: 'wan', label: 'Wan 3' },
  { key: 'ltx', label: 'LTX Fast' },
];

export function ReelsFeedSection({
  reels = REELS_SAMPLES,
  title = 'Trending AI Reels & Motion',
}: {
  reels?: ReelItem[];
  title?: string;
}) {
  const [selectedFilter, setSelectedFilter] = useState('all');

  const filteredReels = useMemo(() => {
    if (selectedFilter === 'all') return reels;
    return reels.filter((r) =>
      r.modelName.toLowerCase().includes(selectedFilter.toLowerCase()) ||
      r.modelId.toLowerCase().includes(selectedFilter.toLowerCase()),
    );
  }, [reels, selectedFilter]);

  const onOpenReel = (reel: ReelItem) => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/job/[id]',
      params: { id: 'eternity-in-souls' },
    });
  };

  const onRemixReel = (reel: ReelItem) => {
    if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push({
      pathname: '/create',
      params: {
        model: reel.modelId,
        preset: reel.presetId,
        prompt: reel.prompt,
      },
    });
  };

  return (
    <View style={styles.container}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <View style={styles.liveIndicator} />
          <Text style={styles.title}>{title}</Text>
        </View>
        <Text style={styles.subtitle}>{filteredReels.length} ready models</Text>
      </View>

      {/* Model Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {MODEL_FILTERS.map((f) => {
          const isActive = selectedFilter === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => {
                if (Platform.OS !== 'web') void Haptics.selectionAsync();
                setSelectedFilter(f.key);
              }}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Horizontal Scroll of 9:16 Reels Cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {filteredReels.map((reel) => (
          <View key={reel.id} style={styles.cardOuter}>
            <Pressable
              onPress={() => onOpenReel(reel)}
              style={({ pressed }) => [
                styles.reelCard,
                pressed && styles.cardPressed,
              ]}
            >
              <Image
                source={{ uri: reel.thumbnailUrl }}
                style={styles.cardImage}
                contentFit="cover"
                transition={200}
              />

              {/* Dark Gradient Overlay */}
              <View style={styles.gradientOverlay} />

              {/* Top Row: Model Badge & Duration */}
              <View style={styles.topRow}>
                <View style={styles.modelBadge}>
                  <Text style={styles.modelBadgeText}>{reel.modelName}</Text>
                </View>
                <View style={styles.durationPill}>
                  <Text style={styles.durationText}>{reel.duration}</Text>
                </View>
              </View>

              {/* Center Play Icon */}
              <View style={styles.centerPlay}>
                <View style={styles.playBadge}>
                  <PlayIcon size={14} color="#FFFFFF" />
                </View>
              </View>

              {/* Bottom Content: Views, Title, Prompt Snippet */}
              <View style={styles.bottomContent}>
                <View style={styles.viewsRow}>
                  <Text style={styles.viewsCount}>▶ {reel.views}</Text>
                  <Text style={styles.creditsCost}>⚡ {reel.credits}</Text>
                </View>

                <Text numberOfLines={1} style={styles.reelTitle}>
                  {reel.title}
                </Text>

                <Text numberOfLines={1} style={styles.promptSnippet}>
                  "{reel.prompt}"
                </Text>

                {/* 1-Tap Remix Button */}
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    onRemixReel(reel);
                  }}
                  style={({ pressed }) => [
                    styles.remixBtn,
                    pressed && styles.remixBtnPressed,
                  ]}
                  accessibilityRole="button"
                >
                  <Text style={styles.remixBtnText}>⚡ Try Prompt</Text>
                </Pressable>
              </View>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: space.sm,
    marginVertical: space.xs,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C6FF3D',
    shadowColor: '#C6FF3D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '500',
  },
  filterRow: {
    gap: 8,
    paddingVertical: 2,
    paddingRight: space.md,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#16161D',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterChipActive: {
    backgroundColor: '#262632',
    borderColor: '#C6FF3D',
  },
  filterChipText: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scrollContent: {
    gap: 12,
    paddingVertical: 4,
    paddingRight: space.md,
  },
  cardOuter: {
    width: 156,
  },
  reelCard: {
    width: 156,
    height: 256,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#16161D',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    position: 'relative',
    justifyContent: 'space-between',
    padding: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 6,
  },
  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.97 }],
  },
  cardImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  modelBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    backdropFilter: 'blur(8px)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  modelBadgeText: {
    color: '#C6FF3D',
    fontSize: 9,
    fontWeight: '800',
  },
  durationPill: {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  centerPlay: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  playBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomContent: {
    gap: 4,
    zIndex: 2,
  },
  viewsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewsCount: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  creditsCost: {
    color: '#C6FF3D',
    fontSize: 11,
    fontWeight: '700',
  },
  reelTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  promptSnippet: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 10,
    fontStyle: 'italic',
  },
  remixBtn: {
    backgroundColor: 'rgba(198, 255, 61, 0.18)',
    borderWidth: 1,
    borderColor: '#C6FF3D',
    borderRadius: 999,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  remixBtnPressed: {
    backgroundColor: '#C6FF3D',
  },
  remixBtnText: {
    color: '#C6FF3D',
    fontSize: 11,
    fontWeight: '800',
  },
});
