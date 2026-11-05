/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://unistyl.es/), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0f172a',
    background: '#f8fafc',
    card: '#ffffff',
    border: '#e2e8f0',
    backgroundElement: '#f1f5f9',
    backgroundSelected: '#e2e8f0',
    textSecondary: '#64748b',
    primary: '#0e6a79',
    primaryDark: '#0a4b56',
    primaryLight: '#18a39e',
    glow: '#0090bb',
    danger: '#ef4444',
    success: '#10b981',
    warning: '#f59e0b',
  },
  dark: {
    text: '#f8fafc',
    background: '#131314',
    card: '#1e1e20',
    border: '#27272a',
    backgroundElement: '#27272a',
    backgroundSelected: '#3f3f46',
    textSecondary: '#94a3b8',
    primary: '#18a39e',
    primaryDark: '#0e6a79',
    primaryLight: '#2dd4bf',
    glow: '#00f0ff',
    danger: '#f43f5e',
    success: '#34d399',
    warning: '#fbbf24',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
