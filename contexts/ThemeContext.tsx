
import React, { createContext, useState, useEffect, useMemo, ReactNode, useContext } from 'react';
import { Theme, AccentColor, ThemeContextType, SidebarStyle } from '../types';
import { TRANSLATIONS } from '../constants';

type ColorPalette = { [key: number]: string };

const ACCENT_PALETTES: Record<AccentColor, ColorPalette> = {
  blue: { 50: '#f0f9ff', 100: '#e0f2fe', 200: '#bae6fd', 300: '#7dd3fc', 400: '#38bdf8', 500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1', 800: '#075985', 900: '#0c4a6e' },
  green: { 50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac', 400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d', 800: '#166534', 900: '#14532d' },
  indigo: { 50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc', 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 800: '#3730a3', 900: '#312e81' },
  rose: { 50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af', 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239', 900: '#881337' },
  orange: { 50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74', 400: '#fb923c', 500: '#f97316', 600: '#ea580c', 700: '#c2410c', 800: '#9a3412', 900: '#7c2d12' },
  slate: { 50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155', 800: '#1e293b', 900: '#0f172a' },
};

const hexToRgb = (hex: unknown): [number, number, number] | null => {
    if (typeof hex !== 'string') return null;
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
        : null;
};

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [theme, setThemeState] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || Theme.System);
    const [accentColor, setAccentColorState] = useState<AccentColor>(() => (localStorage.getItem('accentColor') as AccentColor) || 'orange');
    const [sidebarStyle, setSidebarStyleState] = useState<SidebarStyle>(() => (localStorage.getItem('sidebarStyle') as SidebarStyle) || 'light');
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [language, setLanguageState] = useState<string>(() => localStorage.getItem('language') || 'en');

    useEffect(() => {
        const systemIsDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const currentIsDark = theme === 'dark' || (theme === 'system' && systemIsDark);
        setIsDarkMode(currentIsDark);

        if (currentIsDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);
    
    useEffect(() => {
        const palette = ACCENT_PALETTES[accentColor];
        if (palette) {
            Object.entries(palette).forEach(([shade, hex]) => {
                const rgb = hexToRgb(hex);
                if (rgb) {
                    document.documentElement.style.setProperty(`--color-primary-${shade}`, `${rgb[0]} ${rgb[1]} ${rgb[2]}`);
                }
            });
            if (typeof palette[500] === 'string') {
                document.documentElement.style.setProperty('--accent-color', palette[500]);
            }
        }
    }, [accentColor]);

    const setTheme = (newTheme: Theme) => {
        localStorage.setItem('theme', newTheme);
        setThemeState(newTheme);
    };

    const setAccentColor = (color: AccentColor) => {
        localStorage.setItem('accentColor', color);
        setAccentColorState(color);
    };

    const setSidebarStyle = (style: SidebarStyle) => {
        localStorage.setItem('sidebarStyle', style);
        setSidebarStyleState(style);
    };

    const setLanguage = (lang: string) => {
        localStorage.setItem('language', lang);
        setLanguageState(lang);
    };

    const t = useMemo(() => (key: string, defaultText: string = ''): string => {
        if (!key) return defaultText;
        const translationKey = key.toLowerCase().replace(/ & /g, '_and_').replace(/ /g, '_');
        const translationSet = TRANSLATIONS[translationKey];
        if (translationSet && translationSet[language]) return translationSet[language];
        if (translationSet && translationSet['en']) return translationSet['en'];
        return defaultText || key.replace(/_/g, ' ');
    }, [language]);


    const value = {
        theme,
        setTheme,
        accentColor,
        setAccentColor,
        sidebarStyle,
        setSidebarStyle,
        isDarkMode,
        language,
        setLanguage,
        t
    };

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};