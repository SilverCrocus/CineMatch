// H5 Theme: Dark Slate + Teal
// Cinematic dark base with fresh teal accents

export const Colors = {
  // Primary accent
  primary: '#00b894',
  primaryLight: '#00cec9',

  // Backgrounds
  background: '#0a0a0a',
  backgroundLight: '#141414',
  card: '#141414',

  // Borders
  border: '#222',
  borderLight: '#333',

  // Text
  text: '#fff',
  textSecondary: '#888',
  textTertiary: '#666',

  // Gradients
  gradientStart: '#2d3436',
  gradientEnd: '#1d1e22',

  // Status colors
  success: '#4ade80',
  error: '#f87171',
  warning: '#fbbf24',

  // Transparent variants
  primaryTransparent: 'rgba(0, 184, 148, 0.15)',
  primaryTransparent20: 'rgba(0, 184, 148, 0.20)',
  successTransparent: 'rgba(74, 222, 128, 0.2)',
  errorTransparent: 'rgba(248, 113, 113, 0.2)',
};

// Legacy export for backwards compatibility
export default {
  light: {
    text: Colors.text,
    background: Colors.background,
    tint: Colors.primary,
    tabIconDefault: Colors.textTertiary,
    tabIconSelected: Colors.primary,
  },
  dark: {
    text: Colors.text,
    background: Colors.background,
    tint: Colors.primary,
    tabIconDefault: Colors.textTertiary,
    tabIconSelected: Colors.primary,
  },
};
