# Boson AI — AI-native creative suite

Multi-model AI image and video studio for iOS (Expo / React Native).

```
mobile/     Expo SDK 58 app (Expo Router, NativeTabs)
supabase/   Postgres schema + Edge Functions (generate, fal-webhook, revenuecat-webhook, delete-account)
```

## How it works

```
App ──generate──► Edge Function ──► fal.ai queue
 ▲                 (spend credits,      │
 │                  create job)         ▼ signed webhook
 └─ Realtime + push ◄── jobs table ◄── fal-webhook (copy output to Storage, complete or refund)
```

- No AI or secret keys in the app. The app only holds the Supabase publishable key and the RevenueCat public key.
- Credits change only in SQL functions (`create_job`, `fail_job`, `grant_credits`). Only the service role can run them.
- A failed generation refunds its credits automatically.
- **Model catalog:** list fal.ai endpoints in `CURATED` (`supabase/functions/_shared/catalog.ts`). Then call `sync-models`. It reads each model's schema, thumbnail, example output and price from fal.ai and writes them to `public.models`. The app reads that table, so new models show up without an app update.
  ```bash
  curl -X POST "<SUPABASE_URL>/functions/v1/sync-models?force=1"
  ```
- **Pricing:** 1 credit ≈ $0.01 of fal cost × 1.25. Videos cost at least 20 credits, because fal's unit price is the cheapest tier.
- **Home feed (trend templates):** every Vidu template that fal.ai's `fal-ai/vidu/template-to-video` can run, stored in `public.effects`. The user picks a photo and gets the video. There's no prompt: `generate` takes `effectId`, and the endpoint, template and price all come from the row.
  - Demo clips and covers come from Vidu's public template catalog (platform.vidu.com/docs/templates). They are linked from Vidu's CDN, and each tile keeps the clip's own aspect ratio.
  - Price = Vidu credits × 0.625. fal charges about Vidu credits × $0.005, and we add the 1.25 margin.
  - `sync-effects` adds templates fal starts supporting. The app calls it on launch, and new rows show at the top. A new row starts with no demo clip and 63 credits, so set its real price and preview.
  - `BLOCKED_TEMPLATES` in `_shared/effects.ts` keeps out adult, child/de-aging, violent, branded and real-person templates.
  - `seed-effect-previews` can render our own demo clips instead. It needs the `ADMIN_TOKEN` secret and costs fal credits.
  ```bash
  curl -X POST "<SUPABASE_URL>/functions/v1/sync-effects?force=1"
  ```
- **Civitai showcase (no longer on Home):** `showcase/[id]` deep links still work. `sync-showcase` pulls this week's most-reacted posts from Civitai's public API every 3 h. It keeps videos and images only if they meet all of these:
  - rated PG (`browsingLevel=1`)
  - have a full prompt
  - pass the keyword filter for adult content, minors, real people and well-known franchises

  Anime, cartoon and illustration posts are split out to the **Anime & Art** tab (`styleOf` in `_shared/showcaseMap.ts`). Trending / Video / Image show photoreal posts only, in this order: videos with people, other photoreal videos, other videos, then images with people first (`feedRank`).

  It maps each post's base model (MiniMax, Kling, Seedance, Flux…) to our closest catalog model, so "Remix" opens Create with that model and prompt. Attribution (`@author`, link to the original) is shown on every detail screen.
  ```bash
  curl -X POST "<SUPABASE_URL>/functions/v1/sync-showcase?force=1"
  ```
- **Appearance:** Day / Night / Auto, in the header toggle and in Profile → Appearance (`mobile/src/theme.tsx`).

## Setup

### 1. Supabase
1. Create a project at supabase.com.
2. Link it and push the schema:
   ```bash
   npx supabase link --project-ref <ref>
   npx supabase db push
   ```
3. Set the function secrets:
   ```bash
   npx supabase secrets set FAL_KEY=... REVENUECAT_WEBHOOK_SECRET=...
   ```
4. Deploy the functions:
   ```bash
   npx supabase functions deploy
   ```
5. In Auth → Providers, enable **Email** (OTP code) and **Apple**.

### 2. Mobile app
```bash
cd mobile
cp .env.example .env              # fill in Supabase + RevenueCat keys
npx eas-cli@latest init           # links an EAS project (needed for push tokens)
npx eas-cli@latest build --profile development --platform ios
npx expo start
```
Expo Go isn't enough. RevenueCat, Apple Sign In and push need a development build.

Web preview works for UI work only: `npm run web`.

### 3. App Store Connect + RevenueCat
- Create these products, matching `PRODUCT_CREDITS`: `boson_credits_100`, `boson_credits_500` (consumable) and `boson_pro_monthly` (auto-renewing).
- In RevenueCat, add them to an offering and design the paywall.
- Webhook URL: `<SUPABASE_URL>/functions/v1/revenuecat-webhook`. Set the Authorization header to `Bearer <REVENUECAT_WEBHOOK_SECRET>`.

## Before App Store submission
- [ ] Revoke the Sign in with Apple token on account deletion (`delete-account` TODO)
- [ ] Rate limit and prompt moderation in `generate`
- [ ] Report/flag button on results (guideline 1.2)
- [ ] Privacy policy URL + App Privacy labels (prompts and photos are shared with fal.ai)
- [ ] Re-check fal.ai endpoint IDs and per-second prices, then adjust credit costs
- [ ] App icon and splash in `mobile/assets`
