import { useQuery } from '@tanstack/react-query';

import { loadTrips } from '@/utils/tripStorage';
import type { Trip } from '@/types/trip';

export function useTripsQuery() {
  return useQuery<Trip[]>({
    queryKey: ['trips'],
    queryFn: loadTrips,
    staleTime: Infinity,
  });
}
