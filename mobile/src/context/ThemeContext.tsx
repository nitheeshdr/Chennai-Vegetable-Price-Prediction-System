import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  C_DARK, C_LIGHT, TREND_DARK, TREND_LIGHT,
  paperThemeDark, paperThemeLight,
  ColorTokens,
} from '../theme';

type TrendTokens = typeof TREND_DARK;

interface ThemeCtx {
  isDark: boolean;
  toggleTheme: () => void;
  C: ColorTokens;
  TREND: TrendTokens;
  paperTheme: typeof paperThemeDark;
}

const ThemeContext = createContext<ThemeCtx>({
  isDark: true,
  toggleTheme: () => {},
  C: C_DARK,
  TREND: TREND_DARK,
  paperTheme: paperThemeDark,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('@app_theme').then(v => {
      if (v !== null) setIsDark(v === 'dark');
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark(prev => {
      const next = !prev;
      AsyncStorage.setItem('@app_theme', next ? 'dark' : 'light');
      return next;
    });
  }, []);

  const value = useMemo<ThemeCtx>(() => ({
    isDark,
    toggleTheme,
    C:          isDark ? C_DARK  : C_LIGHT,
    TREND:      isDark ? TREND_DARK  : TREND_LIGHT,
    paperTheme: isDark ? paperThemeDark : paperThemeLight,
  }), [isDark, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useC():            ColorTokens   { return useContext(ThemeContext).C; }
export function useTREND():        TrendTokens   { return useContext(ThemeContext).TREND; }
export function useIsDark():       boolean       { return useContext(ThemeContext).isDark; }
export function useToggleTheme():  () => void    { return useContext(ThemeContext).toggleTheme; }
export function useAppTheme():     ThemeCtx      { return useContext(ThemeContext); }
