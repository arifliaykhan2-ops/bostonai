// Pure helpers for sync-showcase: safety filtering and mapping a Civitai
// post's base model to the closest model in our catalog. No Deno APIs.

export type CivitaiItem = {
  id: number;
  url: string;
  type: 'image' | 'video' | string;
  width?: number | null;
  height?: number | null;
  nsfw?: boolean;
  nsfwLevel?: string;
  browsingLevel?: number;
  postId?: number;
  username?: string | null;
  baseModel?: string | null;
  thumbnail?: { url?: string | null } | null;
  stats?: Record<string, number>;
  meta?: { prompt?: string; negativePrompt?: string; images?: unknown[]; [k: string]: unknown } | null;
};

/**
 * Words that keep a post out of the feed even when Civitai rates it PG — the
 * app is rated for a general audience and the prompt is shown in full.
 */
const BLOCKED = [
  'nude', 'naked', 'nsfw', 'sex', 'porn', 'erotic', 'topless', 'lingerie', 'underwear', 'bikini',
  'breast', 'boob', 'nipple', 'cleavage', 'butt', 'ass ', 'thong', 'fetish', 'bdsm', 'hentai',
  'gore', 'blood', 'corpse', 'dead body', 'decapitat', 'suicide', 'self-harm', 'drug', 'cocaine',
  'busty', 'sexy', 'seductive', 'sensual',
  'nazi', 'swastika', 'loli', 'child', 'teen', 'young girl', 'young boy', 'little girl', 'little boy', 'toddler', 'schoolgirl', 'minor',
  'celebrity', 'trump', 'biden', 'taylor swift', 'elon musk',
  // Well-known copyrighted characters/franchises — remixing them isn't something we should promote.
  'frieren', 'pokemon', 'pikachu', 'disney', 'pixar', 'marvel', 'spider-man', 'spiderman', 'batman',
  'superman', 'mickey', 'naruto', 'goku', 'dragon ball', 'one piece', 'harry potter', 'star wars',
  'ghibli', 'genshin', 'zelda', 'mario', 'sonic', 'shrek', 'hello kitty',
  'luffy', 'zoro', 'sasuke', 'gojo', 'jujutsu', 'evangelion', 'asuka', 'hatsune', 'miku', 'sailor moon',
  'totoro', 'spongebob', 'simpsons', 'minion', 'transformers', 'avengers', 'iron man', 'joker',
];

/** Prompts written for a source image ("<Picture 1>", "keep the exact look…"). */
const NEEDS_SOURCE_IMAGE = /<\s*picture|picture \d|reference image|source image|input image|keep the exact|frame defined by|from the image|target video/i;

export function needsSourceImage(prompt: string): boolean {
  return NEEDS_SOURCE_IMAGE.test(prompt);
}

export function isSafe(item: CivitaiItem): boolean {
  if (item.nsfw) return false;
  if (item.nsfwLevel && item.nsfwLevel !== 'None') return false;
  if (item.browsingLevel !== undefined && item.browsingLevel !== 1) return false;
  const text = `${item.meta?.prompt ?? ''} ${item.meta?.negativePrompt ?? ''}`.toLowerCase();
  return !BLOCKED.some((w) => text.includes(w));
}

/** Readable prompt: civitai prompts may carry weights like "(word:1.2)" — keep them, trim noise. */
export function cleanPrompt(p: string): string {
  return p.replace(/\s+/g, ' ').trim().slice(0, 1000);
}

type Rule = { match: RegExp; video?: { t2v: string; i2v?: string }; image?: string };

/** Civitai base model → our catalog endpoints. First match wins. */
const RULES: Rule[] = [
  { match: /minimax|hailuo/i, video: { t2v: 'minimax/h3/text-to-video', i2v: 'minimax/h3/image-to-video' } },
  { match: /kling/i, video: { t2v: 'kling/v4/text-to-video', i2v: 'kling/v4/image-to-video' } },
  { match: /seedance/i, video: { t2v: 'bytedance/seedance-2.0/fast/text-to-video', i2v: 'bytedance/seedance-2.0/fast/image-to-video' } },
  { match: /wan/i, video: { t2v: 'alibaba/wan-3.0/text-to-video', i2v: 'alibaba/wan-3.0/image-to-video' } },
  { match: /grok/i, video: { t2v: 'xai/grok-imagine-video/v1.5/text-to-video' } },
  { match: /ltx/i, video: { t2v: 'lightricks/ltx-2.5/text-to-video/fast' } },
  { match: /veo|gemini/i, video: { t2v: 'google/gemini-omni-flash/v1.2/text-to-video', i2v: 'google/gemini-omni-flash/v1.2/image-to-video' } },
  { match: /pixverse/i, video: { t2v: 'kling/v4/text-to-video', i2v: 'fal-ai/pixverse/v6/image-to-video' } },
  { match: /nano.?banana|imagen|gemini/i, image: 'fal-ai/nano-banana-2' },
  { match: /openai|gpt|dall/i, image: 'openai/gpt-image-2' },
  { match: /seedream/i, image: 'bytedance/seedream/v5.5/text-to-image' },
  { match: /ideogram/i, image: 'fal-ai/ideogram/v3' },
  { match: /recraft/i, image: 'fal-ai/recraft/v3/text-to-image' },
  { match: /flux.?(2|\.2)|flux 2/i, image: 'fal-ai/flux-2-pro' },
  { match: /flux/i, image: 'blackforestlabs/flux-3/text-to-image' },
];

/** Fallbacks when the base model is unknown (SDXL, Krea, Pony, …). */
const DEFAULT_IMAGE = 'fal-ai/flux-2-pro';
const DEFAULT_VIDEO = 'minimax/h3/text-to-video';

/**
 * Picks our closest model. Posts made from a reference image map to the
 * image-to-video variant, but only when it exists in our catalog.
 */
export function mapModel(item: CivitaiItem, available: Set<string>): string | null {
  const isVideo = item.type === 'video';
  const usedImage =
    (Array.isArray(item.meta?.images) && item.meta!.images!.length > 0) || needsSourceImage(item.meta?.prompt ?? '');
  const base = item.baseModel ?? '';
  for (const rule of RULES) {
    if (!rule.match.test(base)) continue;
    if (isVideo && rule.video) {
      const pick = usedImage && rule.video.i2v ? rule.video.i2v : rule.video.t2v;
      if (available.has(pick)) return pick;
    }
    if (!isVideo && rule.image && available.has(rule.image)) return rule.image;
  }
  const fallback = isVideo ? DEFAULT_VIDEO : DEFAULT_IMAGE;
  return available.has(fallback) ? fallback : null;
}

/**
 * Civitai's CDN resizes and transcodes from URL options:
 * https://image.civitai.com/<key>/<uuid>/<options>/<file>
 */
export function civitaiMedia(url: string, type: 'image' | 'video') {
  const base = url.split('/').slice(0, 5).join('/'); // https: / '' / host / key / uuid
  if (type === 'video') {
    return {
      media_url: `${base}/transcode=true,width=720/video.mp4`,
      preview_url: `${base}/anim=false,transcode=true,width=450/poster.webp`,
      preview_video_url: `${base}/transcode=true,width=450/preview.mp4`,
    };
  }
  return {
    media_url: `${base}/width=1080/image.jpeg`,
    preview_url: `${base}/width=450/image.jpeg`,
    preview_video_url: null,
  };
}

export function likesOf(item: CivitaiItem): number {
  const s = item.stats ?? {};
  return (s.likeCount ?? 0) + (s.heartCount ?? 0) + (s.laughCount ?? 0) + (s.cryCount ?? 0);
}

export type ShowcaseRow = {
  id: string;
  source: 'civitai';
  media_type: 'image' | 'video';
  media_url: string;
  preview_url: string | null;
  preview_video_url: string | null;
  width: number | null;
  height: number | null;
  prompt: string;
  negative_prompt: string | null;
  base_model: string | null;
  model_id: string;
  author: string | null;
  source_url: string;
  likes: number;
};

// ── Style classification: the main feed is photoreal with people first; anime gets its own tab ──

/** Always anime/cartoon, even next to "photorealistic" (booru tags, anime words, character archetypes). */
const ANIME_STRONG = /\b(anime\w*|manga|chibi|cartoon\w*|toon|cel[- ]?shad\w*|2d|waifu|husbando|kawaii|vtuber|webtoon|comic\w*|cel animation|pixar|disney style|ghibli style|isekai|shoujo|shojo|shonen|shounen|bishoujo|bishounen|moe|\d+(girl|boy)s?|multiple (girls|boys)|cat ?girl|fox ?girl|bunny ?girl|wolf ?girl|monster ?girl|kemonomimi|nekomimi|animal ears|cat ears|fox ears|ahoge|twintails|score_\d\w*|source_(anime|cartoon|pony)|rating_\w+|bande dessin\w*|pixel art|lowpoly|low poly|furry|anthropomorphic|plush\w*|lego|figurine|nendoroid|doodle|storybook|picture.?book|children's book|cutesy)\b/i;
/** Non-English anime/illustration words (no \b: CJK has no word boundaries). */
const ANIME_INTL = /アニメ|イラスト|漫画|マンガ|まんが|二次元|动漫|動漫|动画风|插画|插畫|卡通|手描き|手绘|手繪|水彩|애니|일러스트|만화|аниме|мульт/i;
/** An art medium is named: art, unless the prompt also asks for a photo / camera ("realistic oil painting" stays art). */
const ART_MEDIUM = /\b(illustrat\w*|lineart|line ?art|line-?work|sketch\w*|watercolou?r|painting|painted|painterly|brushwork|brush ?strokes|oil paint\w*|drawing|hand.?drawn|digitally drawn|draw (?:a|an|me)|ink wash|inked|sumi-?e|ukiyo-?e|gouache|crayon|colou?red.?pencil|concept art|digital art|fantasy art|game art|key ?visual|art style|style art|studio style|3d render|clay\w*|claymation|stop.?motion|felt (?:toy|puppet|craft)|needle.?felt\w*|paper ?craft|paper.?cut\w*|origami|vector|flat colou?rs?|halftone|risograph|engraving|semi.?realis\w*|rayonis\w*|cubis\w*|impressionis\w*)\b|иллюстрац|рисун|живопис/i;
/** Weak art cues (booru quality tags, CG words): art only when nothing says photoreal. */
const ART_WEAK = /\b(render|cgi?|octane|unreal engine|artstation|artistic|fine.?art|toys?|puppets?|stylized|masterpiece|best[ _]quality|absurdres|highres|very aesthetic|detailed[ _]eyes|looking at viewer)\b/i;
/** A photo / camera / live action is asked for. */
const PHOTO = /\b(photo|photos|photograph\w*|raw photo|dslr|mirrorless|35mm|50mm|85mm|f\/\d|shot on|sony a\w*|canon eos|iphone|real.?life|live.?action|documentary|footage|film still|movie still|skin (?:texture|pores)|pores)\b|фото/i;
/** Clearly photographic / live-action. */
const REAL_STRONG = new RegExp(`${PHOTO.source}|\\b(photoreal\\w*|photo-?real\\w*|realistic|realism|hyper.?real\\w*)\\b|реализм|реалист`, 'i');
const REAL_WEAK = /\b(cinematic|film|bokeh|depth of field|natural light|golden hour|editorial|fashion|commercial|street photography|handheld|vlog|selfie|gopro|cctv|news)\b/i;
const ANIME_MODELS = /illustrious|pony|noob|animagine|anything|counterfeit|niji|novelai|\bnai\b|\banima\b|kohaku|waiani/i;
/** A person by noun — strong signal that people are the subject. */
const HUMAN = /\b(woman|women|man|men|person|people|lady|ladies|girl|girls|boy|boys|guy|guys|gentleman|grandma|grandpa|grandmother|grandfather|elderly|old (?:man|woman)|model|actor|actress|portrait|face|couple|family|friends|crowd|dancer\w*|singer|rapper|musician|soldier\w*|(?:a|the) general|chef|cook|athlete|runner|boxer|fighter|skater|surfer|businessman|businesswoman|worker|farmer|doctor|nurse|police\w*|firefighter|monk|priest|king|queen|prince|princess|bride|groom|warrior|knight|samurai|ninja|viking|pirate|cowboy|astronaut|detective|maiko|geisha|influencer|vlogger|streamer|pedestrians?)\b/i;
/** People in other languages common on Civitai (fr, es, de, ru, ja, zh, ko). */
const HUMAN_INTL = /\b(femme|homme|fille|garçon|mujer|hombre|chica|chico|frau|mann|mädchen|junge|donna|uomo|mulher|homem)\b|женщин|девушк|мужчин|парен|портрет|女性|女の子|男性|男の子|女孩|男孩|女人|男人|여자|남자|소녀/i;
/** Pronoun-only humans; ignored when an animal is the subject ("the cat… he's got…"). */
const PRONOUN = /\b(she|he|her|his|him)\b/i;
const ANIMAL = /\b(cat|cats|kitten|dog|dogs|puppy|fox|bird|owl|squirrel|frog|dragon|horse|bear|wolf|rabbit|bunny|fish|beetle|insect|monkey|lion|tiger|animal|creature|robot)\b/i;
/** Image-to-video prompts that only describe motion: the style lives in an unseen source image. */
const STYLE_UNKNOWN = /keep the exact|make (?:this|the) (?:image|picture|photo) (?:come alive|move)|bring (?:this|it) to life|animate (?:this|the) (?:image|picture)|<\s*picture|workflow embedded/i;

export type FeedStyle = 'anime' | 'real';

/** Booru-style tags join words with "_" ("felt_stopmotion_style"); split them so  matches. */
const words = (prompt: string) => prompt.replace(/_/g, ' ');

/** 'anime' = anime, cartoon, illustration & art (own tab). 'real' = photoreal / live action (main feed). */
export function styleOf(row: Pick<ShowcaseRow, 'prompt' | 'base_model'>): FeedStyle {
  const p = words(row.prompt);
  if (ANIME_MODELS.test(row.base_model ?? '')) return 'anime';
  if (ANIME_STRONG.test(p) || ANIME_INTL.test(p)) return 'anime';
  if (ART_MEDIUM.test(p) && !PHOTO.test(p)) return 'anime';
  if (ART_WEAK.test(p) && !REAL_STRONG.test(p)) return 'anime';
  return 'real';
}

/** True when people are the subject of the prompt. */
export function hasPeople(prompt: string): boolean {
  if (HUMAN.test(prompt) || HUMAN_INTL.test(prompt)) return true;
  return PRONOUN.test(prompt) && !ANIMAL.test(prompt);
}

/**
 * Lower = earlier in the main feed. Videos lead, people lead within each:
 * 0 photoreal people video · 1 people video · 2 photoreal video · 3 other video
 * 4 photoreal people image · 5 people image · 6 other image.
 * Motion-only i2v prompts ("keep the exact look…") can hide a cartoon source, so they sink to the "other" tier.
 */
export function feedRank(row: Pick<ShowcaseRow, 'prompt' | 'media_type'>): number {
  const p = words(row.prompt);
  const unknown = STYLE_UNKNOWN.test(p);
  const human = !unknown && hasPeople(p);
  const real = !unknown && (REAL_STRONG.test(p) || REAL_WEAK.test(p));
  if (row.media_type === 'video') return human ? (real ? 0 : 1) : real ? 2 : 3;
  return human ? (real ? 4 : 5) : 6;
}

export type SkipReason = 'noPrompt' | 'unsafe' | 'noModel' | 'needsImage' | 'type';

/** Applies every feed rule to one Civitai post: safe, prompted, remixable with our models. */
export function toShowcaseRow(raw: CivitaiItem, available: Set<string>): ShowcaseRow | SkipReason {
  // Single-image lookups (?imageId=) nest the generation data one level deeper: meta.meta.prompt.
  const nested = (raw.meta as { meta?: CivitaiItem['meta'] } | null | undefined)?.meta;
  const it: CivitaiItem = nested && typeof nested === 'object' ? { ...raw, meta: nested } : raw;
  const type = it.type === 'video' ? 'video' : it.type === 'image' ? 'image' : null;
  if (!type) return 'type';
  const prompt = it.meta?.prompt ? cleanPrompt(String(it.meta.prompt)) : '';
  if (prompt.length < 12) return 'noPrompt';
  if (!isSafe(it)) return 'unsafe';
  const modelId = mapModel(it, available);
  if (!modelId) return 'noModel';
  // A prompt written around a source image only works with a photo-input model.
  if (needsSourceImage(prompt) && !modelId.includes('image-to-video')) return 'needsImage';
  return {
    id: `civitai:${it.id}`,
    source: 'civitai',
    media_type: type,
    ...civitaiMedia(it.url, type),
    width: it.width ?? null,
    height: it.height ?? null,
    prompt,
    negative_prompt: it.meta?.negativePrompt ? cleanPrompt(String(it.meta.negativePrompt)) : null,
    base_model: it.baseModel ?? null,
    model_id: modelId,
    author: it.username ?? null,
    source_url: `https://civitai.com/images/${it.id}`,
    likes: likesOf(it),
  };
}
