import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import MapView, { Callout, Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import ErrorView from '@/components/ErrorView';
import { Colors } from '@/constants/Colors';
import { darkMapStyle } from '@/constants/mapStyle';
import { useTrips } from '@/contexts/TripContext';
import { useLocation } from '@/hooks/useLocation';
import type { Trip } from '@/types/trip';

const DEFAULT_REGION = {
  latitude: 52.2297,
  longitude: 21.0122,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

export default function MapScreen() {
  const router = useRouter();
  const { trips } = useTrips();
  const { location, error, loading } = useLocation();
  const mapRef = useRef<MapView>(null);
  const [isDark, setIsDark] = useState(false);

  const tripsWithCoords = useMemo(
    () => trips.filter((t): t is Trip & { coordinates: NonNullable<Trip['coordinates']> } =>
      !!t.coordinates
    ),
    [trips]
  );

  // Fit map to show all markers whenever trip list changes
  useEffect(() => {
    const coords = tripsWithCoords.map((t) => t.coordinates);
    if (coords.length === 0 || !mapRef.current) return;

    if (coords.length === 1) {
      mapRef.current.animateToRegion({
        latitude: coords[0].latitude,
        longitude: coords[0].longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
      return;
    }

    mapRef.current.fitToCoordinates(coords, {
      edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
      animated: true,
    });
  }, [tripsWithCoords]);

  const handleCalloutPress = useCallback(
    (id: string) => {
      router.push({ pathname: '/trip/[id]', params: { id } });
    },
    [router]
  );

  const initialRegion = location
    ? {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      }
    : DEFAULT_REGION;

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centered}>
        <ErrorView
          message={error}
          onRetry={() => void Linking.openSettings()}
          retryLabel="Open Settings"
        />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton
        customMapStyle={isDark ? darkMapStyle : undefined}
        userInterfaceStyle={isDark ? 'dark' : 'light'}
      >
        {tripsWithCoords.map((trip) => (
          <Marker
            key={trip.id}
            coordinate={trip.coordinates}
            tracksViewChanges={false}
          >
            {/* Custom marker icon */}
            {trip.imageUri ? (
              <View style={styles.customMarker}>
                <Image
                  source={{ uri: trip.imageUri }}
                  style={styles.markerImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              </View>
            ) : (
              <View style={styles.defaultMarker}>
                <Text style={styles.defaultMarkerText}>📍</Text>
              </View>
            )}

            {/* Callout popup */}
            <Callout onPress={() => handleCalloutPress(trip.id)}>
              <View style={styles.calloutContainer}>
                {trip.imageUri && (
                  <Image
                    source={{ uri: trip.imageUri }}
                    style={styles.calloutImage}
                    contentFit="cover"
                  />
                )}
                <View style={styles.calloutText}>
                  <Text style={styles.calloutTitle} numberOfLines={1}>
                    {trip.title}
                  </Text>
                  <Text style={styles.calloutDestination} numberOfLines={1}>
                    {trip.destination}
                  </Text>
                </View>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {/* Dark mode toggle */}
      <Pressable
        style={styles.darkToggle}
        onPress={() => setIsDark((v) => !v)}
      >
        <Text style={styles.darkToggleText}>{isDark ? '☀️' : '🌙'}</Text>
      </Pressable>

      {tripsWithCoords.length === 0 && (
        <View style={styles.emptyBanner}>
          <Text style={styles.emptyText}>No trips with coordinates yet</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  centered: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  customMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.accent,
    overflow: 'hidden',
  },
  markerImage: {
    width: 40,
    height: 40,
  },
  defaultMarker: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  defaultMarkerText: {
    fontSize: 24,
  },
  calloutContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: 200,
    padding: 4,
  },
  calloutImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  calloutText: {
    flex: 1,
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
  },
  calloutDestination: {
    fontSize: 12,
    color: '#555',
    marginTop: 2,
  },
  darkToggle: {
    position: 'absolute',
    top: 56,
    right: 16,
    backgroundColor: Colors.card,
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  darkToggleText: {
    fontSize: 20,
  },
  emptyBanner: {
    position: 'absolute',
    bottom: 32,
    alignSelf: 'center',
    backgroundColor: Colors.card,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 4,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
});
