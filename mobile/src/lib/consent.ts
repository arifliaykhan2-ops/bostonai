import 'expo-sqlite/localStorage/install';

/**
 * App Store guideline 5.1.2(i): ask before any prompt or photo is sent to a
 * third-party AI provider. Bump the version when the disclosure text changes.
 */
const KEY = 'ai-consent';
const VERSION = '2'; // 2: added Vidu and PixVerse for trend templates

export function hasAiConsent(): boolean {
  try {
    return localStorage.getItem(KEY) === VERSION;
  } catch {
    return false;
  }
}

export function setAiConsent(granted: boolean) {
  try {
    if (granted) localStorage.setItem(KEY, VERSION);
    else localStorage.removeItem(KEY);
  } catch {
    // Storage unavailable — the consent screen will simply show again.
  }
}
