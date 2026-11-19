import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';
import { modelMode, type ModelInfo } from '@/lib/catalog';
import { makeStyles, radius, space } from '@/theme';

/** Horizontal-scroller card: fal.ai thumbnail, name and mode. The price shows on the Generate button. */
export function ModelCard({
  model,
  selected,
  onPress,
}: {
  model: ModelInfo;
  selected: boolean;
  onPress: () => void;
}) {
  const s = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${model.name}, ${model.credits} credits`}
      onPress={onPress}
      style={[s.card, selected && s.cardSelected]}
    >
      <View style={s.thumbWrap}>
        {model.thumbnail_url ? (
          <Image source={{ uri: model.thumbnail_url }} style={s.thumb} contentFit="cover" transition={150} />
        ) : (
          <View style={[s.thumb, s.thumbEmpty]} />
        )}
      </View>
      <Text numberOfLines={1} style={s.name}>
        {model.name}
      </Text>
      <Text numberOfLines={1} style={s.mode}>
        {modelMode(model)}
      </Text>
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  card: {
    width: 132,
    padding: 6,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
    backgroundColor: c.surface,
  },
  cardSelected: { borderColor: c.accent },
  thumbWrap: { borderRadius: radius.sm, overflow: 'hidden' },
  thumb: { width: '100%', aspectRatio: 1, backgroundColor: c.surfaceAlt },
  thumbEmpty: { backgroundColor: c.surfaceAlt },
  name: { color: c.text, fontSize: 14, fontWeight: '700', marginTop: space.sm, paddingHorizontal: 2 },
  mode: { color: c.textMuted, fontSize: 12, marginTop: 2, paddingHorizontal: 2, marginBottom: 2 },
}));
