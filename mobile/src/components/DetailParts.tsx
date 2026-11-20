import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useState, type PropsWithChildren, type ReactNode } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { ChevronLeftIcon } from '@/components/Icons';
import { Button } from '@/components/ui';
import { fonts, makeStyles, radius, space, useTheme } from '@/theme';
import { isRTL, t } from '@/i18n';

/** Shared building blocks for the Showcase and Result detail screens. */

export function DetailHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  const s = useStyles();
  const { colors } = useTheme();
  return (
    <View style={s.headerRow}>
      <View style={s.headerLeft}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          style={({ pressed }) => [s.backButton, pressed && s.pressed]}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <ChevronLeftIcon
            size={22}
            color={colors.text}
            strokeWidth={2.4}
            style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined}
          />
        </Pressable>
        <View style={s.titleGroup}>
          <Text numberOfLines={1} style={s.title}>
            {title}
          </Text>
          {subtitle ? (
            <Text numberOfLines={1} style={s.subtitle}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      {right}
    </View>
  );
}

export function MediaCard({ aspectRatio = 1, children }: PropsWithChildren<{ aspectRatio?: number }>) {
  const s = useStyles();
  return <View style={[s.mediaCard, { aspectRatio }]}>{children}</View>;
}

/** Looping video that fills its MediaCard; `poster` shows while it buffers. */
export function MediaVideo({ url, poster, muted = false }: { url: string; poster?: string | null; muted?: boolean }) {
  const s = useStyles();
  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
    p.muted = muted;
    p.play();
  });
  return (
    <View style={s.fill}>
      {poster ? <Image source={{ uri: poster }} style={s.fill} contentFit="cover" /> : null}
      <VideoView player={player} style={s.video} contentFit="cover" nativeControls />
    </View>
  );
}

export function ActionItem({ icon, label, onPress }: { icon: ReactNode; label: string; onPress: () => void }) {
  const s = useStyles();
  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [s.actionItem, pressed && s.actionPressed]}
      accessibilityRole="button"
    >
      {icon}
      <Text style={s.actionText}>{label}</Text>
    </Pressable>
  );
}

export function ActionList({ children }: PropsWithChildren) {
  const s = useStyles();
  return <View style={s.actionsList}>{children}</View>;
}

/** Model pill, cost, the full prompt with copy, and the main call to action. */
export function PromptCard({
  label,
  modelName,
  credits,
  prompt,
  cta,
  onCta,
}: {
  label: string;
  modelName?: string;
  credits?: number;
  prompt: string;
  cta: string;
  onCta: () => void;
}) {
  const s = useStyles();
  const [copied, setCopied] = useState(false);

  async function copy() {
    await Clipboard.setStringAsync(prompt);
    if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <View style={s.metaCard}>
      {(modelName || credits !== undefined) && (
        <View style={s.metaTopRow}>
          {modelName ? (
            <View style={s.modelPill}>
              <Text style={s.modelNameText}>{modelName}</Text>
            </View>
          ) : (
            <View />
          )}
          {credits !== undefined ? <Text style={s.metaCredits}>⚡ {credits} credits</Text> : null}
        </View>
      )}

      <View style={s.promptBox}>
        <Text style={s.promptLabel}>{label}</Text>
        <Text selectable style={s.promptText}>
          {prompt}
        </Text>
        <Pressable onPress={copy} style={({ pressed }) => [s.copyBtn, pressed && s.pressed]} accessibilityRole="button">
          <Text style={s.copyBtnText}>{copied ? `✓ ${t('common.copied')}` : t('common.copyPrompt')}</Text>
        </Pressable>
      </View>

      <Button title={cta} onPress={onCta} style={{ height: 54, marginTop: 4 }} />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flex: 1, paddingRight: space.sm },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surfaceAlt,
  },
  pressed: { opacity: 0.8, transform: [{ scale: 0.96 }] },
  titleGroup: { flex: 1, gap: 1 },
  title: { fontFamily: fonts.display, color: c.text, fontSize: 24, lineHeight: 26, textTransform: 'uppercase' },
  subtitle: { color: c.textMuted, fontSize: 12, fontWeight: '500' },
  mediaCard: {
    width: '100%',
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  video: { width: '100%', height: '100%' },
  actionsList: { gap: 18, paddingVertical: space.xs, paddingHorizontal: space.xs },
  actionItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 2 },
  actionPressed: { opacity: 0.7, transform: [{ translateX: 4 }] },
  actionText: { color: c.text, fontSize: 27, fontWeight: '800', letterSpacing: -0.6 },
  metaCard: {
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: space.md,
    gap: space.md,
  },
  metaTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modelPill: {
    backgroundColor: 'rgba(212, 255, 46, 0.14)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(212, 255, 46, 0.3)',
  },
  modelNameText: { color: c.accentInk, fontSize: 13, fontWeight: '800' },
  metaCredits: { color: c.text, fontSize: 13, fontWeight: '700' },
  promptBox: {
    backgroundColor: c.surfaceAlt,
    borderRadius: radius.md,
    padding: space.md,
    borderWidth: 1,
    borderColor: c.border,
    gap: 8,
  },
  promptLabel: { color: c.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  promptText: { color: c.text, fontSize: 14, lineHeight: 21 },
  copyBtn: {
    alignSelf: 'flex-start',
    backgroundColor: c.surface,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 4,
    borderWidth: 1,
    borderColor: c.border,
  },
  copyBtnText: { color: c.accentInk, fontSize: 12, fontWeight: '700' },
}));
