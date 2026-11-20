import { tMaybe } from '@/i18n';
import type { GenKind } from './catalog';

/**
 * Presets are prompt templates: `{prompt}` is replaced with the user's text.
 * The server re-applies them by id, so a tampered client can't change the template.
 */
export type Preset = {
  id: string;
  kind: GenKind;
  label: string;
  template: string;
};

export const PRESETS: Preset[] = [
  { id: 'none-image', kind: 'image', label: 'None', template: '{prompt}' },
  {
    id: 'cinematic-still',
    kind: 'image',
    label: 'Cinematic',
    template: '{prompt}, cinematic film still, anamorphic lens, soft volumetric light, 35mm grain',
  },
  {
    id: 'product-shot',
    kind: 'image',
    label: 'Product',
    template: '{prompt}, studio product photography, seamless backdrop, softbox lighting, ultra sharp',
  },
  { id: 'none-video', kind: 'video', label: 'None', template: '{prompt}' },
  {
    id: 'dolly-in',
    kind: 'video',
    label: 'Dolly in',
    template: '{prompt}. Slow, smooth dolly-in camera move toward the subject.',
  },
  {
    id: 'orbit',
    kind: 'video',
    label: 'Orbit',
    template: '{prompt}. Camera orbits 180 degrees around the subject, steady and smooth.',
  },
  {
    id: 'handheld',
    kind: 'video',
    label: 'Handheld',
    template: '{prompt}. Handheld documentary camera, subtle natural shake.',
  },
];

export const presetsFor = (kind: GenKind) => PRESETS.filter((p) => p.kind === kind);

/** Preset name in the app language (falls back to the English label). */
export const presetLabel = (p: Preset) => tMaybe(`preset.${p.id}`, p.label);
