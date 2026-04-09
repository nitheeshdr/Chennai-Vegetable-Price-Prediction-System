import { MD3DarkTheme } from 'react-native-paper';

/** Raw brand tokens */
export const C = {
  bg:          '#050d1e',
  surface:     '#0f1d35',
  surface2:    '#162040',
  surface3:    '#1a2a50',
  border:      '#1e3358',
  primary:     '#818cf8',   // indigo-400  (lighter for dark bg)
  primaryDark: '#6366f1',
  primaryCont: '#1e1b4b',
  green:       '#34d399',   // emerald-400
  greenDark:   '#10b981',
  greenCont:   '#064e3b',
  red:         '#fb7185',   // rose-400
  redDark:     '#f43f5e',
  redCont:     '#9f1239',
  amber:       '#fbbf24',   // amber-400
  amberDark:   '#f59e0b',
  amberCont:   '#78350f',
  sky:         '#38bdf8',
  text:        '#f1f5f9',
  text2:       '#94a3b8',
  text3:       '#475569',
  // legacy aliases (keep ForecastScreen/PriceCard happy)
  card:        '#0f1d35',
  card2:       '#162040',
  indigo:      '#6366f1',
  indigoLight: '#818cf8',
  redLight:    '#fb7185',
};

export const TREND: Record<string, { color: string; cont: string; emoji: string; label: string; bg: string; border: string }> = {
  up:     { color: C.red,   cont: C.redCont,   emoji: '↑', label: 'RISING',  bg: '#fb718520', border: '#fb718540' },
  down:   { color: C.green, cont: C.greenCont, emoji: '↓', label: 'FALLING', bg: '#34d39920', border: '#34d39940' },
  stable: { color: C.amber, cont: C.amberCont, emoji: '→', label: 'STABLE',  bg: '#fbbf2420', border: '#fbbf2440' },
};

/** Material Design 3 dark theme for react-native-paper */
export const paperTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary:              '#818cf8',
    onPrimary:            '#1e1b4b',
    primaryContainer:     '#312e81',
    onPrimaryContainer:   '#e0e7ff',
    secondary:              '#34d399',
    onSecondary:            '#064e3b',
    secondaryContainer:     '#065f46',
    onSecondaryContainer:   '#a7f3d0',
    tertiary:              '#fbbf24',
    onTertiary:            '#451a03',
    tertiaryContainer:     '#78350f',
    onTertiaryContainer:   '#fde68a',
    error:              '#fb7185',
    onError:            '#881337',
    errorContainer:     '#9f1239',
    onErrorContainer:   '#fecdd3',
    background:         '#050d1e',
    onBackground:       '#f1f5f9',
    surface:            '#0f1d35',
    onSurface:          '#f1f5f9',
    surfaceVariant:     '#1e3358',
    onSurfaceVariant:   '#94a3b8',
    outline:            '#2d4a7a',
    outlineVariant:     '#1e3358',
    inverseSurface:     '#f1f5f9',
    inverseOnSurface:   '#0f1d35',
    inversePrimary:     '#4f46e5',
    elevation: {
      level0: 'transparent',
      level1: '#0f1d35',
      level2: '#162040',
      level3: '#1a2a4a',
      level4: '#1e3358',
      level5: '#243960',
    },
    scrim:  '#000000',
    shadow: '#000000',
  },
};
