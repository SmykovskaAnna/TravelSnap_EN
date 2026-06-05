# Task 10 - Performance & Images

## Goal

Optimize TravelSnap foƒr production-level performance. You will tune the
FlatList with performance props, add memoization where it actually
matters, and replace the default React Native `Image` component with
`expo-image` featuring disk caching, transitions, and blurhash placeholders.

---

## Step 0 - Setup

Install `expo-image`:

```bash
npx expo install expo-image
```

Verify that `expo-image` appears in `package.json` under `dependencies`.

---

## Step 1 - FlatList tuning in `app/(tabs)/index.tsx`

**Goal:** Eliminate unnecessary element measurements and limit how many cards are rendered at once.

In `app/(tabs)/index.tsx`, add performance props to your `<FlatList>`:

```tsx
const CARD_HEIGHT = 120;

<FlatList
  data={trips}
  keyExtractor={(item) => item.id}
  getItemLayout={(_, index) => ({
    length: CARD_HEIGHT,
    offset: CARD_HEIGHT * index,
    index,
  })}
  initialNumToRender={10}
  windowSize={5}
  renderItem={({ item }) => (
    <TripCard trip={item} onPress={handleTripPress} />
  )}
/>
```

### Requirements

1. `keyExtractor` returns `item.id` (a string).
2. `getItemLayout` relies on a `CARD_HEIGHT` constant - measure the actual card height and adjust the value.
3. `initialNumToRender={10}` - render 10 cards on mount (not the entire list).
4. `windowSize={5}` - keep 5 screens-worth of items in memory (2 before, current, 2 after).

> **Pitfall:** `getItemLayout` only works correctly when every item has the same height. If your `TripCard` wraps titles onto two lines, either measure the maximum height and use that, or drop `getItemLayout` entirely.

---

## Step 2 - `React.memo` on `TripCard`

**Goal:** Prevent re-renders of cards whose props have not changed.

### 2a. Wrap `TripCard` with `React.memo`

In `components/TripCard.tsx`:

```tsx
import React from 'react';

interface TripCardProps {
  trip: Trip;
  onPress: (id: string) => void;
}

export const TripCard = React.memo(function TripCard({
  trip,
  onPress,
}: TripCardProps) {
  // ...existing component code
});
```

### 2b. Stabilize handlers in the parent

In `app/(tabs)/index.tsx`:

```tsx
import { useCallback } from 'react';

const handleTripPress = useCallback((id: string) => {
  router.push(`/trip/${id}`);
}, [router]);
```

### Requirements

1. `TripCard` is exported as `React.memo(function TripCard(...))`.
2. The `onPress` handler in the parent is wrapped in `useCallback` - without this, `React.memo` has no effect (every parent render creates a new function reference).
3. Verify in the React DevTools Profiler that `TripCard` does not re-render when unrelated state changes.

> **Pitfall:** `React.memo` compares props shallowly. If you pass an inline object to `TripCard` (e.g. `style={{ margin: 10 }}`), memo will still re-render - move the style to `StyleSheet.create`.

---

## Step 3 — Migrate to `expo-image`

**Goal:** Replace the default React Native `Image` with the more performant `expo-image` featuring caching and transitions.

### 3a. `TripCard.tsx`

```tsx
// BEFORE:
import { Image } from 'react-native';
<Image source={{ uri: trip.imageUrl }} resizeMode="cover" />

// AFTER:
import { Image } from 'expo-image';
<Image
  source={{ uri: trip.imageUrl }}
  contentFit="cover"
  cachePolicy="memory-disk"
  transition={200}
  style={styles.image}
/>
```

### 3b. `DestinationCard.tsx` and `CountryCard.tsx`

Same pattern - change the import and replace `resizeMode` with `contentFit`.

### 3c. Hero image in `app/trip/[id].tsx`

```tsx
import { Image } from 'expo-image';

<Image
  source={{ uri: trip.imageUrl }}
  contentFit="cover"
  cachePolicy="memory-disk"
  transition={300}
  style={styles.heroImage}
/>
```

### Requirements

1. All 4 files: change the import to `expo-image`.
2. Replace `resizeMode` → `contentFit` (same values: `"cover"`, `"contain"`).
3. Add `cachePolicy="memory-disk"` and `transition={200}` (or 300 for hero).

> **Pitfall:** `expo-image` does not have `defaultSource`. If you were using it in React Native, replace with `placeholder={{ uri: localAsset }}` or `placeholder={{ blurhash: '...' }}`.

---

## Step 4 - Blurhash placeholder on hero image

**Goal:** Show an elegant gradient placeholder instead of empty space while the hero image loads.

In `app/trip/[id].tsx`:

```tsx
<Image
  source={{ uri: trip.imageUrl }}
  placeholder={{ blurhash: 'LGF5]+Yk^6#M@-5c,1J5@[or[Q6.' }}
  contentFit="cover"
  cachePolicy="memory-disk"
  transition={300}
  style={styles.heroImage}
/>
```

### Requirements

1. Add the `placeholder` prop with a `{ blurhash: '...' }` object.
2. Generate your own blurhash at https://blurha.sh or use the sample string above.
3. Confirm that a colored gradient is visible before the image loads, followed by a smooth transition.

> **Pitfall:** A blurhash is a ~20-30 character string - it requires no fetch and is compiled into the JS bundle. Hardcode it; do not generate it dynamically.

---

## Step 5 - `useMemo` for sorted trip list

**Goal:** Memoize an expensive computation so it does not re-run on every render.

In `app/(tabs)/index.tsx`:

```tsx
import { useMemo } from 'react';

const sortedTrips = useMemo(() => {
  return [...trips].sort((a, b) => b.rating - a.rating);
}, [trips]);
```

### Requirements

1. Wrap the sorted / filtered list in `useMemo`.
2. The dependency array contains `[trips]` - recomputes only when the trips array changes.
3. Pass `sortedTrips` (not `trips`) to `<FlatList data={...}>`.

> **Pitfall:** Do not wrap trivial operations like `trips.length` or `x + 1` in `useMemo`. The hook has overhead (closure allocation, dep-check, GC) - for cheap operations the hook costs more than it saves.

---

## Step 6 - Additional FlatList props

**Goal:** Fine-tune `removeClippedSubviews` and `maxToRenderPerBatch` for better RAM usage and fill-rate.

```tsx
<FlatList
  data={sortedTrips}
  keyExtractor={(item) => item.id}
  getItemLayout={(_, index) => ({
    length: CARD_HEIGHT,
    offset: CARD_HEIGHT * index,
    index,
  })}
  initialNumToRender={10}
  maxToRenderPerBatch={8}
  windowSize={5}
  removeClippedSubviews={true}
  renderItem={({ item }) => (
    <TripCard trip={item} onPress={handleTripPress} />
  )}
/>
```

### Requirements

1. `removeClippedSubviews={true}` - unmounts off-screen views (mainly benefits Android).
2. `maxToRenderPerBatch={8}` - render 8 items per batch while scrolling.
3. Test on a physical device (emulators do not reflect real-world performance).

> **Pitfall:** `removeClippedSubviews` on iOS can cause visual artifacts (blank spaces during fast scrolling). If you see issues, disable on iOS only: `removeClippedSubviews={Platform.OS === 'android'}`.

---

## Step 7 - List pagination (STRETCH)

**Goal:** Simulate infinite-scroll data loading.

1. Create `utils/dummyTrips.ts` - a function that generates 200 dummy trips.
2. Keep `visibleTrips` in state - start with the first 20.
3. Add to `FlatList`:

```tsx
onEndReached={loadMore}
onEndReachedThreshold={0.5}
ListFooterComponent={isLoadingMore ? <ActivityIndicator /> : null}
```

4. `loadMore` appends the next 20 items with a 500ms delay (`setTimeout`).

> **Pitfall:** `onEndReached` can fire multiple times before the first load completes. Use an `isLoadingMore` flag to ignore duplicate calls.

---

## Step 8 - Profiling session with React DevTools (STRETCH)

**Goal:** Measure the actual impact of your optimizations.

1. Open React DevTools → Profiler tab.
2. Record a session: open the list, scroll 3 times, navigate back.
3. Check: how many times `TripCard` re-rendered, list render duration, whether `useMemo` prevents recomputation.
4. Take a screenshot and attach it to your PR.

> **Pitfall:** The Profiler in dev mode is slower than a production build. Do not treat absolute milliseconds as truth - what matters is the relative difference (before vs after).

---