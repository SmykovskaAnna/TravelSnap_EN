import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeInDown,
  FadeOutLeft,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { TripCard } from '@/components/TripCard';
import type { Trip } from '@/types/trip';

interface AnimatedTripCardProps {
  trip: Trip;
  index: number;
  onPress: (id: string) => void;
  onDelete: (id: string) => void;
}

export function AnimatedTripCard({ trip, index, onPress, onDelete }: AnimatedTripCardProps) {
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);

  // Tap — spring bounce
  const tapGesture = Gesture.Tap()
    .onBegin(() => {
      scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
    })
    .onFinalize(() => {
      scale.value = withSpring(1.0, { damping: 10, stiffness: 200 });
      runOnJS(onPress)(trip.id);
    });

  // Pan — swipe left to delete
  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((e) => {
      if (e.translationX < 0) {
        translateX.value = e.translationX;
      }
    })
    .onEnd((e) => {
      if (e.translationX < -80) {
        translateX.value = withTiming(-500, { duration: 300 }, (finished) => {
          if (finished) runOnJS(onDelete)(trip.id);
        });
      } else {
        translateX.value = withSpring(0);
      }
    });

  const composedGesture = Gesture.Simultaneous(tapGesture, panGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 80).springify()}
      exiting={FadeOutLeft.springify()}
    >
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={animatedStyle}>
          <TripCard
            trip={trip}
            onPress={onPress}
            onDelete={() => onDelete(trip.id)}
          />
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}
