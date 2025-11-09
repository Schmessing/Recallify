import { Dimensions } from 'react-native';
const { width, height } = Dimensions.get('window');

export const scaleValue = (size: number) => {
  const scale = Math.max(width / 1000, height / 700);
  return size * scale;
};

export const Colors = {
  light: { text: '#0B3D3B', background: '#FAF8F2', card: '#DDF5F2', teal: '#00BFA6' },
  dark:  { text: '#ECEDEE', background: '#0F172A', card: '#1E293B', teal: '#00BFA6' },
};

export const Spacing = { sm: 8, md: 16, lg: 24 };
export const FontSizes = {
  small: scaleValue(12), regular: scaleValue(14), medium: scaleValue(16),
  large: scaleValue(20), xlarge: scaleValue(24),
};
export const LineHeights = {
  small: scaleValue(16), regular: scaleValue(20),
  medium: scaleValue(24), large: scaleValue(28),
};
