import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';

// ── M3 Dark (seed: #6366f1 Indigo) ───────────────────────────────────────────
const M3D = {
  primary:              '#BBC2FF',
  onPrimary:            '#0D1785',
  primaryContainer:     '#2930A7',
  onPrimaryContainer:   '#DFE0FF',
  secondary:            '#C5C4DD',
  onSecondary:          '#2E2D42',
  secondaryContainer:   '#454459',
  onSecondaryContainer: '#E1E0F9',
  tertiary:             '#E7B9D8',
  onTertiary:           '#43253B',
  tertiaryContainer:    '#5B3B52',
  onTertiaryContainer:  '#FFD8EE',
  error:                '#FFB4AB',
  onError:              '#690005',
  errorContainer:       '#93000A',
  onErrorContainer:     '#FFDAD6',
  background:           '#13131C',
  onBackground:         '#E4E1F4',
  surface:              '#13131C',
  onSurface:            '#E4E1F4',
  surfaceVariant:       '#45455C',
  onSurfaceVariant:     '#C6C5DA',
  outline:              '#8F8FA3',
  outlineVariant:       '#45455C',
  inverseSurface:       '#E4E1F4',
  inverseOnSurface:     '#302F44',
  inversePrimary:       '#4148E4',
  surfaceContainerLowest:  '#0E0E16',
  surfaceContainerLow:     '#1B1B26',
  surfaceContainer:        '#1F1F2B',
  surfaceContainerHigh:    '#292934',
  surfaceContainerHighest: '#34343F',
};

// ── M3 Light (seed: #6366f1 Indigo) ──────────────────────────────────────────
const M3L = {
  primary:              '#4148E4',
  onPrimary:            '#FFFFFF',
  primaryContainer:     '#DFE0FF',
  onPrimaryContainer:   '#000891',
  secondary:            '#5D5C78',
  onSecondary:          '#FFFFFF',
  secondaryContainer:   '#E2DFFF',
  onSecondaryContainer: '#191836',
  tertiary:             '#79536A',
  onTertiary:           '#FFFFFF',
  tertiaryContainer:    '#FFD8EE',
  onTertiaryContainer:  '#2E1125',
  error:                '#BA1A1A',
  onError:              '#FFFFFF',
  errorContainer:       '#FFDAD6',
  onErrorContainer:     '#410002',
  background:           '#FFFBFE',
  onBackground:         '#1C1B1F',
  surface:              '#FFFBFE',
  onSurface:            '#1C1B1F',
  surfaceVariant:       '#E5DEFF',
  onSurfaceVariant:     '#48466B',
  outline:              '#79757E',
  outlineVariant:       '#CAC5D2',
  inverseSurface:       '#313033',
  inverseOnSurface:     '#F4EFF4',
  inversePrimary:       '#BBC2FF',
  surfaceContainerLowest:  '#FFFFFF',
  surfaceContainerLow:     '#F6F1FF',
  surfaceContainer:        '#F0EBFF',
  surfaceContainerHigh:    '#EBE5FF',
  surfaceContainerHighest: '#E5DFFF',
};

// ── Semantic token builder ────────────────────────────────────────────────────
function buildC(M: typeof M3D, isDark: boolean) {
  const green = isDark ? '#A8F0C6' : '#1A6B3A';
  const red   = isDark ? '#FFB4AB' : '#BA1A1A';
  const amber = isDark ? '#F5C842' : '#7A5F00';
  const sky   = isDark ? '#93CCFF' : '#0062A1';
  return {
    bg:          M.background,
    surface:     M.surfaceContainerLow,
    surface2:    M.surfaceContainer,
    surface3:    M.surfaceContainerHigh,
    border:      M.outlineVariant,
    borderLight: M.outline,
    primary:     M.primary,
    primaryDark: M.primaryContainer,
    primaryCont: M.primaryContainer,
    onPrimary:   M.onPrimary,
    green, greenDark: isDark ? '#1D6B45' : '#0D3B26',
    greenCont: isDark ? '#0D3B26' : '#D1FAE5',
    red,   redDark:   isDark ? '#93000A' : '#410002',
    redCont:   isDark ? '#4E0004' : '#FFDAD6',
    amber, amberDark: isDark ? '#7A5F00' : '#3D2E00',
    amberCont: isDark ? '#3D2E00' : '#FFF0C0',
    sky,
    text:  M.onBackground,
    text2: M.onSurfaceVariant,
    text3: M.outline,
    // Legacy aliases
    card: M.surfaceContainerLow,
    card2: M.surfaceContainer,
    indigo: M.primaryContainer,
    indigoLight: M.primary,
    redLight: red,
  };
}

export type ColorTokens = ReturnType<typeof buildC>;

export const C_DARK  = buildC(M3D, true);
export const C_LIGHT = buildC(M3L, false);

// Default export — dark (kept for widget code that imports statically)
export const C = C_DARK;

// ── TREND builder ─────────────────────────────────────────────────────────────
function buildTREND(c: ColorTokens) {
  return {
    up:     { color: c.red,   cont: c.redCont,   emoji: '↑', label: 'RISING',  bg: `${c.red}18`,   border: `${c.red}35`   },
    down:   { color: c.green, cont: c.greenCont, emoji: '↓', label: 'FALLING', bg: `${c.green}18`, border: `${c.green}35` },
    stable: { color: c.amber, cont: c.amberCont, emoji: '→', label: 'STABLE',  bg: `${c.amber}18`, border: `${c.amber}35` },
  };
}

export const TREND       = buildTREND(C_DARK);   // static (widget/legacy)
export const TREND_DARK  = buildTREND(C_DARK);
export const TREND_LIGHT = buildTREND(C_LIGHT);

// ── Spacing & Shape ───────────────────────────────────────────────────────────
export const SP = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32, huge: 48,
};
export const SHAPE = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 28, full: 9999,
};

// ── Paper themes ──────────────────────────────────────────────────────────────
function buildPaperTheme(M: typeof M3D, base: typeof MD3DarkTheme) {
  return {
    ...base,
    colors: {
      ...base.colors,
      primary:              M.primary,
      onPrimary:            M.onPrimary,
      primaryContainer:     M.primaryContainer,
      onPrimaryContainer:   M.onPrimaryContainer,
      secondary:            M.secondary,
      onSecondary:          M.onSecondary,
      secondaryContainer:   M.secondaryContainer,
      onSecondaryContainer: M.onSecondaryContainer,
      tertiary:             M.tertiary,
      onTertiary:           M.onTertiary,
      tertiaryContainer:    M.tertiaryContainer,
      onTertiaryContainer:  M.onTertiaryContainer,
      error:                M.error,
      onError:              M.onError,
      errorContainer:       M.errorContainer,
      onErrorContainer:     M.onErrorContainer,
      background:           M.background,
      onBackground:         M.onBackground,
      surface:              M.surface,
      onSurface:            M.onSurface,
      surfaceVariant:       M.surfaceVariant,
      onSurfaceVariant:     M.onSurfaceVariant,
      outline:              M.outline,
      outlineVariant:       M.outlineVariant,
      inverseSurface:       M.inverseSurface,
      inverseOnSurface:     M.inverseOnSurface,
      inversePrimary:       M.inversePrimary,
      scrim:                '#000000',
      shadow:               '#000000',
      elevation: {
        level0: 'transparent',
        level1: M.surfaceContainerLow,
        level2: M.surfaceContainer,
        level3: M.surfaceContainerHigh,
        level4: M.surfaceContainerHighest,
        level5: M.surfaceContainerHighest,
      },
    },
  };
}

export const paperThemeDark  = buildPaperTheme(M3D, MD3DarkTheme  as any);
export const paperThemeLight = buildPaperTheme(M3L, MD3LightTheme as any);
export const paperTheme      = paperThemeDark; // legacy alias
