import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Trip, TripData } from '@/types/trip';

const STORAGE_KEY = 'travelsnap_trips';

export async function loadTrips(): Promise<Trip[]> {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEY);
    if (value !== null) {
      return JSON.parse(value) as Trip[];
    }
    return [];
  } catch (error) {
    console.error('Failed to load trips:', error);
    return [];
  }
}

export async function saveTrips(trips: Trip[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
  } catch (error) {
    console.error('Failed to save trips:', error);
  }
}

// Save a single new trip (used by useMutation)
export async function saveTrip(data: TripData): Promise<Trip> {
  const trips = await loadTrips();
  const newTrip: Trip = { ...data, id: Date.now().toString() };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([newTrip, ...trips]));
  return newTrip;
}

// Delete a single trip by id (used by useMutation)
export async function deleteTrip(id: string): Promise<void> {
  const trips = await loadTrips();
  const updated = trips.filter((t) => t.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

// Update a single trip (used by useUpdateTrip)
export async function updateTrip(id: string, data: Partial<TripData>): Promise<Trip> {
  const trips = await loadTrips();
  const updated = trips.map((t) => (t.id === id ? { ...t, ...data } : t));
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  const result = updated.find((t) => t.id === id);
  if (!result) throw new Error(`Trip ${id} not found`);
  return result;
}
