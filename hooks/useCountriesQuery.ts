import { useQuery } from '@tanstack/react-query';

import { RESTCOUNTRIES_BASE_URL } from '@/constants/api';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import type { Country } from '@/types/country';

export function useCountriesQuery(countryName: string) {
  const { isConnected } = useNetworkStatus();

  return useQuery<Country[]>({
    queryKey: ['countries', countryName],
    queryFn: async () => {
      const res = await fetch(
        `${RESTCOUNTRIES_BASE_URL}/name/${encodeURIComponent(countryName)}`
      );
      if (!res.ok) throw new Error(`Countries error: ${res.status}`);
      return res.json() as Promise<Country[]>;
    },
    staleTime: 1000 * 60 * 60,
    enabled: isConnected && !!countryName,
  });
}
