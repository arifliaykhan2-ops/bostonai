import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { DECK_CARDS, type DeckCardItem } from '@/lib/showcaseData';
import { radius, space } from '@/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = Math.min(SCREEN_WIDTH * 0.58, 220);
const CARD_HEIGHT = CARD_WIDTH * 1.25;

export function Interactive3DFanDeck({
  cards = DECK_CARDS,
  onCardSelect,
}: {
  cards?: DeckCardItem[];
  onCardSelect?: (card: DeckCardItem) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const pan = useRef(new Animated.ValueXY()).current;
  const isDragging = useRef(false);

  const total = cards.length;

  const goToNext = () => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    setActiveIndex((prev) => (prev + 1) % total);
  };

  const goToPrev = () => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    setActiveIndex((prev) => (prev - 1 + total) % total);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) => {
        return Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy);
      },
      onPanResponderGrant: () => {
        isDragging.current = true;
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (_, gesture) => {
        pan.setValue({ x: gesture.dx, y: 0 });
      },
      onPanResponderRelease: (_, gesture) => {
        isDragging.current = false;
        const swipeThreshold = 45;
        const velocityThreshold = 0.35;

        if (gesture.dx < -swipeThreshold || gesture.vx < -velocityThreshold) {
          Animated.timing(pan.x, {
            toValue: -CARD_WIDTH * 0.9,
            duration: 160,
            useNativeDriver: true,
          }).start(() => {
            pan.setValue({ x: 0, y: 0 });
            goToNext();
          });
        } else if (gesture.dx > swipeThreshold || gesture.vx > velocityThreshold) {
          Animated.timing(pan.x, {
            toValue: CARD_WIDTH * 0.9,
            duration: 160,
            useNativeDriver: true,
          }).start(() => {
            pan.setValue({ x: 0, y: 0 });
            goToPrev();
          });
        } else {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            friction: 7,
            tension: 40,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  const handleCardPress = (index: number) => {
    if (index === activeIndex) {
      if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const card = cards[index];
      if (onCardSelect) {
        onCardSelect(card);
      } else {
        router.push({
          pathname: '/job/[id]',
          params: { id: card.id },
        });
      }
    } else {
      if (Platform.OS !== 'web') void Haptics.selectionAsync();
      setActiveIndex(index);
    }
  };

  const activeCard = cards[activeIndex];

  const onRemixPrompt = () => {
    if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push({
      pathname: '/create',
      params: {
        model: activeCard.modelId,
        preset: activeCard.presetId,
        prompt: activeCard.prompt,
      },
    });
  };

  return (
    <View style={styles.container}>
      {/* 3D Fan Deck Gesture Container */}
      <View style={styles.deckArea} {...panResponder.panHandlers}>
        {cards.map((card, index) => {
          const relIndex = (index - activeIndex + total) % total;
          if (relIndex > 3 && relIndex < total - 1) return null;

          const isFront = relIndex === 0;
          const baseOffset = relIndex * 36;
          const baseTilt = relIndex * 8;
          const baseScale = Math.max(0.8, 1 - relIndex * 0.06);
          const zIndex = 20 - relIndex;

          const animatedStyle = isFront
            ? {
                transform: [
                  {
                    translateX: pan.x.interpolate({
                      inputRange: [-CARD_WIDTH, 0, CARD_WIDTH],
                      outputRange: [-CARD_WIDTH * 0.8, 0, CARD_WIDTH * 0.8],
                    }),
                  },
                  {
                    rotate: pan.x.interpolate({
                      inputRange: [-CARD_WIDTH, 0, CARD_WIDTH],
                      outputRange: ['-18deg', '0deg', '18deg'],
                    }),
                  },
                  { scale: baseScale },
                ],
              }
            : {
                transform: [
                  { translateX: baseOffset },
                  { rotate: `${baseTilt}deg` },
                  { scale: baseScale },
                ],
              };

          return (
            <Animated.View
              key={card.id}
              style={[
                styles.cardWrapper,
                { zIndex },
                animatedStyle,
              ]}
            >
              <Pressable
                onPress={() => handleCardPress(index)}
                style={({ pressed }) => [
                  styles.cardBody,
                  isFront && styles.frontCardBody,
                  pressed && styles.cardPressed,
                ]}
              >
                <Image
                  source={{ uri: card.imageUrl }}
                  style={styles.cardImage}
                  contentFit="cover"
                  transition={200}
                />

                {/* Model badge on front card */}
                {isFront && (
                  <View style={styles.modelTagPill}>
                    <Text style={styles.modelTagText}>{card.modelName}</Text>
                  </View>
                )}

                <View style={styles.cardGlassOverlay} />
              </Pressable>
            </Animated.View>
          );
        })}
      </View>

      {/* Active Card Info, Prompt Remix & Micro Dash Indicator */}
      <View style={styles.cardInfoRow}>
        <View style={styles.cardTextWrap}>
          <View style={styles.titleLine}>
            <Text numberOfLines={1} style={styles.cardTitle}>
              {activeCard.title}
            </Text>
            <View style={styles.costBadge}>
              <Text style={styles.costBadgeText}>⚡ {activeCard.credits}</Text>
            </View>
          </View>
          <Text numberOfLines={1} style={styles.cardPromptSnippet}>
            "{activeCard.prompt}"
          </Text>
        </View>

        {/* 1-Tap Remix / Use Prompt Button */}
        <Pressable
          onPress={onRemixPrompt}
          style={({ pressed }) => [styles.remixButton, pressed && styles.remixPressed]}
          accessibilityRole="button"
          accessibilityLabel={`Use ${activeCard.modelName} prompt`}
        >
          <Text style={styles.remixIcon}>⚡</Text>
          <Text style={styles.remixText}>Use Prompt</Text>
        </Pressable>
      </View>

      {/* Dash indicators */}
      <View style={styles.dashRow}>
        {cards.map((c, i) => (
          <Pressable
            key={c.id}
            onPress={() => {
              if (Platform.OS !== 'web') void Haptics.selectionAsync();
              setActiveIndex(i);
            }}
            style={[
              styles.dash,
              i === activeIndex && styles.dashActive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: space.sm,
  },
  deckArea: {
    width: CARD_WIDTH + 110,
    height: CARD_HEIGHT + 24,
    position: 'relative',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  cardWrapper: {
    position: 'absolute',
    left: 12,
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  cardBody: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: '#16161E',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.55,
    shadowRadius: 18,
    elevation: 8,
  },
  frontCardBody: {
    borderWidth: 2.8,
    borderColor: '#C6FF3D',
    shadowColor: '#C6FF3D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  modelTagPill: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    backdropFilter: 'blur(10px)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    zIndex: 3,
  },
  modelTagText: {
    color: '#C6FF3D',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  cardGlassOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  cardInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 4,
    marginTop: 10,
    gap: 12,
  },
  cardTextWrap: {
    gap: 2,
    flex: 1,
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  costBadge: {
    backgroundColor: 'rgba(198, 255, 61, 0.12)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  costBadgeText: {
    color: '#C6FF3D',
    fontSize: 11,
    fontWeight: '700',
  },
  cardPromptSnippet: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  remixButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#C6FF3D',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#C6FF3D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  remixPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  remixIcon: {
    fontSize: 12,
    color: '#000000',
  },
  remixText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '800',
  },
  dashRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
  },
  dash: {
    width: 6,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  dashActive: {
    width: 16,
    backgroundColor: '#C6FF3D',
  },
});
