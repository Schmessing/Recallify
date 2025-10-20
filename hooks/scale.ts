import { useWindowDimensions } from 'react-native';

/**
 * A universal scaling hook for responsive font, padding, and layout scaling.
 */
export const useScale = () => {
  const { width, height } = useWindowDimensions();

  // Choose base reference dimensions for scaling
  const scale = Math.max(width / 1000, height / 700);
  const isMobile = width < 450;

  // Apply consistent scaling across styles
  const scaleValue = (value: number) => Math.round(value * scale);

  return { scale, scaleValue, isMobile };
};
