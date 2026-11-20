import { Linking } from 'react-native';

/** Hosted from /docs on GitHub Pages. Also set these in App Store Connect and the RevenueCat paywall. */
const BASE = 'https://arifliaykhan2-ops.github.io/bostonai';
export const PRIVACY_URL = `${BASE}/privacy.html`;
export const TERMS_URL = `${BASE}/terms.html`;
export const SUPPORT_EMAIL = 'omerbabaverdiyev@gmail.com';

export function openLegal(url: string) {
  void Linking.openURL(url);
}
