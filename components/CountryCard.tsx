import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useMemo } from 'react';

import { useFetch } from '@/hooks/useFetch';
import { RESTCOUNTRIES_BASE_URL } from '@/constants/api';
import type { Country } from '@/types/country';
import { Colors } from '@/constants/Colors';

interface CountryCardProps {
  countryName: string;
}

export default function CountryCard({ countryName }: CountryCardProps) {
  const url = `${RESTCOUNTRIES_BASE_URL}/name/${encodeURIComponent(countryName)}`;
  const { data, loading } = useFetch<Country[]>(url);

  const country = data?.[0];

  if (loading) {
    return <View style={styles.skeleton} />;
  }

  if (!country) {
    return null;
  }

  const currency = Object.values(country.currencies ?? {})[0];

  return (
    <View style={styles.card}>
      <Image source={{ uri: country.flags.png }} style={styles.flag} contentFit="cover" cachePolicy="memory-disk" transition={200} />
      <View style={styles.info}>
        <Text style={styles.name}>{country.name.common}</Text>
        <Text style={styles.detail}>Capital: {country.capital?.[0] ?? '–'}</Text>
        <Text style={styles.detail}>
          Currency: {currency ? `${currency.name} (${currency.symbol})` : '–'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    height: 72,
    borderRadius: 12,
    backgroundColor: Colors.card,
    marginBottom: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    gap: 14,
    marginBottom: 16,
  },
  flag: {
    width: 60,
    height: 40,
    borderRadius: 4,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  detail: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
});
