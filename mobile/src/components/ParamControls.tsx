import { Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { Chip, SectionLabel } from '@/components/ui';
import { t } from '@/i18n';
import type { ParamSpec, ParamValues } from '@/lib/pricing';
import { makeStyles, radius, space, useTheme } from '@/theme';

const LABELS: Record<ParamSpec['kind'], string> = {
  duration: 'params.duration',
  aspect_ratio: 'params.aspectRatio',
  image_size: 'params.format',
  resolution: 'params.quality',
  audio: 'params.sound',
  negative_prompt: 'params.negative',
};

const IMAGE_SIZE_LABELS: Record<string, string> = {
  auto: 'params.auto',
  square_hd: 'params.squareHd',
  square: 'params.square',
  portrait_4_3: 'params.portrait34',
  portrait_16_9: 'params.portrait916',
  landscape_4_3: 'params.landscape43',
  landscape_16_9: 'params.landscape169',
};

function optionLabel(spec: ParamSpec, value: string | number): string {
  if (spec.kind === 'duration') return value === 'auto' ? t('params.auto') : t('params.seconds', { n: value });
  if (spec.kind === 'image_size') {
    const key = IMAGE_SIZE_LABELS[String(value)];
    return key ? t(key) : String(value);
  }
  if (value === 'auto' || value === 'adaptive') return t('params.auto');
  return String(value);
}

/** Renders every option the model's fal.ai schema exposes (see ParamSpec). */
export function ParamControls({
  specs,
  values,
  onChange,
}: {
  specs: ParamSpec[];
  values: ParamValues;
  onChange: (key: string, value: string | number | boolean) => void;
}) {
  const s = useStyles();
  const { colors } = useTheme();
  const ordered = [...specs].sort((a, b) => order(a) - order(b));

  return (
    <View style={s.wrap}>
      {ordered.map((spec) => {
        const value = values[spec.key] ?? spec.default;
        return (
          <View key={spec.key} style={s.row}>
            {spec.type === 'boolean' ? (
              <BooleanRow spec={spec} value={value === true} onChange={(v) => onChange(spec.key, v)} />
            ) : (
              <>
                <SectionLabel>{t(LABELS[spec.kind])}</SectionLabel>
                {spec.type === 'enum' && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
                    {spec.options!.map((o) => (
                      <Chip
                        key={String(o)}
                        label={optionLabel(spec, o)}
                        selected={String(value) === String(o)}
                        onPress={() => onChange(spec.key, o)}
                      />
                    ))}
                  </ScrollView>
                )}
                {spec.type === 'range' && (
                  <Stepper
                    value={Number(value)}
                    min={spec.min ?? 1}
                    max={spec.max ?? 60}
                    suffix={spec.kind === 'duration' ? 's' : ''}
                    onChange={(v) => onChange(spec.key, v)}
                  />
                )}
                {spec.type === 'text' && (
                  <TextInput
                    value={String(value)}
                    onChangeText={(t) => onChange(spec.key, t)}
                    placeholder={t('params.negativePlaceholder')}
                    placeholderTextColor={colors.textMuted}
                    maxLength={500}
                    style={s.text}
                  />
                )}
              </>
            )}
          </View>
        );
      })}
    </View>
  );
}

function order(spec: ParamSpec) {
  return ['duration', 'aspect_ratio', 'image_size', 'resolution', 'audio', 'negative_prompt'].indexOf(spec.kind);
}

function BooleanRow({ spec, value, onChange }: { spec: ParamSpec; value: boolean; onChange: (v: boolean) => void }) {
  const s = useStyles();
  const { colors } = useTheme();
  return (
    <View style={s.boolRow}>
      <View style={{ flex: 1 }}>
        <Text style={s.boolLabel}>{t(LABELS[spec.kind])}</Text>
        {spec.kind === 'audio' && <Text style={s.boolHint}>Native audio and voices · costs more</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.accent, false: colors.surfaceAlt }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

function Stepper({
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  suffix: string;
  onChange: (v: number) => void;
}) {
  const s = useStyles();
  return (
    <View style={s.stepper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('params.decrease')}
        disabled={value <= min}
        onPress={() => onChange(Math.max(min, value - 1))}
        style={[s.stepBtn, value <= min && s.stepDisabled]}
      >
        <Text style={s.stepBtnText}>−</Text>
      </Pressable>
      <Text style={s.stepValue}>
        {value}
        {suffix}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('params.increase')}
        disabled={value >= max}
        onPress={() => onChange(Math.min(max, value + 1))}
        style={[s.stepBtn, value >= max && s.stepDisabled]}
      >
        <Text style={s.stepBtnText}>+</Text>
      </Pressable>
      <Text style={s.stepRange}>
        {min}–{max}
        {suffix}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: { gap: space.md },
  row: {},
  chips: { gap: space.sm, paddingVertical: 2 },
  text: {
    backgroundColor: c.surface,
    borderColor: c.border,
    borderWidth: 1,
    borderRadius: radius.md,
    color: c.text,
    fontSize: 15,
    paddingHorizontal: space.md,
    minHeight: 46,
  },
  boolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderColor: c.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    minHeight: 56,
  },
  boolLabel: { color: c.text, fontSize: 15, fontWeight: '700' },
  boolHint: { color: c.textMuted, fontSize: 12, marginTop: 2 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  stepDisabled: { opacity: 0.35 },
  stepBtnText: { color: c.text, fontSize: 22, fontWeight: '600' },
  stepValue: { color: c.text, fontSize: 22, fontWeight: '800', minWidth: 48, textAlign: 'center' },
  stepRange: { color: c.textMuted, fontSize: 12 },
}));
