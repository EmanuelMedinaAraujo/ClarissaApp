// Ported from app-example/constants/Colors.ts
const tintColorLight = '#2f95dc';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#24292e',
    background: '#fff',
    tint: tintColorLight,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorLight,
    border: '#e1e4e8',
    card: '#f6f8fa',
    error: '#d73a49',
  },
  dark: {
    text: '#fff',
    background: '#24292e',
    tint: tintColorDark,
    tabIconDefault: '#444',
    tabIconSelected: tintColorDark,
    border: '#444c56',
    card: '#2f363d',
    error: '#f97583',
  },
  // Proposed red theme palette
  red: {
    text: '#fff1f3', // soft white for better readability
    background: '#8B2332', // rich wine red, less harsh than #7b1f2b
    tint: '#FF3B47', // vivid red accent for highlights
    tabIconDefault: '#fff', // non-selected tab icons are white
    tabIconSelected: '#FF3B47', // vivid red accent for selected tab icon
    border: '#A82C3A', // strong border, not too dark
    card: '#A94457', // lighter, warm red for cards
    error: '#FF1744', // standard error red
    accent: '#FF8A80', // light coral accent
    highlight: '#FF5C7A', // bright highlight for buttons/active states
  },
};

export type ThemeName = keyof typeof Colors;
