import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import type { Trip, TripData } from '@/types/trip';
import { deleteTripAssets } from '@/utils/imageStorage';
import { loadTrips, saveTrips } from '@/utils/tripStorage';

interface TripContextValue {
  trips: Trip[];
  loading: boolean;
  addTrip: (data: TripData, id?: string) => Trip;
  deleteTrip: (id: string) => Promise<void>;
  updateTrip: (id: string, data: Partial<TripData>) => Promise<void>;
  addTripGalleryImage: (tripId: string, uri: string) => void;
  removeTripGalleryImage: (tripId: string, uri: string) => void;
  setTripMainImage: (tripId: string, uri?: string) => void;
}

const TripContext = createContext<TripContextValue | null>(null);

interface TripProviderProps {
  children: ReactNode;
}

export function TripProvider({ children }: TripProviderProps) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrips().then((loaded) => {
      setTrips(loaded);
      setLoading(false);
    });
  }, []);

  const persist = async (updated: Trip[]): Promise<void> => {
    setTrips(updated);
    await saveTrips(updated);
  };

  const addTrip = (data: TripData, id?: string): Trip => {
    const newTrip: Trip = {
      id: id ?? Date.now().toString(),
      galleryUris: data.galleryUris ?? [],
      ...data,
    };
    const updated = [newTrip, ...trips];
    void persist(updated);
    return newTrip;
  };

  const deleteTrip = async (id: string): Promise<void> => {
    const updated = trips.filter((trip) => trip.id !== id);
    await persist(updated);

    try {
      await deleteTripAssets(id);
    } catch (error) {
      console.warn(`Failed to delete stored assets for trip ${id}.`, error);
    }
  };

  const updateTrip = async (id: string, data: Partial<TripData>): Promise<void> => {
    const updated = trips.map((trip) => (trip.id === id ? { ...trip, ...data } : trip));
    await persist(updated);
  };

  const addTripGalleryImage = (tripId: string, uri: string): void => {
    const updated = trips.map((trip) =>
      trip.id === tripId
        ? { ...trip, galleryUris: [...(trip.galleryUris ?? []), uri] }
        : trip
    );
    void persist(updated);
  };

  const removeTripGalleryImage = (tripId: string, uri: string): void => {
    const updated = trips.map((trip) =>
      trip.id === tripId
        ? { ...trip, galleryUris: (trip.galleryUris ?? []).filter((item) => item !== uri) }
        : trip
    );
    void persist(updated);
  };

  const setTripMainImage = (tripId: string, uri?: string): void => {
    const updated = trips.map((trip) => (trip.id === tripId ? { ...trip, imageUri: uri } : trip));
    void persist(updated);
  };

  return (
    <TripContext.Provider
      value={{
        trips,
        loading,
        addTrip,
        deleteTrip,
        updateTrip,
        addTripGalleryImage,
        removeTripGalleryImage,
        setTripMainImage,
      }}
    >
      {children}
    </TripContext.Provider>
  );
}

export function useTrips(): TripContextValue {
  const context = useContext(TripContext);
  if (!context) {
    throw new Error('useTrips must be used within a TripProvider');
  }
  return context;
}
