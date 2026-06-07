# Task 12 - Animations & Gestures

## Goal

Elevate TravelSnap from a functional app to a polished native-feeling product by adding fluid animations and gesture interactions. You will implement animated list entry, spring-powered tap feedback, swipe-to-delete with gestures, an animated FAB, and — optionally - skeleton loading, shared element transitions, and a parallax header.

---

## Step 0 - Installation & Configuration

**Goal:** install the libraries and configure the environment so shared values work correctly.

**Files:** `package.json`, `app/_layout.tsx` *(+ `babel.config.js` only on SDK ≤ 51)*

### Step 0a - check your Expo SDK version

Open `package.json` and find the `"expo"` field:

```json
// package.json (excerpt)
{
  "dependencies": {
    "expo": "~52.0.0"   // <-- check this number
  }
}
```

- **SDK 52 or higher** → New Architecture is active by default; reanimated works without any Babel config - **skip to 0c**
- **SDK 51 or lower** → Babel plugin is required - **complete 0b first, then 0c**

### Step 0b - Babel plugin *(SDK ≤ 51 only)*

If you don't have a `babel.config.js`, create one in the project root. Add the reanimated plugin as the **last** entry in the `plugins` array:

```js
// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // ... any other plugins
      'react-native-reanimated/plugin', // MUST be last!
    ],
  };
};
```

After saving, clear the Metro cache:

```bash
npx expo start --clear
```

> **Why last?** Reanimated must process code after all other transforms. If it isn't last, shared values are silently ignored — no errors, no animations.

### Step 0c - install packages and add GestureHandlerRootView

```bash
npx expo install react-native-reanimated react-native-gesture-handler
```

```tsx
// app/_layout.tsx
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* rest of navigation */}
    </GestureHandlerRootView>
  );
}
```

> **Pitfall:** `GestureHandlerRootView` must wrap the ENTIRE app tree — adding it to a single screen means gestures silently fail on all other screens.

---

## Step 1 - useSharedValue + useAnimatedStyle

**Goal:** understand the fundamentals of reanimated: shared values and animated styles.

**Files:** any test component, or directly in `components/AnimatedTripCard.tsx`

**Requirements:**
1. Use `useSharedValue` to hold an animated value (e.g. opacity, scale).
2. Use `useAnimatedStyle` to map the value to a style object.
3. Wrap the view in `Animated.View` (from reanimated).

```tsx
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

function AnimatedBox() {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.box, animatedStyle]}>
      {/* content */}
    </Animated.View>
  );
}
```

> **Pitfall:** Do NOT use `Animated.View` from `react-native` together with `useAnimatedStyle` from reanimated - they are two separate animation systems that do not interoperate.

---

## Step 2 - List Entry Animation (FadeInDown)

**Goal:** TripCard items appear with an entry animation on first render.

**Files:** `components/AnimatedTripCard.tsx`, `app/(tabs)/index.tsx`

**Requirements:**
1. Wrap the card in `Animated.View` with the `entering` prop.
2. Use `FadeInDown.delay(index * 80).springify()` - each card with a different delay.
3. In `app/(tabs)/index.tsx` replace `FlatList` with `Animated.FlatList` and render `AnimatedTripCard`.

```tsx
// components/AnimatedTripCard.tsx
import Animated, { FadeInDown } from 'react-native-reanimated';

interface AnimatedTripCardProps {
  trip: Trip;
  index: number;
  onDelete: (id: string) => void;
}

export function AnimatedTripCard({ trip, index, onDelete }: AnimatedTripCardProps) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 80).springify()}>
      <TripCard trip={trip} onDelete={onDelete} />
    </Animated.View>
  );
}
```

```tsx
// app/(tabs)/index.tsx - fragment
import Animated from 'react-native-reanimated';

<Animated.FlatList
  data={trips}
  keyExtractor={(item) => item.id}
  renderItem={({ item, index }) => (
    <AnimatedTripCard
      trip={item}
      index={index}
      onDelete={deleteTrip}
    />
  )}
/>
```

> **Pitfall:** The standard React Native `FlatList` ignores the `entering` prop on its items. You must use `Animated.FlatList` from reanimated.

---

## Step 3 - Tap Feedback (Scale Spring)

**Goal:** the card "bounces" on tap - a native-feeling touch interaction.

**Files:** `components/AnimatedTripCard.tsx`

**Requirements:**
1. Add `Gesture.Tap()` from `react-native-gesture-handler`.
2. On `onBegin` shrink scale to `0.97`, on `onFinalize` return to `1.0`.
3. Wrap the card in `GestureDetector` inside `Animated.View`.

```tsx
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

export function AnimatedTripCard({ trip, index, onDelete }: AnimatedTripCardProps) {
  const scale = useSharedValue(1);

  const tapGesture = Gesture.Tap()
    .onBegin(() => {
      scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
    })
    .onFinalize(() => {
      scale.value = withSpring(1.0, { damping: 10, stiffness: 200 });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 80).springify()}
      style={animatedStyle}
    >
      <GestureDetector gesture={tapGesture}>
        <TripCard trip={trip} onDelete={onDelete} />
      </GestureDetector>
    </Animated.View>
  );
}
```

---

## Step 4 - Layout Animations (Smooth Removal)

**Goal:** when a card is deleted the remaining cards smoothly fill the gap.

**Files:** `components/AnimatedTripCard.tsx`, `app/(tabs)/index.tsx`

**Requirements:**
1. Add `exiting={FadeOutLeft.springify()}` to the card's `Animated.View`.
2. Add `itemLayoutAnimation={LinearTransition.springify()}` to `Animated.FlatList`.
3. Ensure `keyExtractor` returns stable, unique keys.

```tsx
// Animated.View on the card
<Animated.View
  entering={FadeInDown.delay(index * 80).springify()}
  exiting={FadeOutLeft.springify()}
  style={animatedStyle}
>

// Animated.FlatList
<Animated.FlatList
  data={trips}
  keyExtractor={(item) => item.id}
  itemLayoutAnimation={LinearTransition.springify()}
  renderItem={...}
/>
```

> **Pitfall:** `Layout.springify()` (old API) is deprecated. Use `itemLayoutAnimation` on the FlatList with `LinearTransition.springify()` or `CurvedTransition`.

---

## Step 5 - Swipe-to-Delete (Pan Gesture)

**Goal:** swiping a card left past a threshold removes it with animation.

**Files:** `components/AnimatedTripCard.tsx`

**Requirements:**
1. Add `useSharedValue` for `translateX`.
2. Configure `Gesture.Pan()` - update `translateX` in `onUpdate`, check threshold (-80px) in `onEnd`.
3. If threshold exceeded: animate to `-500`, then call `runOnJS(onDelete)(trip.id)`.
4. If threshold not exceeded: spring back to `0`.

```tsx
import { runOnJS } from 'react-native-reanimated';

export function AnimatedTripCard({ trip, index, onDelete }: AnimatedTripCardProps) {
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);

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

  const tapGesture = Gesture.Tap()
    .onBegin(() => { scale.value = withSpring(0.97); })
    .onFinalize(() => { scale.value = withSpring(1.0); });

  // Compose: tap and pan work simultaneously
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
          <TripCard trip={trip} onDelete={onDelete} />
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}
```

> **Pitfall:** `runOnJS` is required - you cannot call `onDelete` (a JS function) directly from the `.onEnd` callback because it runs on the UI thread.

---

## Step 6 - Animated FAB (Floating Action Button)

**Goal:** a "+" button that appears with animation and rotates on tap.

**Files:** `components/FAB.tsx`, `app/(tabs)/index.tsx`

**Requirements:**
1. Use `withSpring` to animate scale on mount.
2. Add `useSharedValue` for rotation - rotate 45 degrees on tap.
3. Accept `onPress` as a prop, call it via `runOnJS`.

```tsx
// components/FAB.tsx
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useEffect } from 'react';

interface FABProps {
  onPress: () => void;
}

export function FAB({ onPress }: FABProps) {
  const scale = useSharedValue(0);
  const rotation = useSharedValue(0);
  const isOpen = useSharedValue(false);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 200 });
  }, []);

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
    backgroundColor: '#61DAFB',
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
    color: '#0A1628',
    fontWeight: 'bold',
    lineHeight: 30,
  },
});
```

---

## Step 7: Skeleton Loading (Shimmer)

**Goal:** display an animated placeholder while API data loads.

**Files:** `components/SkeletonCard.tsx`, `app/(tabs)/explore.tsx`

**Requirements:**
1. Use `useSharedValue` + `withRepeat(withTiming(...), -1, true)` for the shimmer animation.
2. Interpolate the value to opacity (e.g. 0.3 → 1.0 → 0.3).
3. Render several gray rectangles shaped like a card.

```tsx
// components/SkeletonCard.tsx
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';

export function SkeletonCard() {
  const shimmer = useSharedValue(0.3);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1.0, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,    // infinite repetitions
      true   // reverse (pulsing effect)
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: shimmer.value,
  }));

  return (
    <Animated.View style={[styles.card, shimmerStyle]}>
      <View style={styles.imagePlaceholder} />
      <View style={styles.titlePlaceholder} />
      <View style={styles.subtitlePlaceholder} />
    </Animated.View>
  );
}
```

> **Pitfall:** `withRepeat(-1, true)` - `-1` means infinite repetitions, `true` enables reverse (breathing shimmer). Without `true`, the shimmer jumps abruptly back to the start value.

---

## Step 8: Shared Element Transition

**Goal:** the photo from the list card "flows" animatedly to the detail screen.

**Files:** `components/AnimatedTripCard.tsx`, `app/trip/[id].tsx`

**Requirements:**
1. Add `sharedTransitionTag` to the Image on the list card.
2. Add the same `sharedTransitionTag` to the Image on the detail screen.
3. The tag must be unique per trip (e.g. `trip-image-${trip.id}`).

```tsx
// On list card (AnimatedTripCard.tsx)
import Animated from 'react-native-reanimated';

<Animated.Image
  source={{ uri: trip.imageUri }}
  sharedTransitionTag={`trip-image-${trip.id}`}
  style={styles.cardImage}
/>

// On detail screen (app/trip/[id].tsx)
<Animated.Image
  source={{ uri: trip.imageUri }}
  sharedTransitionTag={`trip-image-${trip.id}`}
  style={styles.detailImage}
/>
```

> **Pitfall:** `sharedTransitionTag` is case-sensitive. `"trip-image-1"` and `"Trip-Image-1"` are different tags - the transition will not work.

---

## Step 9: Parallax Header

**Goal:** the header image on the detail screen scales and translates on scroll.

**Files:** `app/trip/[id].tsx`

**Requirements:**
1. Use `Animated.ScrollView` (from reanimated) and `useScrollViewOffset` to track scroll position.
2. Interpolate scroll offset to `translateY` and `scale` of the header.
3. The header should scroll slower than the content (parallax effect).

```tsx
import Animated, {
  useAnimatedRef,
  useScrollViewOffset,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

const HEADER_HEIGHT = 280;

export default function TripDetail() {
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollY = useScrollViewOffset(scrollRef);

  const headerStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [-HEADER_HEIGHT, 0, HEADER_HEIGHT],
      [-HEADER_HEIGHT / 2, 0, HEADER_HEIGHT * 0.75],
      Extrapolation.CLAMP
    );
    const scale = interpolate(
      scrollY.value,
      [-HEADER_HEIGHT, 0],
      [2, 1],
      Extrapolation.CLAMP
    );
    return { transform: [{ translateY }, { scale }] };
  });

  return (
    <Animated.ScrollView ref={scrollRef}>
      <Animated.View style={[styles.header, headerStyle]}>
        <Image source={{ uri: trip.imageUri }} style={styles.headerImage} />
      </Animated.View>
      {/* rest of content */}
    </Animated.ScrollView>
  );
}
```

---

## Step 10: Gesture-Based Rating

**Goal:** drag a finger across the stars to set the rating instead of tapping individual stars.

**Files:** `components/RatingStars.tsx`

**Requirements:**
1. Measure the stars container width via `onLayout`.
2. Add `Gesture.Pan()` - in `onUpdate` compute rating from `translationX / (containerWidth / maxStars)`.
3. Call `runOnJS(onRatingChange)(newRating)` on each change.

---

## Step 11: Staggered Grid Animation

**Goal:** cards on the Explore tab appear in a cascading sequence.

**Files:** `app/(tabs)/explore.tsx`

**Requirements:**
1. Wrap each `DestinationCard` in `Animated.View` with `entering`.
2. Use `FadeInDown.delay(index * 100).springify()`.
3. Add extra offset delay for the right column (e.g. `index * 100 + (column * 50)`).

---

## Step 12: Heart Animation (Like)

**Goal:** the like button on a card explodes with a spring animation and changes color.

**Files:** `components/AnimatedTripCard.tsx` or a new `components/LikeButton.tsx`

**Requirements:**
1. `useSharedValue` for heart scale and color.
2. On tap: `withSequence(withSpring(1.4), withSpring(1.0))`.
3. Smooth color transition: interpolate from gray to accent red.

---
