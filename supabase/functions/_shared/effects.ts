// public.effects rows: Home trend templates, Apps tools and result actions.
// Builds the fal input for one run. Used by `generate` (user jobs) and
// `seed-effect-previews` (example videos).

export type Choice = {
  field: string;
  label: string;
  default: string | number;
  options: { value: string | number; label: string }[];
};

export type EffectRow = {
  id: string;
  endpoint: string;
  field: string;
  value: string;
  image_field: string;
  image_array: boolean;
  extra: Record<string, unknown>;
  title: string;
  credits: number;
  preview_url: string | null;
  preview_request: string | null;
  category: string;
  /** trend = Home template, app = Apps tool, action = runs on a finished job */
  section: 'trend' | 'app' | 'action';
  /** Output media. */
  kind: 'video' | 'image';
  /** photo = the user uploads one; job_image / job_video = the output of one of their jobs */
  input_kind: 'photo' | 'job_image' | 'job_video';
  choices: Choice[];
  /** Optional second photo, e.g. the garment for try-on. */
  image2: { field: string; label: string } | null;
  /** A script the user types (Talking Photo); priced per character. */
  text_input: TextInput | null;
  /** Speak the script first; the audio URL goes to the main endpoint as `audio_field`. */
  tts: { endpoint: string; text_field: string; voice_field: string; audio_field: string } | null;
  /** The user must confirm the photo is them or that they have permission. */
  requires_consent: boolean;
  /** Optional extra photos appended to the image_field array (Photoshoot references). */
  more_photos: number;
  /** A short video the user uploads (Recast). */
  video_input: { field: string; label: string; max_seconds: number } | null;
};

export type TextInput = {
  field: string;
  label: string;
  placeholder?: string;
  max: number;
  credits_per_char: number;
  /** The user must confirm the photo is them or that they have permission. */
  consent?: boolean;
  /** Text seed-effect-previews uses to render the example (e.g. "table" for Object Eraser). */
  sample?: string;
};

/** Credits for one run: the row's base price, plus the script's length when it has one. */
export function effectCost(effect: Pick<EffectRow, 'credits' | 'text_input'>, text = ''): number {
  if (!effect.text_input) return effect.credits;
  return effect.credits + Math.ceil(text.trim().length * effect.text_input.credits_per_char);
}

export const EFFECT_COLUMNS =
  'id, endpoint, field, value, image_field, image_array, extra, title, credits, preview_url, preview_request, category, section, kind, input_kind, choices, image2, text_input, tts, requires_consent, more_photos, video_input';

export const VIDU_ENDPOINT = 'fal-ai/vidu/template-to-video';
/** Kling's public Effects Center CDN: effects_video/<effect_scene>.mp4, effects_cover/<effect_scene>.png */
export const KLING_DEMO_BASE = 'https://v15-kling.klingai.com/kos/s101/nlav112372/kling-op';

/**
 * Vidu templates we never show: adult/suggestive, de-aging or child photos,
 * violence, branded characters and real people. Applies to new templates
 * found by sync-effects too (exact ids, then keywords for ones we haven't seen).
 */
export const BLOCKED_TEMPLATES = new Set([
  'sexy_me', 'clevage', 'jiggle_up', 'pole_dance', 'hip_flicking', 'get_thinner', 'hip_twist',
  'youth_rewind', 'eat_mushrooms', 'child_memory', 'punch_hit', 'balloonman_explodes_pro',
  'ghibli', 'minecraft', 'simpsons_comic', 'jojo_style', 'yayoi_kusama_style', 'irasutoya',
  'captain_america', 'hulk', 'cap_walk', 'hulk_dive', 'superman', 'fly_with_doraemon', 'squid_game',
  'ladudu_me', 'ladudu_me_random', 'pubg_winner_hit', 'heeseung_march', 'kwok_dance', 'pet_finger',
  'wish_sender', 'zoom_out_startend', 'kiss', 'lunar_newyear',
  // Kling: alcohol, fight, film character, made-up partner, and two-person effects that need a second photo.
  'drunk_dance', 'drunk_dance_pet', 'first_toast_of_the_year', 'cheers_2026', 'fight_pro', 'nezha',
  'girlfriend', 'boyfriend', 'hug_pro', 'kiss_pro', 'heart_gesture_pro',
]);
const BLOCKED_WORDS =
  /sexy|cleav|bikini|lingerie|nude|naked|boob|busty|jiggle|twerk|pole_dance|get_thinner|child|kid|baby|young|youth|teen|school|punch|blood|gun|kill|marvel|disney|pixar|ghibli|doraemon|pokemon|naruto|labubu|ladudu|squid|pubg|fortnite|minecraft|simpson|hulk|superman|batman|spider/;

export function isAllowedTemplate(value: string): boolean {
  return !BLOCKED_TEMPLATES.has(value) && !BLOCKED_WORDS.test(value);
}

/** "jump_to_cloud" → "Jump To Cloud" */
export const humanize = (value: string) =>
  value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\s+/g, ' ').trim();

/**
 * The user's picks for an effect's choices, each checked against the listed
 * options (the default when missing). Returns null if any value isn't allowed.
 */
export function resolveChoices(effect: EffectRow, picked: Record<string, unknown> | undefined): Record<string, unknown> | null {
  const out: Record<string, unknown> = {};
  for (const c of effect.choices ?? []) {
    const value = picked?.[c.field] ?? c.default;
    if (!c.options.some((o) => o.value === value)) return null;
    out[c.field] = value;
  }
  return out;
}

/** Signed URLs for one run's inputs. */
export type InputUrls = { photo: string; photo2?: string; more?: string[]; video?: string };

/**
 * fal input for one run. Fixed extras first, so the effect, the choices and the
 * inputs can never be overridden by them. Only trend templates send their
 * selector field (`template` / `effect_scene`); apps and actions are one endpoint each.
 */
export function buildEffectInput(
  effect: EffectRow,
  urls: InputUrls,
  choices: Record<string, unknown> = {},
  text = '',
): Record<string, unknown> {
  // A second photo that goes into the same array as the first (Face Swap: [face, target]).
  const photo2InArray = effect.image_array && effect.image2?.field === effect.image_field;
  const photos = [urls.photo, ...(photo2InArray && urls.photo2 ? [urls.photo2] : []), ...(urls.more ?? [])];
  // The user's text goes straight to the endpoint (Object Eraser), unless the server
  // speaks it first (Talking Photo) or keeps it for itself ("__" fields).
  const directText = effect.text_input && !effect.tts && !effect.text_input.field.startsWith('__') && text;
  return {
    ...effect.extra,
    // "__" choices (e.g. the TTS voice) are for the server, not the endpoint.
    ...Object.fromEntries(Object.entries(choices).filter(([k]) => !k.startsWith('__'))),
    ...(effect.section === 'trend' ? { [effect.field]: effect.value } : {}),
    ...(directText ? { [effect.text_input!.field]: directText } : {}),
    ...(effect.image2 && urls.photo2 && !photo2InArray ? { [effect.image2.field]: urls.photo2 } : {}),
    [effect.image_field]: effect.image_array ? photos : urls.photo,
    ...(effect.video_input && urls.video ? { [effect.video_input.field]: urls.video } : {}),
  };
}
