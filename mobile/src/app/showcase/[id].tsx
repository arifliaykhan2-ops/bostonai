import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Linking, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActionItem, ActionList, DetailHeader, MediaCard, MediaVideo, PromptCard } from '@/components/DetailParts';
import { ScreenBackground } from '@/components/ScreenBackground';
import { PublishIcon, ScissorsIcon } from '@/components/Icons';
import { useModels } from '@/lib/catalog';
import { tileAspect, useShowcaseItem } from '@/lib/showcase';
import { makeStyles, space, useTheme } from '@/theme';

/** A trending community creation: watch it, read the prompt, remix it with our closest model. */
export default function ShowcaseDetailScreen() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { item, loading } = useShowcaseItem(id);
  const { models } = useModels();

  if (!item) {
    return (
      <View style={[s.container, s.center]}>
        {loading ? <ActivityIndicator /> : <Text style={s.muted}>This post is no longer in the feed.</Text>}
      </View>
    );
  }

  const model = models.find((m) => m.id === item.model_id);
  const remix = () =>
    router.push({ pathname: '/create', params: { model: item.model_id ?? undefined, prompt: item.prompt } });

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
        <DetailHeader
          title={item.author ? `@${item.author}` : 'Community creation'}
          subtitle={[item.base_model, `♥ ${item.likes.toLocaleString()}`].filter(Boolean).join(' · ')}
        />

        <MediaCard aspectRatio={tileAspect(item)}>
          {item.media_type === 'video' ? (
            <MediaVideo url={item.media_url} poster={item.preview_url} muted />
          ) : (
            <Image source={{ uri: item.media_url }} style={s.fill} contentFit="cover" transition={200} />
          )}
        </MediaCard>

        <ActionList>
          <ActionItem icon={<ScissorsIcon size={28} color={colors.text} strokeWidth={2.2} />} label="Remix" onPress={remix} />
          <ActionItem
            icon={<PublishIcon size={28} color={colors.text} strokeWidth={2.4} />}
            label="View original"
            onPress={() => void Linking.openURL(item.source_url)}
          />
        </ActionList>

        <PromptCard
          label="PROMPT"
          modelName={model ? `Try with ${model.name}` : undefined}
          credits={model?.credits}
          prompt={item.prompt}
          cta={model ? `Generate your own · ⚡ ${model.credits}` : 'Generate your own'}
          onCta={remix}
        />

        <Text style={s.attribution}>
          Created by {item.author ? `@${item.author}` : 'a community member'} on Civitai with {item.base_model ?? 'an AI model'}.
          {'\n'}Results with {model?.name ?? 'our models'} will differ — use it as a starting point.
        </Text>
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  container: { flex: 1, backgroundColor: c.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: space.md, gap: space.lg },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  muted: { color: c.textMuted, fontSize: 15 },
  attribution: { color: c.textSubtle, fontSize: 12, lineHeight: 18, textAlign: 'center' },
}));
