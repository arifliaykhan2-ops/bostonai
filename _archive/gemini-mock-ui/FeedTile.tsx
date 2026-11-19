import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Pressable, Text, View } from 'react-native';
import { isVideoUrl, modelMode, modeOf, type ModelInfo } from '@/lib/catalog';
import { MODE_COLORS } from '@/lib/palette';
import { makeStyles, radius, space } from '@/theme';

/**
 * One card in the Home feed: the model's sample output from fal.ai. Videos
 * only play while the tile is on screen (`active`) to keep scrolling smooth.
 */
export function FeedTile({
  model,
  active,
  tall,
  onPress,
}: {
  model: ModelInfo;
  active: boolean;
  tall: boolean;
  onPress: () => void;
}) {
  const s = useStyles();
  const color = MODE_COLORS[modeOf(model)];
  const example = model.example_url;
  const isVideo = !!example && isVideoUrl(example);
  const still = (!isVideo && example) || model.thumbnail_url;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${model.name}, ${modelMode(model)}. Open in Create`}
      onPress={onPress}
      style={({ pressed }) => [s.tile, { aspectRatio: tall ? 9 / 15 : 9 / 11 }, pressed && s.pressed]}
    >
      {still ? <Image source={{ uri: still }} style={s.fill} contentFit="cover" transition={200} /> : null}
      {isVideo && active ? <TileVideo url={example!} /> : null}

      <View style={[s.modePill, { backgroundColor: color.bg }]}>
        <Text style={[s.modeText, { color: color.text }]}>{modelMode(model)}</Text>
      </View>
      {isVideo && !active ? (
        <View style={s.playBadge}>
          <Text style={s.playText}>▶</Text>
        </View>
      ) : null}

      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={s.bottom}>
        <Text numberOfLines={1} style={s.name}>
          {model.name}
        </Text>
        <View style={s.metaRow}>
          <Text style={s.credits}>⚡ {model.credits}</Text>
          <Text style={[s.cta, { color: color.bg }]}>Try it →</Text>
        </View>
      </LinearGradient>
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
  tile: {
    flex: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: c.surfaceAlt,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  fill: { position: 'absolute', inset: 0 },
  modePill: {
    position: 'absolute',
    top: space.sm,
    left: space.sm,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  modeText: { fontSize: 11, fontWeight: '800' },
  playBadge: {
    position: 'absolute',
    top: space.sm,
    right: space.sm,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playText: { color: '#FFFFFF', fontSize: 11 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: space.sm, paddingTop: space.xl },
  name: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  credits: { color: '#C6FF3D', fontSize: 12, fontWeight: '700' },
  cta: { fontSize: 12, fontWeight: '800' },
}));
