import { createContext, useContext, useEffect, type PropsWithChildren } from 'react';
import { Appearance, Platform, StyleSheet, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';

/**
 * Design tokens shared with the web app (OmarBbv/ai-studio, web/src/app/globals.css,
 * "Neon Lime"). Dark only, like the web, so both feel like one product.
 */
const dark = {
  bg: '#0B0B0C', // --color-bg
  bgElevated: '#050505', // --color-bg-deep
  surface: '#141416', // --color-s1: cards, panels
  surfaceAlt: '#1C1C1F', // --color-s2: inputs, fields, secondary buttons
  surfaceRaised: '#242428', // --color-s3: chips
  surfaceGlass: 'rgba(20, 20, 22, 0.88)',
  border: '#26262A', // --color-line
  borderLight: '#303036', // --color-line-strong
  borderActive: '#444444', // --color-edge-strong
  text: '#F4F4F5', // --color-ink
  textSoft: '#C9C9CF', // --color-soft: chip text, lists
  textMuted: '#8B8B93', // --color-muted
  textSubtle: '#777777', // --color-faint
  accent: '#D4FF2E', // --color-lime
  accentDark: '#8DB000', // --color-lime-dark: 3D edge under lime buttons
  accentText: '#000000',
  accentInk: '#D4FF2E',
  pink: '#FF2E88', // --color-pink
  violet: '#7C3AED', // --color-violet (PRO)
  gold: '#FFD700',
  danger: '#FF2E88', // the web uses pink for destructive/alert states
  overlay: 'rgba(0,0,0,0.65)',
};

export type Colors = typeof dark;
export type Scheme = 'dark';

/**
 * Fonts, as on the web: Archivo (condensed 72%, black) for headlines, Inter for UI.
 * ArchivoCondensed-Black is a static instance of Archivo's variable font
 * (assets/fonts, OFL) because only the default width ships as a static file.
 */
export const fonts = {
  display: 'ArchivoCondensed-Black',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
} as const;

export const radius = { sm: 8, md: 14, lg: 18, xl: 24, full: 9999 } as const;
export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 44 } as const;

type ThemeState = { colors: Colors; scheme: Scheme };

const ThemeContext = createContext<ThemeState>({ colors: dark, scheme: 'dark' });

export function ThemeProvider({ children }: PropsWithChildren) {
  // Native chrome (tab bar glass, alerts, keyboards) follows the dark design too.
  useEffect(() => {
    if (Platform.OS !== 'web') Appearance.setColorScheme('dark');
  }, []);
  return <ThemeContext.Provider value={{ colors: dark, scheme: 'dark' }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

const INTER_BY_WEIGHT: Record<string, string> = {
  '100': fonts.regular,
  '200': fonts.regular,
  '300': fonts.regular,
  '400': fonts.regular,
  normal: fonts.regular,
  '500': fonts.medium,
  '600': fonts.semibold,
  '700': fonts.bold,
  bold: fonts.bold,
  '800': fonts.extrabold,
  '900': fonts.extrabold,
};

const TEXT_KEYS = ['fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textTransform'] as const;

/**
 * Text styles get the Inter face for their weight (custom fonts have one face per
 * weight, so fontWeight is dropped to avoid faux bold). Styles that set their own
 * fontFamily (e.g. fonts.display) are left alone.
 */
function withFonts<T>(styles: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, style] of Object.entries(styles as Record<string, TextStyle>)) {
    if (style && typeof style === 'object' && !style.fontFamily && TEXT_KEYS.some((k) => k in style)) {
      const { fontWeight, ...rest } = style;
      out[key] = { ...rest, fontFamily: INTER_BY_WEIGHT[String(fontWeight ?? '400')] ?? fonts.regular };
    } else {
      out[key] = style;
    }
  }
  return out as T;
}

export function makeStyles<T extends NamedStyles<T>>(factory: (c: Colors) => T | NamedStyles<T>) {
  let styles: T | null = null;
  return function useStyles(): T {
    if (!styles) styles = StyleSheet.create(withFonts(factory(dark) as T));
    return styles;
  };
}
