import { Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

// ✅ Base scaling factor
export const scaleValue = (size: number) => {
  const scale = Math.max(width / 1000, height / 700);
  return size * scale;
};

// 🎨 Colors
export const Colors = {
  light: {
    text: '#11181C',
    background: '#FFFFFF',
    tint: '#0a7ea4',
    icon: '#687076',
    card: '#F8FAFC',
  },
  dark: {
    text: '#ECEDEE',
    background: '#0F172A',
    tint: '#FFFFFF',
    icon: '#9BA1A6',
    card: '#1E293B',
  },
};

// 🅰️ Fonts
export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  android: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

// 📏 Global Spacing & Font Sizes (auto-scaled)
export const Spacing = {
  xs: scaleValue(4),
  sm: scaleValue(8),
  md: scaleValue(16),
  lg: scaleValue(24),
  xl: scaleValue(32),
};

export const FontSizes = {
  small: scaleValue(12),
  regular: scaleValue(14),
  medium: scaleValue(16),
  large: scaleValue(20),
  xlarge: scaleValue(24),
};

export const LineHeights = {
  small: scaleValue(16),
  regular: scaleValue(20),
  medium: scaleValue(24),
  large: scaleValue(28),
};
