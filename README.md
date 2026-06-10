# Task 13 - Networking & Offline

---

## Goal

After completing this task the TravelSnap app will:

- manage server state via **TanStack Query** (cache, stale-while-revalidate, retry)
- persist the query cache across app restarts (**AsyncStorage persister**)
- display an animated banner when there is no internet connection (**OfflineBanner**)
- pause HTTP queries when offline (`enabled: isConnected`)
- perform **optimistic updates** for adding and deleting trips
- **roll back** optimistic changes if the storage write fails
- replace the custom `useFetch` hook with `useQuery` from TanStack Query

---

## Step 0 - Installation & QueryClient `[CORE]`

### 0a. Install dependencies

```bash
npx expo install @tanstack/react-query \
  @tanstack/query-async-storage-persister \
  @tanstack/react-query-persist-client \
  @react-native-community/netinfo
```

### 0b. Create `lib/queryClient.ts`

```tsx
import { QueryClient } from '@tanstack/react-query';

// Create OUTSIDE component - one instance for the whole app lifecycle
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:  1000 * 60 * 5,              // 5 min - data considered fresh
      gcTime:     1000 * 60 * 60 * 24 * 7,   // 7 days - must match persister maxAge
      retry: 3,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
    },
    mutations: {
      retry: 0, // do not retry mutations automatically
    },
  },
});
```

> **Pitfall:** `gcTime` must be **equal to or greater than** the persister's `maxAge` (7 days in Step 0d).
> The default `gcTime` is only 5 minutes - data would be garbage-collected from memory
> before the persister has a chance to write it to AsyncStorage.

### 0c. Create `utils/persister.ts`

```tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

export const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
});
```

### 0d. Create `providers/QueryProvider.tsx`

```tsx
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient } from '../lib/queryClient';
import { persister }    from '../utils/persister';

const SEVEN_DAYS = 1000 * 60 * 60 * 24 * 7;

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: SEVEN_DAYS }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
```

> **Pitfall:** Use `PersistQueryClientProvider`, not the regular `QueryClientProvider`.
> The regular provider silently ignores `persistOptions` - no compile error, but persistence won't work.

### 0e. Wrap `app/_layout.tsx` with QueryProvider

```tsx
import { QueryProvider } from '../providers/QueryProvider';

export default function RootLayout() {
  return (
    <QueryProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack>
          {/* rest of layout - OfflineBanner added in Step 5 */}
        </Stack>
      </GestureHandlerRootView>
    </QueryProvider>
  );
}
```

---

## Step 1 - useTripsQuery `[CORE]`

Create `hooks/useTripsQuery.ts`:

```tsx
import { useQuery } from '@tanstack/react-query';
import { loadTrips } from '../utils/tripStorage';
import type { Trip } from '../types/trip';

export function useTripsQuery() {
  return useQuery<Trip[]>({
    queryKey: ['trips'],
    queryFn:  loadTrips,
    staleTime: Infinity, // local data - never stale, invalidate manually after mutation
  });
}
```

Update `app/(tabs)/index.tsx` - replace direct TripContext reads with `useTripsQuery`:

```tsx
import { useTripsQuery } from '../../hooks/useTripsQuery';

export default function HomeScreen() {
  const { data: trips = [], isLoading } = useTripsQuery();

  if (isLoading) return <SkeletonCard />;

  return (
    <Animated.FlatList
      data={trips}
      keyExtractor={(item) => item.id}
      renderItem={({ item, index }) => (
        <AnimatedTripCard trip={item} index={index} />
      )}
      itemLayoutAnimation={LinearTransition.springify()}
    />
  );
}
```

> **Pitfall:** `staleTime: Infinity` means `useTripsQuery` will never automatically refetch.
> You must call `queryClient.invalidateQueries({ queryKey: ['trips'] })` in the `onSettled`
> callback of every mutation that touches the trips list.

---

## Step 2 - useMutation addTrip (optimistic) `[CORE]`

Create `hooks/useTripMutations.ts` (addTrip section):

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { saveTrip } from '../utils/tripStorage';
import type { Trip, TripData } from '../types/trip';

export function useAddTrip() {
  const qc = useQueryClient();

  return useMutation<Trip, Error, TripData>({
    mutationFn: saveTrip,

    onMutate: async (newData) => {
      // Cancel outgoing refetches to avoid overwriting the optimistic update
      await qc.cancelQueries({ queryKey: ['trips'] });

      // Save snapshot for potential rollback
      const previous = qc.getQueryData<Trip[]>(['trips']) ?? [];

      // Optimistically add the new trip to the cache
      const optimistic: Trip = {
        ...newData,
        id: `optimistic-${Date.now()}`,
      };
      qc.setQueryData<Trip[]>(['trips'], [optimistic, ...previous]);

      // Return context - passed as 3rd arg to onError
      return { previous };
    },

    onError: (_err, _vars, ctx) => {
      // Rollback to snapshot on failure
      if (ctx?.previous) {
        qc.setQueryData(['trips'], ctx.previous);
      }
    },

    onSettled: () => {
      // Always invalidate after success OR error - sync with real storage
      qc.invalidateQueries({ queryKey: ['trips'] });
    },
  });
}
```

> **Pitfall:** `onMutate` **must return** `{ previous }`.
> This object arrives as `context` (third argument) in `onError`.
> Without `return`, rollback has nothing to restore.

> **Pitfall:** Do not call `invalidateQueries` in `onSuccess` when using optimistic updates.
> It causes a double UI update - call it only in `onSettled`.

---

## Step 3 - useMutation deleteTrip (optimistic) `[CORE]`

Add to `hooks/useTripMutations.ts`:

```tsx
// Add deleteTrip to the import at the top of the file:
import { saveTrip, deleteTrip } from '../utils/tripStorage';

export function useDeleteTrip() {
  const qc = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: deleteTrip, // already exists in utils/tripStorage.ts

    onMutate: async (tripId) => {
      await qc.cancelQueries({ queryKey: ['trips'] });
      const previous = qc.getQueryData<Trip[]>(['trips']) ?? [];

      // Optimistically remove from cache
      qc.setQueryData<Trip[]>(
        ['trips'],
        previous.filter((t) => t.id !== tripId)
      );

      return { previous };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(['trips'], ctx.previous);
      }
    },

    onSettled: () => qc.invalidateQueries({ queryKey: ['trips'] }),
  });
}
```

---

## Step 4 - Persistence (AsyncStorage persister) `[CORE]`

The persister was configured in Step 0c and wired up in Step 0d.
`lib/queryClient.ts` from Step 0b already has `gcTime: 7 days` - matching `maxAge`.

**Verify persistence:** Fully close the app (wait ~10 s), then reopen it **without internet**.
The trip list and Explore data should be visible **before** the first network request fires.

Confirm in Expo Dev Tools Network tab that no HTTP request is made on cold start.

> **Key rule:** `gcTime` >= `maxAge` always. Default `gcTime` is 5 minutes -
> never set `maxAge` longer than `gcTime` or data will be evicted before it is written.

---

## Step 5 - Network status & OfflineBanner `[CORE]`

### 5a. Create `hooks/useNetworkStatus.ts`

```tsx
import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';

interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean;
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true,          // assume connected until first event
    isInternetReachable: true,
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setStatus({
        isConnected:         state.isConnected         ?? true, // null = unknown, assume true
        isInternetReachable: state.isInternetReachable ?? true,
      });
    });
    return unsubscribe; // cleanup on unmount
  }, []);

  return status;
}
```

> **Pitfall:** NetInfo can briefly return `null` for both fields on a cold start.
> Fall back to `true` (not `false`) - otherwise you block all queries on first launch.

### 5b. Create `components/OfflineBanner.tsx`

```tsx
import { StyleSheet, Text } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

export function OfflineBanner() {
  const { isConnected } = useNetworkStatus();

  if (isConnected) return null;

  return (
    <Animated.View
      entering={FadeInDown.duration(300)}
      exiting={FadeOutUp.duration(300)}
      style={styles.banner}
    >
      <Text style={styles.icon}>📡</Text>
      <Text style={styles.text}>No internet connection</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#E94560',
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 999,
  },
  icon: { fontSize: 16 },
  text: { color: '#fff', fontWeight: '600', fontSize: 13 },
});
```

### 5c. Add OfflineBanner to root layout

In `app/_layout.tsx`, add the banner above `<Stack>`:

```tsx
import { OfflineBanner } from '../components/OfflineBanner';

// inside RootLayout return:
<QueryProvider>
  <GestureHandlerRootView style={{ flex: 1 }}>
    <OfflineBanner />
    <Stack>
      {/* ... */}
    </Stack>
  </GestureHandlerRootView>
</QueryProvider>
```

### 5d. Pause queries when offline

The `enabled: isConnected` guard is added in the query hooks created in Step 6.

---

## Step 6 - Replace useFetch with useQuery `[CORE]`

### 6a. Create `hooks/useCountriesQuery.ts`

```tsx
import { useQuery } from '@tanstack/react-query';
import { COUNTRY_API } from '../constants/api';
import { useNetworkStatus } from './useNetworkStatus';
import type { Country } from '../types/country';

export function useCountriesQuery() {
  const { isConnected } = useNetworkStatus();

  return useQuery<Country[]>({
    queryKey: ['countries'],
    queryFn:  () => fetch(COUNTRY_API).then((r) => r.json()),
    staleTime: 1000 * 60 * 60, // 1h - country data rarely changes
    enabled:   isConnected,    // pause when offline
  });
}
```

### 6b. Create `hooks/useUnsplashQuery.ts`

```tsx
import { useQuery } from '@tanstack/react-query';
import { UNSPLASH_KEY } from '../constants/api';
import { useNetworkStatus } from './useNetworkStatus';

export function useUnsplashQuery(searchTerm: string) {
  const { isConnected } = useNetworkStatus();

  return useQuery({
    queryKey: ['unsplash', searchTerm],
    queryFn: async () => {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchTerm)}&per_page=10`,
        { headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` } }
      );
      if (!res.ok) throw new Error(`Unsplash error: ${res.status}`);
      return res.json();
    },
    enabled:   isConnected && !!searchTerm,
    staleTime: 1000 * 60 * 30, // 30 min
  });
}
```

### 6c. Update `app/(tabs)/explore.tsx`

```tsx
import { useCountriesQuery } from '../../hooks/useCountriesQuery';
import { useUnsplashQuery }  from '../../hooks/useUnsplashQuery';
import { SkeletonCard }      from '../../components/SkeletonCard';
import { ErrorView }         from '../../components/ErrorView';

export default function ExploreScreen() {
  const {
    data: countries,
    isLoading,
    isError,
    refetch,
  } = useCountriesQuery();

  if (isLoading) return <SkeletonCard />;
  if (isError)   return <ErrorView onRetry={refetch} />;

  return (
    <FlatList
      data={countries}
      keyExtractor={(item) => item.cca2}
      renderItem={({ item }) => <CountryCard country={item} />}
    />
  );
}
```

---

## Step 7 - Background refetch on foreground return `[STRETCH]`

Add to `providers/QueryProvider.tsx` (or a dedicated `useAppStateFocus` hook):

```tsx
import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { focusManager } from '@tanstack/react-query';

function useAppStateFocus() {
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (state: AppStateStatus) => {
        // Tell React Query when the app returns to the foreground
        focusManager.setFocused(state === 'active');
      }
    );
    return () => subscription.remove();
  }, []);
}
```

Call `useAppStateFocus()` inside the `QueryProvider` component.

> **Why?** `refetchOnWindowFocus` only works in web browsers.
> In React Native you must manually wire `AppState` to `focusManager`.

---

## Step 8 - useInfiniteQuery (Explore pagination) `[STRETCH]`

Replace `useCountriesQuery` or `useUnsplashQuery` with a paginated version:

```tsx
import { useInfiniteQuery } from '@tanstack/react-query';
import { UNSPLASH_KEY } from '../constants/api';

const PAGE_SIZE = 10;

export function useUnsplashInfiniteQuery(searchTerm: string) {
  return useInfiniteQuery({
    queryKey: ['unsplash', searchTerm, 'infinite'],

    queryFn: async ({ pageParam }) => {
      const res = await fetch(
        `https://api.unsplash.com/search/photos` +
        `?query=${encodeURIComponent(searchTerm)}&page=${pageParam}&per_page=${PAGE_SIZE}`,
        { headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` } }
      );
      if (!res.ok) throw new Error(`Unsplash error: ${res.status}`);
      return res.json();
    },

    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.results.length === PAGE_SIZE ? allPages.length + 1 : undefined,
  });
}
```

Usage in `explore.tsx`:

```tsx
const {
  data,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
} = useUnsplashInfiniteQuery(searchTerm);

const photos = data?.pages.flatMap((page) => page.results) ?? [];

<FlatList
  data={photos}
  onEndReached={() => hasNextPage && fetchNextPage()}
  onEndReachedThreshold={0.5}
  ListFooterComponent={
    isFetchingNextPage ? <ActivityIndicator /> : null
  }
/>
```

---

## Step 9 - Retry with exponential backoff `[STRETCH]`

Update `lib/queryClient.ts` - skip retrying client errors:

```tsx
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:  1000 * 60 * 5,
      gcTime:     1000 * 60 * 60 * 24 * 7,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),

      // Do not retry client errors (4xx) - only server errors (5xx)
      retry: (failureCount, error: unknown) => {
        const status = (error as { status?: number })?.status;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 3;
      },
    },
    mutations: { retry: 0 },
  },
});
```

---

## Step 10 - useMutation updateTrip (optimistic) `[STRETCH]`

> **Note:** `updateTrip` does not exist yet in `utils/tripStorage.ts` (the L12 starting state
> only ships `loadTrips`, `saveTrip`, and `deleteTrip`). Add it first:
>
> ```tsx
> // utils/tripStorage.ts - add this function
> export async function updateTrip(id: string, data: Partial<TripData>): Promise<Trip> {
>   const trips = await loadTrips();
>   const updated = trips.map((t) => (t.id === id ? { ...t, ...data } : t));
>   await AsyncStorage.setItem(TRIPS_KEY, JSON.stringify(updated));
>   return updated.find((t) => t.id === id)!;
> }
> ```

Add to `hooks/useTripMutations.ts`:

```tsx
// Add updateTrip to the import:
import { saveTrip, deleteTrip, updateTrip } from '../utils/tripStorage';

export function useUpdateTrip() {
  const qc = useQueryClient();

  return useMutation<Trip, Error, { id: string; data: Partial<TripData> }>({
    mutationFn: ({ id, data }) => updateTrip(id, data),

    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: ['trips'] });
      const previous = qc.getQueryData<Trip[]>(['trips']) ?? [];

      qc.setQueryData<Trip[]>(['trips'], (old = []) =>
        old.map((trip) => (trip.id === id ? { ...trip, ...data } : trip))
      );

      return { previous };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(['trips'], ctx.previous);
    },

    onSettled: () => qc.invalidateQueries({ queryKey: ['trips'] }),
  });
}
```
