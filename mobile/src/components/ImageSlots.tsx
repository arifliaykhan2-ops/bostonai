import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Pressable, Text, View } from 'react-native';
import { SectionLabel } from '@/components/ui';
import type { ImageSlot } from '@/lib/pricing';
import { makeStyles, radius, space } from '@/theme';

/** Photo pickers for a model's inputs: start/end frame, or edit references. */
export function ImageSlots({
  slots,
  values,
  onChange,
}: {
  slots: ImageSlot[];
  values: Record<string, string>;
  onChange: (key: string, uri: string | null) => void;
}) {
  const s = useStyles();
  if (!slots.length) return null;

  async function pick(key: string) {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (!result.canceled) onChange(key, result.assets[0].uri);
  }

  // Optional reference slots appear one at a time, after the previous one is filled.
  const visible = slots.filter((slot, i) => slot.required || !slot.array || values[slots[i - 1]?.key]);

  return (
    <View>
      <SectionLabel>{slots[0].array || slots.length === 1 ? 'Photos' : 'Frames'}</SectionLabel>
      <View style={s.row}>
        {visible.map((slot) => {
          const uri = values[slot.key];
          return (
            <View key={slot.key} style={s.slotWrap}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={uri ? `Change ${slot.label}` : `Choose ${slot.label}`}
                onPress={() => pick(slot.key)}
                style={[s.slot, slot.required && !uri && s.slotRequired]}
              >
                {uri ? (
                  <Image source={{ uri }} style={s.fill} contentFit="cover" />
                ) : (
                  <Text style={s.plus}>+</Text>
                )}
              </Pressable>
              {uri && !slot.required && (
                <Pressable accessibilityLabel={`Remove ${slot.label}`} onPress={() => onChange(slot.key, null)} style={s.remove}>
                  <Text style={s.removeText}>×</Text>
                </Pressable>
              )}
              <Text numberOfLines={2} style={s.label}>
                {slot.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  row: { flexDirection: 'row', gap: space.sm },
  slotWrap: { width: 96 },
  slot: {
    aspectRatio: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: c.border,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  slotRequired: { borderColor: c.borderActive },
  fill: { position: 'absolute', inset: 0 },
  plus: { color: c.textMuted, fontSize: 28, fontWeight: '300' },
  label: { color: c.textMuted, fontSize: 12, marginTop: 6, textAlign: 'center' },
  remove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: { color: '#FFFFFF', fontSize: 18, lineHeight: 20 },
}));
