import { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Colors } from '@/constants/Colors';

interface FABProps {
  onPress: () => void;
}

export function FAB({ onPress }: FABProps) {
  const scale = useSharedValue(0);
  const rotation = useSharedValue(0);
  const isOpen = useSharedValue(false);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 200 });
  }, [scale]);

  const tapGesture = Gesture.Tap().onEnd(() => {
    isOpen.value = !isOpen.value;
    rotation.value = withSpring(isOpen.value ? 45 : 0, { damping: 10 });
    runOnJS(onPress)();
  });

  const fabStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  return (
    <GestureDetector gesture={tapGesture}>
      <Animated.View style={[styles.fab, fabStyle]}>
        <Text style={styles.fabIcon}>+</Text>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  fabIcon: {
    fontSize: 28,
    color: Colors.background,
    fontWeight: 'bold',
    lineHeight: 30,
  },
});
