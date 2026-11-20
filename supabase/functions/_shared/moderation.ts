// Prompt moderation for user-written text (Create prompts, Talking Photo scripts).
// Two passes:
//   1. a fast local word list for the clearest cases (no network, any outage),
//   2. an LLM check through fal.ai's OpenRouter endpoint, because the app ships in
//      ~47 languages and a word list only covers a few of them.
// If the LLM check fails (timeout, provider error) the text is allowed: the image
// and video models still run their own safety checkers on the output.

const FAL_KEY = Deno.env.get('FAL_KEY')!;
const LLM_ENDPOINT = 'openrouter/router';
const LLM_MODEL = 'anthropic/claude-haiku-5.5';
const TIMEOUT_MS = 6000;

export type ModerationResult = { allowed: true } | { allowed: false; category: string };

/** Unambiguous terms, matched as whole words. The LLM pass covers everything subtler. */
const HARD_BLOCK =
  /\b(nude|nudes|naked|nsfw|porn\w*|hentai|sex|sexual|erotic\w*|topless|genitals?|loli|shota|child\s*porn|rape|raped|raping|bestiality|incest|beheading|gore)\b/i;

const SYSTEM_PROMPT = `You are a content moderator for a consumer AI image and video app on the Apple App Store.
Users type a prompt (or a script a photo will speak). The text can be in any language.
Block the text if it asks for or contains any of:
- sexual or nude content, sexualized poses, fetish content
- any sexual or suggestive content involving minors, or minors in unsafe situations
- graphic violence, gore, self-harm, suicide, terrorism or extremist symbols
- hate or harassment against a person or group
- impersonating or depicting a real, named public figure or celebrity
- illegal activity (drugs, weapons manufacturing, fraud)
Everyday creative requests (portraits, fashion, fantasy, action scenes, animals, products) are allowed.
Answer with only one JSON object and nothing else:
{"allow": true} or {"allow": false, "category": "<sexual|minors|violence|self_harm|hate|real_person|illegal>"}`;

export async function moderateText(text: string): Promise<ModerationResult> {
  const t = text.trim();
  if (!t) return { allowed: true };
  if (HARD_BLOCK.test(t)) return { allowed: false, category: 'sexual' };

  try {
    const res = await fetch(`https://fal.run/${LLM_ENDPOINT}`, {
      method: 'POST',
      headers: { Authorization: `Key ${FAL_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: LLM_MODEL,
        system_prompt: SYSTEM_PROMPT,
        prompt: `Text to check:\n"""\n${t.slice(0, 2000)}\n"""`,
        temperature: 0,
        max_tokens: 40,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`moderation ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const output = ((await res.json()) as { output?: string }).output ?? '';
    const match = output.match(/\{[\s\S]*\}/);
    if (!match) throw new Error(`moderation: unparsable output ${output.slice(0, 100)}`);
    const verdict = JSON.parse(match[0]) as { allow?: boolean; category?: string };
    if (verdict.allow === false) return { allowed: false, category: verdict.category ?? 'policy' };
    return { allowed: true };
  } catch (e) {
    console.warn('moderation check skipped', String(e).slice(0, 300));
    return { allowed: true };
  }
}
