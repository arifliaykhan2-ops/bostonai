// Push notification texts per app language. push-strings.json is written by
// scripts/translate.mjs from the push.* keys in mobile/src/i18n/locales.
import strings from './push-strings.json' with { type: 'json' };

export type PushKey = 'push.videoReady' | 'push.imageReady' | 'push.tapToView' | 'push.failed' | 'push.refunded';

const table = strings as Record<string, Record<string, string>>;

export function pushText(locale: string | null | undefined, key: PushKey): string {
  return (locale && table[locale]?.[key]) || table.en[key];
}
