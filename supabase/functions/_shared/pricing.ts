// Shared by the Edge Functions (Deno) and the mobile app (Metro) — keep this
// file free of imports and runtime-specific APIs.
//
// One formula decides what a generation costs, so the price the app shows is
// exactly what the server charges.

/** A user-adjustable option read from the model's fal.ai input schema. */
export type ParamSpec = {
  key: string; // fal input field, e.g. "duration"
  kind: 'duration' | 'aspect_ratio' | 'resolution' | 'audio' | 'negative_prompt' | 'image_size';
  type: 'enum' | 'range' | 'boolean' | 'text';
  options?: (string | number)[];
  min?: number;
  max?: number;
  default: string | number | boolean;
};

/** A photo the user uploads; several slots may feed one array field. */
export type ImageSlot = {
  key: string; // "start" | "end" | "photo1" | …
  field: string; // fal input field
  array: boolean;
  required: boolean;
  label: string;
};

export type PricingInfo = {
  unit_price: number | null;
  unit: string | null;
  fallback_credits: number; // credits at default settings when fal's price is unknown
  default_seconds: number; // 0 for images
  default_resolution: string | null;
  min_credits: number;
};

export type ParamValues = Record<string, string | number | boolean>;

export const CREDIT_USD = 0.01;
export const COST_MARGIN = 1.25;
const AUDIO_MULTIPLIER = 1.5;

/** Approximate frame height for labels like "720p", "768P", "2K", "0.5K". */
export function resolutionHeight(label: string | null | undefined): number | undefined {
  if (!label) return undefined;
  const p = /^(\d{3,4})\s*p$/i.exec(label.trim());
  if (p) return Number(p[1]);
  const k = /^(\d+(?:\.\d+)?)\s*k$/i.exec(label.trim());
  if (k) {
    const n = Number(k[1]);
    return n === 2 ? 1440 : n === 4 ? 2160 : Math.round(n * 1080);
  }
  return undefined;
}

export function secondsFrom(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Fills in defaults for every param the user didn't set. */
export function withDefaults(specs: ParamSpec[], values: ParamValues | undefined): ParamValues {
  const out: ParamValues = {};
  for (const s of specs) out[s.key] = values?.[s.key] ?? s.default;
  return out;
}

/**
 * Credits for one generation with the given settings.
 * - per-second prices scale with the chosen duration
 * - higher-than-default resolution costs more ((h / h_default)^1.5); lower never costs less
 * - audio on costs ×1.5 (fal's unit price is usually the silent tier)
 */
export function quoteCredits(pricing: PricingInfo, specs: ParamSpec[], values: ParamValues | undefined): number {
  const v = withDefaults(specs, values);
  const durationSpec = specs.find((s) => s.kind === 'duration');
  const seconds = durationSpec ? secondsFrom(v[durationSpec.key], pricing.default_seconds) : pricing.default_seconds;

  const resSpec = specs.find((s) => s.kind === 'resolution');
  const hDefault = resolutionHeight(pricing.default_resolution);
  const hChosen = resSpec ? resolutionHeight(String(v[resSpec.key])) : undefined;
  const resMult = hDefault && hChosen && hChosen > hDefault ? Math.pow(hChosen / hDefault, 1.5) : 1;

  const audioSpec = specs.find((s) => s.kind === 'audio');
  const audioMult = audioSpec && v[audioSpec.key] === true ? AUDIO_MULTIPLIER : 1;

  const unit = pricing.unit?.toLowerCase() ?? '';
  const perSecond = unit.includes('second');
  const flat = unit.includes('image') || unit.includes('megapixel') || unit.includes('video') || unit.includes('request');

  let credits: number;
  if (pricing.unit_price && pricing.unit_price > 0 && (perSecond || flat)) {
    const usd = pricing.unit_price * (perSecond ? seconds : 1) * resMult * audioMult;
    // Round away float noise (0.14 × 10 × 1.25 / 0.01 = 175.00000000000003) before ceil.
    credits = Math.ceil(Number(((usd * COST_MARGIN) / CREDIT_USD).toFixed(6)));
  } else {
    const durationMult = pricing.default_seconds > 0 ? seconds / pricing.default_seconds : 1;
    credits = Math.ceil(Number((pricing.fallback_credits * durationMult * resMult * audioMult).toFixed(6)));
  }
  return Math.max(pricing.min_credits, credits);
}

/** Returns an error message if a value isn't allowed by its spec. */
export function validateParams(specs: ParamSpec[], values: Record<string, unknown> | undefined): string | null {
  for (const [key, value] of Object.entries(values ?? {})) {
    const s = specs.find((x) => x.key === key);
    if (!s) return `unknown option ${key}`;
    if (s.type === 'enum' && !s.options?.includes(value as string | number)) return `invalid ${key}`;
    if (s.type === 'range') {
      if (typeof value !== 'number' || !Number.isInteger(value)) return `invalid ${key}`;
      if ((s.min !== undefined && value < s.min) || (s.max !== undefined && value > s.max)) return `invalid ${key}`;
    }
    if (s.type === 'boolean' && typeof value !== 'boolean') return `invalid ${key}`;
    if (s.type === 'text' && (typeof value !== 'string' || value.length > 500)) return `invalid ${key}`;
  }
  return null;
}
