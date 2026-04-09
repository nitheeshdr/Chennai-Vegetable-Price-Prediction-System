import { MD3DarkTheme } from 'react-native-paper';

/**
 * Material Design 3 — Dark theme
 * Seed colour: #6366f1 (Indigo 500)
 * Generated via Material Theme Builder
 */

// ── M3 Color Roles ────────────────────────────────────────────────────────────
export const M3 = {
  // Primary (Indigo tonal palette)
  primary:              '#BBC2FF',   // P-80
  onPrimary:            '#0D1785',   // P-20
  primaryContainer:     '#2930A7',   // P-30
  onPrimaryContainer:   '#DFE0FF',   // P-90

  // Secondary (Lavender tonal palette)
  secondary:            '#C5C4DD',   // S-80
  onSecondary:          '#2E2D42',   // S-20
  secondaryContainer:   '#454459',   // S-30
  onSecondaryContainer: '#E1E0F9',   // S-90

  // Tertiary (Rose tonal palette)
  tertiary:             '#E7B9D8',   // T-80
  onTertiary:           '#43253B',   // T-20
  tertiaryContainer:    '#5B3B52',   // T-30
  onTertiaryContainer:  '#FFD8EE',   // T-90

  // Error
  error:                '#FFB4AB',
  onError:              '#690005',
  errorContainer:       '#93000A',
  onErrorContainer:     '#FFDAD6',

  // Surfaces & Backgrounds
  background:           '#13131C',
  onBackground:         '#E4E1F4',
  surface:              '#13131C',
  onSurface:            '#E4E1F4',
  surfaceVariant:       '#45455C',
  onSurfaceVariant:     '#C6C5DA',
  outline:              '#8F8FA3',
  outlineVariant:       '#45455C',

  // Inverse
  inverseSurface:       '#E4E1F4',
  inverseOnSurface:     '#302F44',
  inversePrimary:       '#4148E4',

  // Tonal surface elevations (dark theme uses primary-tinted overlay)
  surfaceContainerLowest:  '#0E0E16',
  surfaceContainerLow:     '#1B1B26',
  surfaceContainer:        '#1F1F2B',
  surfaceContainerHigh:    '#292934',
  surfaceContainerHighest: '#34343F',

  scrim: '#000000',
};

// ── Custom semantic tokens (financial) ───────────────────────────────────────
export const C = {
  bg:           M3.background,
  surface:      M3.surfaceContainerLow,       // #1B1B26
  surface2:     M3.surfaceContainer,          // #1F1F2B
  surface3:     M3.surfaceContainerHigh,      // #292934
  border:       M3.outlineVariant,            // #45455C
  borderLight:  M3.outline,                   // #8F8FA3

  // Brand primary
  primary:      M3.primary,                   // #BBC2FF
  primaryDark:  M3.primaryContainer,          // #2930A7
  primaryCont:  M3.primaryContainer,          // #2930A7
  onPrimary:    M3.onPrimary,

  // Semantic financial colours
  green:        '#A8F0C6',   // Rising = good buy (price falling)
  greenDark:    '#1D6B45',
  greenCont:    '#0D3B26',
  red:          '#FFB4AB',   // Rising price (M3 error palette)
  redDark:      '#93000A',
  redCont:      '#4E0004',
  amber:        '#F5C842',   // Stable price
  amberDark:    '#7A5F00',
  amberCont:    '#3D2E00',
  sky:          '#93CCFF',   // Info / weather

  // Text
  text:         M3.onBackground,             // #E4E1F4
  text2:        M3.onSurfaceVariant,         // #C6C5DA
  text3:        M3.outline,                  // #8F8FA3

  // Legacy aliases (used in older components)
  card:         M3.surfaceContainerLow,
  card2:        M3.surfaceContainer,
  indigo:       M3.primaryContainer,
  indigoLight:  M3.primary,
  redLight:     '#FFB4AB',
};

export const TREND: Record<string, {
  color: string; cont: string; emoji: string; label: string; bg: string; border: string;
}> = {
  up:     { color: C.red,   cont: C.redCont,   emoji: '↑', label: 'RISING',  bg: `${C.red}18`,   border: `${C.red}35`   },
  down:   { color: C.green, cont: C.greenCont, emoji: '↓', label: 'FALLING', bg: `${C.green}18`, border: `${C.green}35` },
  stable: { color: C.amber, cont: C.amberCont, emoji: '→', label: 'STABLE',  bg: `${C.amber}18`, border: `${C.amber}35` },
};

// ── Spacing scale (8dp Material grid) ────────────────────────────────────────
export const SP = {
  xs:    4,
  sm:    8,
  md:    12,
  lg:    16,   // default page margin
  xl:    20,
  xxl:   24,
  xxxl:  32,
  huge:  48,
};

// ── Shape scale (M3) ─────────────────────────────────────────────────────────
export const SHAPE = {
  xs:    4,    // extra-small
  sm:    8,    // small
  md:    12,   // medium
  lg:    16,   // large
  xl:    28,   // extra-large
  full:  9999, // full (pill)
};

// ── React Native Paper MD3 dark theme ────────────────────────────────────────
export const paperTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary:              M3.primary,
    onPrimary:            M3.onPrimary,
    primaryContainer:     M3.primaryContainer,
    onPrimaryContainer:   M3.onPrimaryContainer,
    secondary:            M3.secondary,
    onSecondary:          M3.onSecondary,
    secondaryContainer:   M3.secondaryContainer,
    onSecondaryContainer: M3.onSecondaryContainer,
    tertiary:             M3.tertiary,
    onTertiary:           M3.onTertiary,
    tertiaryContainer:    M3.tertiaryContainer,
    onTertiaryContainer:  M3.onTertiaryContainer,
    error:                M3.error,
    onError:              M3.onError,
    errorContainer:       M3.errorContainer,
    onErrorContainer:     M3.onErrorContainer,
    background:           M3.background,
    onBackground:         M3.onBackground,
    surface:              M3.surface,
    onSurface:            M3.onSurface,
    surfaceVariant:       M3.surfaceVariant,
    onSurfaceVariant:     M3.onSurfaceVariant,
    outline:              M3.outline,
    outlineVariant:       M3.outlineVariant,
    inverseSurface:       M3.inverseSurface,
    inverseOnSurface:     M3.inverseOnSurface,
    inversePrimary:       M3.inversePrimary,
    scrim:                M3.scrim,
    shadow:               '#000000',
    elevation: {
      level0: 'transparent',
      level1: M3.surfaceContainerLow,
      level2: M3.surfaceContainer,
      level3: M3.surfaceContainerHigh,
      level4: M3.surfaceContainerHighest,
      level5: '#3C3C48',
    },
  },
};
