import type { PropsWithChildren } from 'react';
import { ActivityIndicator, Pressable, Text, View, type ViewStyle } from 'react-native';
import { fonts, makeStyles, space, useTheme } from '@/theme';

/**
 * Building blocks styled after the web app's components (web/src/components/ui):
 * Button (lime + 3D edge), Chip and Segmented (white when active), Card (14px, line
 * border), Tag (lime label) and PageHeader (condensed display title, like PageIntro).
 */

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
};

export function Button({ title, onPress, variant = 'primary', disabled, loading, style }: ButtonProps) {
  const s = useStyles();
  const { colors } = useTheme();
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        s.button,
        isPrimary ? s.primary : variant === 'danger' ? s.dangerBtn : s.secondary,
        (disabled || loading) && s.disabled,
        pressed && (isPrimary ? s.primaryPressed : s.pressed),
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.accentText : colors.text} />
      ) : (
        <Text style={[s.buttonText, isPrimary && s.primaryText, variant === 'danger' && s.dangerText]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const s = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[s.chip, selected && s.chipSelected]}
    >
      <Text style={[s.chipText, selected && s.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) {
  const s = useStyles();
  return <View style={[s.card, style]}>{children}</View>;
}

export function SectionLabel({ children }: PropsWithChildren) {
  const s = useStyles();
  return <Text style={s.sectionLabel}>{children}</Text>;
}

/** Small corner label: lime ("TREND", "NEW") or violet ("PRO"). */
export function Tag({ label, tone = 'lime', style }: { label: string; tone?: 'lime' | 'pro'; style?: ViewStyle }) {
  const s = useStyles();
  return (
    <View style={[s.tag, tone === 'pro' && s.tagPro, style]}>
      <Text style={[s.tagText, tone === 'pro' && s.tagTextPro]}>{label}</Text>
    </View>
  );
}

/** Top of every tab: condensed uppercase title + muted line (the web's PageIntro, left-aligned). */
export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const s = useStyles();
  return (
    <View style={s.pageHeader}>
      <Text style={s.pageTitle} accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? (
        <Text numberOfLines={2} style={s.pageSubtitle}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const s = useStyles();
  return (
    <View style={s.segment}>
      {options.map((o) => (
        <Pressable
          key={o.value}
          accessibilityRole="button"
          accessibilityState={{ selected: value === o.value }}
          onPress={() => onChange(o.value)}
          style={[s.segmentItem, value === o.value && s.segmentItemActive]}
        >
          <Text style={[s.segmentText, value === o.value && s.segmentTextActive]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  button: {
    minHeight: 52,
    borderRadius: 12,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Web btn-shadow: a 3px lime-dark edge under the button plus a soft lime glow.
  primary: {
    backgroundColor: c.accent,
    borderBottomWidth: 3,
    borderBottomColor: c.accentDark,
    shadowColor: c.accent,
    shadowOpacity: 0.25,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 0 },
  },
  primaryPressed: { borderBottomWidth: 1, transform: [{ translateY: 2 }] },
  secondary: { backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.border },
  dangerBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255, 46, 136, 0.5)' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.8 },
  buttonText: { color: c.text, fontSize: 16, fontWeight: '600' },
  primaryText: { color: c.accentText, fontWeight: '800' },
  dangerText: { color: c.danger },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: c.surfaceRaised,
  },
  chipSelected: { backgroundColor: '#FFFFFF' },
  chipText: { color: c.textSoft, fontSize: 13, fontWeight: '500' },
  chipTextSelected: { color: '#000000' },
  card: {
    backgroundColor: c.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border,
    padding: space.md,
  },
  sectionLabel: {
    color: c.textMuted,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: space.xs,
  },
  tag: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: c.accent,
  },
  tagPro: { backgroundColor: c.violet },
  tagText: { color: '#000000', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  tagTextPro: { color: '#FFFFFF' },
  pageHeader: { gap: 10, marginBottom: space.md },
  // Web `display`: Archivo, 72% width, black, uppercase; PageIntro uses leading 0.9.
  pageTitle: {
    fontFamily: fonts.display,
    color: c.text,
    fontSize: 44,
    lineHeight: 42,
    letterSpacing: -0.4,
    textTransform: 'uppercase',
    paddingTop: 4,
  },
  pageSubtitle: { color: c.textMuted, fontSize: 16, lineHeight: 22 },
  segment: {
    flexDirection: 'row',
    backgroundColor: c.surface,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: c.border,
  },
  segmentItem: { flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center' },
  segmentItemActive: { backgroundColor: '#FFFFFF' },
  segmentText: { color: c.textMuted, fontWeight: '600', fontSize: 14 },
  segmentTextActive: { color: '#000000' },
}));
