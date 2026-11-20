#!/usr/bin/env node
// Translates the app into every App Store language.
//
//   FAL_KEY=… node scripts/translate.mjs            # translate what is new or changed
//   FAL_KEY=… node scripts/translate.mjs --only de,ja
//   FAL_KEY=… node scripts/translate.mjs --all      # retranslate everything
//   node scripts/translate.mjs --sync-only          # only refresh en.json from the database
//
// Source of truth: mobile/src/i18n/locales/en.json (UI) and mobile/src/i18n/native/en.json
// (iOS permission texts). Before translating, the script pulls the Apps tab rows
// (public.effects, section app/action) from Supabase and writes their texts into en.json
// as fx.<id>.* keys, so new or edited apps get translated too.
//
// It remembers which English text each translation came from (locales/.source.json), so a
// rerun only sends keys that are new or whose English changed. Translations run through
// fal.ai's OpenRouter endpoint (the same FAL_KEY the Edge Functions use).
//
// Outputs:
//   mobile/src/i18n/locales/<locale>.json
//   mobile/src/i18n/native/<locale>.json
//   supabase/functions/_shared/push-strings.json   (push notification texts per locale)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOCALES_DIR = join(ROOT, 'mobile/src/i18n/locales');
const NATIVE_DIR = join(ROOT, 'mobile/src/i18n/native');
const SOURCE_FILE = join(LOCALES_DIR, '.source.json');
const PUSH_FILE = join(ROOT, 'supabase/functions/_shared/push-strings.json');

const MODEL = process.env.TRANSLATE_MODEL ?? 'anthropic/claude-sonnet-5';
const BATCH = 60;
const CONCURRENCY = 6;

/** App Store languages (iOS localization ids) → language name for the prompt. */
const LANGUAGES = {
  ar: 'Arabic', bn: 'Bangla (Bengali)', ca: 'Catalan', cs: 'Czech', da: 'Danish', de: 'German', el: 'Greek',
  es: 'Spanish (Spain)', 'es-MX': 'Spanish (Mexico / Latin America)', fi: 'Finnish', fr: 'French (France)',
  'fr-CA': 'French (Canada)', gu: 'Gujarati', he: 'Hebrew', hi: 'Hindi', hr: 'Croatian', hu: 'Hungarian',
  id: 'Indonesian', it: 'Italian', ja: 'Japanese', kn: 'Kannada', ko: 'Korean', ml: 'Malayalam', mr: 'Marathi',
  ms: 'Malay', nb: 'Norwegian Bokmål', nl: 'Dutch', or: 'Odia', pa: 'Punjabi (Gurmukhi)', pl: 'Polish',
  'pt-BR': 'Portuguese (Brazil)', 'pt-PT': 'Portuguese (Portugal)', ro: 'Romanian', ru: 'Russian', sk: 'Slovak',
  sl: 'Slovenian', sv: 'Swedish', ta: 'Tamil', te: 'Telugu', th: 'Thai', tr: 'Turkish', uk: 'Ukrainian',
  ur: 'Urdu', vi: 'Vietnamese', 'zh-Hans': 'Simplified Chinese', 'zh-Hant': 'Traditional Chinese (Taiwan)',
};

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const onlyArg = args.find((a, i) => args[i - 1] === '--only');
const targets = onlyArg ? onlyArg.split(',') : Object.keys(LANGUAGES);

const readJson = (file, fallback) => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : fallback);
const writeJson = (file, data) => writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);

// ---------------------------------------------------------------- database → en.json

function readEnv(file) {
  const env = {};
  if (!existsSync(file)) return env;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return env;
}

/** Same as optionKey() in mobile/src/lib/effects.ts: long values (prompt texts) become a short hash. */
function optionKey(value) {
  const v = String(value);
  if (v.length <= 40) return v;
  let h = 5381;
  for (let i = 0; i < v.length; i++) h = ((h * 33) ^ v.charCodeAt(i)) >>> 0;
  return `h${h.toString(36)}`;
}

async function effectStrings() {
  const env = { ...readEnv(join(ROOT, 'mobile/.env')), ...process.env };
  const url = env.EXPO_PUBLIC_SUPABASE_URL;
  const key = env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('EXPO_PUBLIC_SUPABASE_URL / _PUBLISHABLE_KEY missing (mobile/.env)');
  const res = await fetch(
    `${url}/rest/v1/effects?select=id,title,subtitle,description,choices,image2,text_input,video_input,section&section=in.(app,action)&enabled=eq.true&order=sort`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );
  if (!res.ok) throw new Error(`effects ${res.status}: ${await res.text()}`);
  const out = {};
  for (const e of await res.json()) {
    const k = `fx.${e.id}`;
    out[`${k}.title`] = e.title;
    if (e.subtitle) out[`${k}.subtitle`] = e.subtitle;
    if (e.description) out[`${k}.description`] = e.description;
    if (e.image2?.label) out[`${k}.image2`] = e.image2.label;
    if (e.video_input?.label) out[`${k}.video`] = e.video_input.label;
    if (e.text_input?.label) out[`${k}.text`] = e.text_input.label;
    if (e.text_input?.placeholder) out[`${k}.placeholder`] = e.text_input.placeholder;
    for (const c of e.choices ?? []) {
      out[`${k}.${c.field}`] = c.label;
      for (const o of c.options ?? []) out[`${k}.${c.field}.${optionKey(o.value)}`] = o.label;
    }
  }
  return out;
}

// ---------------------------------------------------------------- LLM

const SYSTEM = (language) => `You translate the user interface of "Boson AI", an iPhone app for making AI images and videos, from English into ${language}.
Rules:
- Return ONLY a JSON object with the same keys and the translated strings as values. No comments, no markdown.
- Keep every {placeholder} exactly as written (same braces and name). Do not translate placeholder names.
- Keep emoji and symbols (⚡ ✦ → · — ✓ 🎬 ♪) where they are.
- Do not translate brand and product names: Boson AI, fal.ai, Civitai, Apple, App Store, Supabase, and AI model names (Flux, Kling, Nano Banana, Gemini, GPT Image, Seedance, Seedream, MiniMax, Wan, Grok, Vidu, PixVerse, Black Forest Labs, Google, OpenAI, ByteDance, Kuaishou, Alibaba, xAI, ShengShu).
- Write natural, short UI text as a native ${language} app would. Use the informal/polite register that is usual for consumer apps in ${language}. Labels in ALL CAPS stay in capitals where the script has case.
- Keys ending in _one, _other (and _zero, _two, _few, _many) are plural forms of the same text. For every plural group, return ALL plural categories that ${language} uses according to Unicode CLDR (e.g. one/few/many/other for Russian, Ukrainian, Polish; zero/one/two/few/many/other for Arabic; only other for Japanese, Chinese, Korean, Thai, Vietnamese, Indonesian, Malay). Add the missing keys with the same base name.`;

const falKey = process.env.FAL_KEY;

async function llm(language, batch) {
  const res = await fetch('https://fal.run/openrouter/router', {
    method: 'POST',
    headers: { Authorization: `Key ${falKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      system_prompt: SYSTEM(language),
      prompt: JSON.stringify(batch, null, 1),
      temperature: 0.2,
      max_tokens: 16000,
    }),
    signal: AbortSignal.timeout(180_000),
  });
  if (!res.ok) throw new Error(`fal ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const text = (await res.json()).output ?? '';
  const json = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
  return JSON.parse(json);
}

const placeholders = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
const pluralBase = (k) => k.replace(/_(zero|one|two|few|many|other)$/, '');
const isPlural = (k) => /_(zero|one|two|few|many|other)$/.test(k);

/** Translates `source` (key → English) into `language`, validating placeholders. Retries a batch once. */
async function translate(language, source) {
  const keys = Object.keys(source);
  // Keep plural groups together in one batch.
  const groups = [];
  for (const k of keys) {
    const last = groups[groups.length - 1];
    if (last && isPlural(k) && pluralBase(last[0]) === pluralBase(k)) last.push(k);
    else groups.push([k]);
  }
  const batches = [];
  let cur = [];
  for (const g of groups) {
    if (cur.length + g.length > BATCH) {
      batches.push(cur);
      cur = [];
    }
    cur.push(...g);
  }
  if (cur.length) batches.push(cur);

  const result = {};
  for (const batchKeys of batches) {
    const batch = Object.fromEntries(batchKeys.map((k) => [k, source[k]]));
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const out = await llm(language, batch);
        const bad = [];
        for (const k of batchKeys) {
          if (typeof out[k] !== 'string' || placeholders(out[k]) !== placeholders(source[k])) bad.push(k);
        }
        // Extra plural categories the language needs.
        for (const [k, v] of Object.entries(out)) {
          if (!(k in batch) && isPlural(k) && batchKeys.some((b) => pluralBase(b) === pluralBase(k))) {
            const ref = source[`${pluralBase(k)}_other`];
            if (typeof v === 'string' && placeholders(v) === placeholders(ref)) result[k] = v;
          }
        }
        for (const k of batchKeys) if (!bad.includes(k)) result[k] = out[k];
        if (bad.length && attempt === 2) console.warn(`  ${language}: kept English for ${bad.join(', ')}`);
        if (!bad.length) break;
        batchKeys.splice(0, batchKeys.length, ...bad);
        Object.keys(batch).forEach((k) => bad.includes(k) || delete batch[k]);
      } catch (e) {
        if (attempt === 2) console.warn(`  ${language}: batch failed (${String(e).slice(0, 120)})`);
      }
    }
  }
  return result;
}

// ---------------------------------------------------------------- main

async function main() {
  const enFile = join(LOCALES_DIR, 'en.json');
  const en = readJson(enFile, {});
  // Refresh fx.* (Apps tab content) from the database, keep everything else as written.
  const fx = await effectStrings();
  const merged = Object.fromEntries(Object.entries(en).filter(([k]) => !k.startsWith('fx.')));
  Object.assign(merged, fx);
  writeJson(enFile, merged);
  console.log(`en.json: ${Object.keys(merged).length} keys (${Object.keys(fx).length} from the Apps tab)`);
  if (flag('--sync-only')) return;
  if (!falKey) throw new Error('Set FAL_KEY to translate.');

  const nativeEn = readJson(join(NATIVE_DIR, 'en.json'), {});
  const sourceMemory = readJson(SOURCE_FILE, {});
  const push = readJson(PUSH_FILE, {});
  push.en = Object.fromEntries(Object.entries(merged).filter(([k]) => k.startsWith('push.')));

  const queue = [...targets];
  const work = async () => {
    for (let loc = queue.shift(); loc; loc = queue.shift()) {
      const language = LANGUAGES[loc];
      if (!language) {
        console.warn(`unknown locale ${loc}`);
        continue;
      }
      const file = join(LOCALES_DIR, `${loc}.json`);
      const current = readJson(file, {});
      const memory = sourceMemory[loc] ?? {};
      const todo = {};
      for (const [k, v] of Object.entries(merged)) {
        const hasAnyForm = isPlural(k)
          ? Object.keys(current).some((c) => isPlural(c) && pluralBase(c) === pluralBase(k))
          : k in current;
        if (flag('--all') || !hasAnyForm || memory[k] !== v) todo[k] = v;
      }
      // iOS permission texts share the run.
      const nativeFile = join(NATIVE_DIR, `${loc}.json`);
      const nativeCurrent = readJson(nativeFile, {});
      for (const [k, v] of Object.entries(nativeEn)) {
        if (flag('--all') || !(k in nativeCurrent) || memory[`native.${k}`] !== v) todo[`native.${k}`] = v;
      }

      if (Object.keys(todo).length) {
        console.log(`${loc}: translating ${Object.keys(todo).length} strings…`);
        const done = await translate(language, todo);
        for (const [k, v] of Object.entries(done)) {
          if (k.startsWith('native.')) nativeCurrent[k.slice(7)] = v;
          else current[k] = v;
        }
        for (const k of Object.keys(todo)) {
          if (k in done || (isPlural(k) && Object.keys(done).some((d) => pluralBase(d) === pluralBase(k)))) {
            memory[k] = todo[k];
          }
        }
      } else {
        console.log(`${loc}: up to date`);
      }

      // Drop keys that no longer exist in English; keep the English order.
      const ordered = {};
      for (const k of Object.keys(merged)) {
        if (isPlural(k)) {
          for (const c of Object.keys(current)) if (isPlural(c) && pluralBase(c) === pluralBase(k) && !(c in ordered)) ordered[c] = current[c];
        } else if (k in current) ordered[k] = current[k];
      }
      writeJson(file, ordered);
      nativeCurrent.CFBundleDisplayName = nativeEn.CFBundleDisplayName; // app name is not translated
      writeJson(nativeFile, Object.fromEntries(Object.keys(nativeEn).map((k) => [k, nativeCurrent[k] ?? nativeEn[k]])));
      sourceMemory[loc] = memory;
      push[loc] = Object.fromEntries(Object.entries(ordered).filter(([k]) => k.startsWith('push.')));
      writeJson(SOURCE_FILE, sourceMemory);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, work));
  writeJson(PUSH_FILE, push);
  console.log('done');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
