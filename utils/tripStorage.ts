import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Trip } from '@/types/trip';

const STORAGE_KEY = 'travelsnap_trips';

export async function saveTrips(trips: Trip[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
  } catch (error) {
    console.error('Failed to save trips:', error);
  }
}

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
