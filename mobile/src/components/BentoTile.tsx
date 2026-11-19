import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Pressable, Text, View, type LayoutChangeEvent } from 'react-native';
import { PlayIcon } from '@/components/Icons';
import { tileAspect, type ShowcaseItem } from '@/lib/showcase';
import { makeStyles, space } from '@/theme';

/**
 * One tile of the Home bento grid. Shows a still frame; videos loop a light
 * preview only while `active` (on screen) so scrolling stays smooth.
 */
export function BentoTile({
  item,
  modelName,
  active,
  near = true,
  hero,
  onPress,
  onLayout,
}: {
  item: ShowcaseItem;
  modelName?: string;
  active: boolean;
  /** Close to the viewport: load the still. Far tiles keep their size but no image. */
  near?: boolean;
  hero?: boolean;
  onPress: () => void;
  onLayout?: (e: LayoutChangeEvent) => void;
}) {
  const s = useStyles();
  const isVideo = item.media_type === 'video';

  return (
    <Pressable
      onLayout={onLayout}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${isVideo ? 'Video' : 'Image'} by ${item.author ?? 'creator'}. ${item.prompt.slice(0, 80)}`}
      style={({ pressed }) => [s.card, { aspectRatio: tileAspect(item) }, hero && s.hero, pressed && s.pressed]}
    >
      {near && item.preview_url ? (
        <Image
          source={{ uri: item.preview_url }}
          style={s.fill}
          contentFit="cover"
          transition={250}
          recyclingKey={item.id}
          cachePolicy="memory-disk"
        />
      ) : null}
      {isVideo && active && item.preview_video_url ? <TileVideo url={item.preview_video_url} /> : null}

      {isVideo && !active ? (
        <View style={s.playBadge}>
          <PlayIcon size={12} color="#FFFFFF" />
        </View>
      ) : null}

      {modelName ? (
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']} style={s.bottom}>
          <Text numberOfLines={1} style={s.model}>
            {modelName}
          </Text>
        </LinearGradient>
      ) : null}
    </Pressable>
  );
}

function TileVideo({ url }: { url: string }) {
  const s = useStyles();
  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  return <VideoView player={player} style={s.fill} contentFit="cover" nativeControls={false} pointerEvents="none" />;
}

const useStyles = makeStyles((c) => ({
  card: {
    width: '100%',
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  hero: { borderRadius: 26, borderColor: c.borderLight },
  pressed: { opacity: 0.88, transform: [{ scale: 0.975 }] },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  playBadge: {
    position: 'absolute',
    top: space.sm,
    right: space.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 8, paddingTop: 18, paddingBottom: 7 },
  model: { color: '#FFFFFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.2 },
}));
