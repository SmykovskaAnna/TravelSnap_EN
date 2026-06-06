# Task 11 - Maps & Location

## Goal

Add a new **Map** tab to TravelSnap featuring a full-screen map that displays pins (markers) for every trip that has coordinates. The user can tap a marker to reveal a callout with a thumbnail and title, then navigate to the trip details. The map automatically adjusts its viewport to fit all markers.

---

## Step 0 - Setup

**Goal:** Install dependencies and configure the Google Maps API key.

```bash
npx expo install expo-location react-native-maps
```

**Requirements:**

1. Install both packages with a single command.
2. For Android: add a Google Maps API key in `app.json` (or `app.config.ts`):
   ```json
   {
     "expo": {
       "android": {
         "config": {
           "googleMaps": {
             "apiKey": "YOUR_GOOGLE_MAPS_API_KEY"
           }
         }
       }
     }
   }
   ```
3. For iOS: Apple Maps works without a key - no extra configuration needed.
4. Rebuild after installing: `npx expo run:android` or `npx expo run:ios` (react-native-maps does not work in Expo Go on Android with the Google provider).

**⚠ Pitfall:** The Google Maps API key must be **unrestricted** initially. A restricted key results in a blank map with zero console errors. Restrict it only after confirming the map renders.

---

## Step 1 - Custom Hook `useLocation`

**Goal:** Create a reusable hook that retrieves the user's current location.

**File:** `hooks/useLocation.ts`

**Signature:**

```ts
import { LocationObject } from 'expo-location';

interface UseLocationResult {
  location: LocationObject | null;
  error: string | null;
  loading: boolean;
}

export function useLocation(): UseLocationResult;
```

**Requirements:**

1. On mount, call `Location.requestForegroundPermissionsAsync()`.
2. If `status !== 'granted'` - set `error` to a descriptive message (e.g. `"Location permission denied"`), set `loading` to `false`.
3. If permission is granted - call `Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })`.
4. Store the result in `location`, set `loading` to `false`.
5. Wrap the logic in `try/catch` - on exception set `error` to `e.message`.
6. All logic inside a `useEffect` with an empty dependency array `[]`.
7. Return `{ location, error, loading }`.

**⚠ Pitfall:** On the Android emulator you must set a location manually: Extended Controls (…) → Location → enter coordinates. On iOS Simulator: Debug → Location → Custom Location. Without this, `getCurrentPositionAsync` may hang indefinitely.

---

## Step 2 - New "Map" Tab with `<MapView>`

**Goal:** Add a new tab featuring a full-screen map.

**Files:** `app/(tabs)/map.tsx`, `app/(tabs)/_layout.tsx`

**Requirements:**

1. In `_layout.tsx` add a new `<Tabs.Screen>` with `name="map"`, title "Map", and a map icon (e.g. `map` from Ionicons or `map-pin`).
2. In `map.tsx` use the `useLocation()` hook from Step 1.
3. Render `<MapView>` from `react-native-maps`:
   ```tsx
   import MapView from 'react-native-maps';
   ```
4. `MapView` must have `style={{ flex: 1 }}` - **the parent must also have `flex: 1`**, otherwise the map has 0 height and is invisible.
5. Set `initialRegion`:
   - If `location` is available — use `location.coords.latitude` / `longitude` with a delta of `0.1`.
   - If unavailable - default to Warsaw: `{ latitude: 52.2297, longitude: 21.0122, latitudeDelta: 0.1, longitudeDelta: 0.1 }`.
6. While `loading === true` - show a spinner (`<ActivityIndicator>`).
7. When `error` is set - show `<ErrorView>` with the error message and an "Open Settings" button that calls `Linking.openSettings()`.

**⚠ Pitfall:** `MapView` with `style={{ flex: 1 }}` inside a `<View>` without `flex: 1` = invisible map (0px height). Make sure the entire parent chain has `flex: 1`.

---

## Step 3 - Extend `Trip` with `coordinates`

**Goal:** Add an optional coordinates field to the trip data model.

**Files:** `types/trip.ts`, `types/tripSchema.ts`

**Requirements:**

1. In `types/trip.ts` extend the `TripData` interface:
   ```ts
   coordinates?: {
     latitude: number;
     longitude: number;
   };
   ```
2. In `types/tripSchema.ts` add an optional field to the Zod schema:
   ```ts
   coordinates: z.object({
     latitude: z.number(),
     longitude: z.number(),
   }).optional(),
   ```
3. For testing, manually add coordinates to 2-3 existing trips in your test data or in `TripContext` (e.g. Paris: `48.8566, 2.3522`, Tokyo: `35.6762, 139.6503`, Rome: `41.9028, 12.4964`).
4. The `coordinates` field is optional - not every trip needs one.

**⚠ Pitfall:** If you use AsyncStorage for trip persistence, legacy data will lack the `coordinates` field. Your code must handle this - always filter with `.filter(t => t.coordinates)` before mapping to markers.

---

## Step 4 - Trip Markers on the Map

**Goal:** Display a pin on the map for every trip that has coordinates.

**File:** `app/(tabs)/map.tsx`

**Requirements:**

1. Retrieve the trip list from `TripContext` (`useTrips()`).
2. Filter trips that have `coordinates`:
   ```tsx
   const tripsWithCoords = useMemo(
     () => trips.filter(t => t.coordinates),
     [trips]
   );
   ```
3. Render a `<Marker>` for each trip:
   ```tsx
   {tripsWithCoords.map(trip => (
     <Marker
       key={trip.id}
       coordinate={trip.coordinates!}
       title={trip.title}
       description={trip.destination}
     />
   ))}
   ```
4. Each marker shows the default pin with `title` and `description` visible on tap.
5. Use `useMemo` on the filtered list to avoid unnecessary recalculations.

**⚠ Pitfall:** Do not forget `key={trip.id}` on `<Marker>`. Without a unique key React cannot efficiently update markers and you may see ghost markers after deleting a trip.

---

## Step 5 - Custom Callout with Thumbnail

**Goal:** When a marker is tapped, show a callout containing a photo thumbnail, title, and destination. Tapping the callout navigates to the trip detail screen.

**File:** `app/(tabs)/map.tsx`

**Requirements:**

1. Import `Callout` from `react-native-maps`:
   ```tsx
   import MapView, { Marker, Callout } from 'react-native-maps';
   ```
2. Inside each `<Marker>` add a `<Callout>`:
   ```tsx
   <Marker
     key={trip.id}
     coordinate={trip.coordinates!}
   >
     <Callout onPress={() => router.push(`/trip/${trip.id}`)}>
       <View style={styles.calloutContainer}>
         <Image
           source={{ uri: trip.imageUri }}
           style={styles.calloutImage}
         />
         <View style={styles.calloutText}>
           <Text style={styles.calloutTitle}>{trip.title}</Text>
           <Text style={styles.calloutDestination}>{trip.destination}</Text>
         </View>
       </View>
     </Callout>
   </Marker>
   ```
3. Thumbnail: 60×60 px, `borderRadius: 8`.
4. Callout container: `flexDirection: 'row'`, `alignItems: 'center'`, `gap: 8`, max width ~200 px.
5. `onPress` on `<Callout>` navigates to `trip/[id].tsx` via `router.push()`.

**⚠ Pitfall:** On Android, `Callout` **does not support** interactive children (e.g. `TouchableOpacity`, `Pressable`). The only way to handle taps is `onPress` directly on `<Callout>` or `onCalloutPress` on `<Marker>`. Do not place buttons inside a callout - they will not work.

---

## Step 6 - `fitToCoordinates`

**Goal:** After trips load, automatically adjust the map viewport so all markers are visible.

**File:** `app/(tabs)/map.tsx`

**Requirements:**

1. Create a map ref:
   ```tsx
   const mapRef = useRef<MapView>(null);
   ```
2. Pass the ref to `<MapView ref={mapRef}>`.
3. Add a `useEffect` that reacts to trip list changes:
   ```tsx
   useEffect(() => {
     const coords = tripsWithCoords.map(t => t.coordinates!);
     if (coords.length > 0 && mapRef.current) {
       mapRef.current.fitToCoordinates(coords, {
         edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
         animated: true,
       });
     }
   }, [tripsWithCoords]);
   ```
4. **The `coords.length > 0` guard is mandatory** - `fitToCoordinates` with an empty array crashes the app.
5. 50 px padding on each edge - markers near screen edges are hard to tap.

**⚠ Pitfall:** `fitToCoordinates` with a **single** marker zooms to maximum (you see the street but lose context). STRETCH solution: when `coords.length === 1`, set the region manually with a minimum delta (`latitudeDelta: 0.05`).

---

## Step 7 - Geocoding

**Goal:** Automatically fetch coordinates from the destination name when adding a trip.

**File:** `components/AddTripForm.tsx`

**Requirements:**

1. After the user fills in the `destination` field, call `Location.geocodeAsync(destination)`.
2. `geocodeAsync` returns an array of `{ latitude, longitude }[]` - take the first result.
3. If geocoding returns results - save `coordinates` to the Trip object.
4. If geocoding finds nothing - do not block saving the trip, simply leave `coordinates` unset.
5. Wrap in `try/catch` - geocoding requires an internet connection.

**⚠ Pitfall:** `Location.geocodeAsync` uses the native geocoder (Apple/Google) - it will not work offline. Do not show the user an error when geocoding fails - the trip should still save.

---

## Step 8 - Custom Marker Icon

**Goal:** Replace the default pin with a circular trip photo thumbnail as the marker icon.

**File:** `app/(tabs)/map.tsx`

**Requirements:**

1. Instead of the default pin, render a custom `<View>` inside `<Marker>`:
   ```tsx
   <Marker key={trip.id} coordinate={trip.coordinates!}>
     <View style={styles.customMarker}>
       <Image
         source={{ uri: trip.imageUri }}
         style={styles.markerImage}
       />
     </View>
     <Callout onPress={() => router.push(`/trip/${trip.id}`)}>
       {/* ... */}
     </Callout>
   </Marker>
   ```
2. Thumbnail: 40×40 px, `borderRadius: 20` (circle), `borderWidth: 2`, `borderColor: Colors.accent`.
3. **Set `tracksViewChanges={false}`** on `<Marker>` - without this the map re-renders the marker every frame, causing noticeable FPS drops with 10+ markers.

**⚠ Pitfall:** `tracksViewChanges={false}` means changing `imageUri` will not update the marker icon. If a trip's image changes, you must temporarily set `tracksViewChanges={true}` and revert to `false` after the image loads.

---

## Step 9 - Dark Mode Map

**Goal:** Add a dark map style and a toggle in the UI.

**File:** `app/(tabs)/map.tsx`

**Requirements:**

1. Download a dark mode JSON style from https://mapstyle.withgoogle.com/ or https://snazzymaps.com/.
2. Save the JSON in `constants/mapStyle.ts` (export const `darkMapStyle`).
3. Pass it to `<MapView customMapStyle={isDark ? darkMapStyle : undefined}>`.
4. Add a toggle (e.g. `Switch` or an icon) in the top-right corner of the map to switch styles.
5. Note: `customMapStyle` works **only with the Google Maps provider** (Android). On iOS with Apple Maps this prop is ignored — use `mapType` or `userInterfaceStyle="dark"` (iOS 13+).

**⚠ Pitfall:** Style JSON from external services must be an array of objects `{ featureType, elementType, stylers }`. Make sure the format is correct — a malformed file results in an unstyled map with no error.

---

## Step 10 - Marker Clustering

**Goal:** When there are many markers, group nearby ones into clusters.

**Requirements:**

1. Install `react-native-map-clustering`:
   ```bash
   npm install react-native-map-clustering
   ```
2. Replace `<MapView>` with the clustered variant (or wrap `MapView` from the library):
   ```tsx
   import MapView from 'react-native-map-clustering';
   ```
3. Each cluster displays the count of grouped markers.
4. Tapping a cluster zooms into the region encompassing the grouped markers.
5. Add 10+ trips with different coordinates to test clustering.

**⚠ Pitfall:** `react-native-map-clustering` wraps `MapView` — if you import `MapView` from this package, do not import it simultaneously from `react-native-maps` in the same file. `Marker` and `Callout` are still imported from `react-native-maps`.

---

## Step 11 - Reverse Geocoding on Trip Detail

**Goal:** On the trip detail screen, display the full address alongside the destination name.

**File:** `app/trip/[id].tsx`

**Requirements:**

1. If the trip has `coordinates`, call `Location.reverseGeocodeAsync(coordinates)` on mount.
2. `reverseGeocodeAsync` returns an array of objects with fields: `street`, `city`, `region`, `country`, `postalCode`.
3. Format the address and display it below the destination name (e.g. "Champs-Élysées, Paris, France").
4. Show a spinner while the address is loading.
5. If reverse geocoding fails - display only the destination name (no error).

**⚠ Pitfall:** `reverseGeocodeAsync` may return `null` for some fields (e.g. `street` for a wilderness location). Check each field before using it and join only non-empty values.

---