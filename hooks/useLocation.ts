import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import type { LocationObject } from 'expo-location';

interface UseLocationResult {
  location: LocationObject | null;
  error: string | null;
  loading: boolean;
}

export function useLocation(): UseLocationResult {
  const [location, setLocation] = useState<LocationObject | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchLocation = async (): Promise<void> => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
          if (!cancelled) {
            setError('Location permission denied');
            setLoading(false);
          }
          return;
        }

        const result = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (!cancelled) {
          setLocation(result);
          setLoading(false);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Could not get location');
          setLoading(false);
        }
      }
    };

    void fetchLocation();

    return () => {
      cancelled = true;
    };
  }, []);

  return { location, error, loading };
}
