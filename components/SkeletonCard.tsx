import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Colors } from '@/constants/Colors';

export function SkeletonCard() {
  const shimmer = useSharedValue(0.3);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1.0, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [shimmer]);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: shimmer.value,
  }));

  return (
    <Animated.View style={[styles.card, shimmerStyle]}>
      <View style={styles.imagePlaceholder} />
      <View style={styles.content}>
        <View style={styles.titlePlaceholder} />
        <View style={styles.subtitlePlaceholder} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  imagePlaceholder: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: Colors.inputBg,
  },
  content: {
    padding: 12,
    gap: 8,
  },
  titlePlaceholder: {
    height: 16,
    borderRadius: 6,
    backgroundColor: Colors.inputBg,
    width: '60%',
  },
  subtitlePlaceholder: {
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.inputBg,
    width: '40%',
  },
});
