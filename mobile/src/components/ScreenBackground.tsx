import { LinearGradient } from 'expo-linear-gradient';
import { Platform, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';

/**
 * The web app's `glow-top`: a soft lime light falling from the top edge onto the
 * dark page. Web gets the exact radial gradient; native a vertical fade.
 */
export function ScreenBackground() {
  const { colors } = useTheme();
  if (Platform.OS === 'web') {
    return (
      <View
        pointerEvents="none"
        style={[
          styles.fill,
          {
            // @ts-ignore web-only CSS
            backgroundImage: 'radial-gradient(600px 260px at 50% 0%, rgba(212, 255, 46, 0.14), transparent)',
          },
        ]}
      />
    );
  }
  return (
    <View pointerEvents="none" style={styles.fill}>
      <LinearGradient
        colors={['rgba(212, 255, 46, 0.13)', 'rgba(212, 255, 46, 0.04)', colors.bg + '00']}
        locations={[0, 0.45, 1]}
        style={styles.glow}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 300 },
});
