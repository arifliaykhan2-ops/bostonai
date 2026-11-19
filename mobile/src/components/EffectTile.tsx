import { useEvent } from 'expo';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Pressable, Text, View, type LayoutChangeEvent } from 'react-native';
import { effectAspect, type Effect } from '@/lib/effects';
import { makeStyles, radius } from '@/theme';

/**
 * One Home feed tile: just the template's demo, at its own aspect ratio (no
 * crop, so the 720p clip stays sharp) and with no text on top. Name and price
 * are on the template screen. The clip plays only while `active` (on screen).
 */
export function EffectTile({
  effect,
  active,
  near = true,
  onPress,
  onLayout,
}: {
  effect: Effect;
  active: boolean;
  /** Close to the viewport: load the cover. Far tiles keep their size but no image. */
  near?: boolean;
  onPress: () => void;
  onLayout?: (e: LayoutChangeEvent) => void;
}) {
  const s = useStyles();
  return (
    <Pressable
      onLayout={onLayout}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${effect.title} template, ${effect.credits} credits`}
      style={({ pressed }) => [s.card, { aspectRatio: effectAspect(effect) }, pressed && s.pressed]}
    >
      {near && effect.poster_url ? (
        <Image
          source={{ uri: effect.poster_url }}
          style={s.fill}
          contentFit="cover"
          transition={200}
          recyclingKey={effect.id}
          cachePolicy="memory-disk"
        />
      ) : !effect.poster_url ? (
        <LinearGradient colors={['#2A2A3A', '#101016']} style={s.fill} />
      ) : null}
      {active && effect.preview_url ? <LoopVideo url={effect.preview_url} /> : null}
      {/* A template still waiting for its demo clip has nothing else to show, so it keeps its name. */}
      {!effect.poster_url && !effect.preview_url ? (
        <View style={[s.fill, s.center]}>
          <Text numberOfLines={2} style={s.title}>
            {effect.title}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/** Hidden until it actually plays: demo clips often open on a blurred or black frame, so the cover stays up meanwhile. */
function LoopVideo({ url }: { url: string }) {
  const s = useStyles();
  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  return (
    <VideoView
      player={player}
      style={[s.fill, { opacity: isPlaying ? 1 : 0 }]}
      contentFit="cover"
      nativeControls={false}
      pointerEvents="none"
    />
  );
}

const useStyles = makeStyles((c) => ({
  card: {
    width: '100%',
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 10 },
  title: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', letterSpacing: -0.2, textAlign: 'center' },
}));
