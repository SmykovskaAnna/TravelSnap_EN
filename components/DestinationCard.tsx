import { Image, StyleSheet, Text, View } from 'react-native';

import { useFetch } from '@/hooks/useFetch';
import { UNSPLASH_ACCESS_KEY, UNSPLASH_BASE_URL } from '@/constants/api';
import type { UnsplashResponse } from '@/types/unsplash';
import { Colors } from '@/constants/Colors';

interface DestinationCardProps {
  city: string;
}

export default function DestinationCard({ city }: DestinationCardProps) {
  const url = `${UNSPLASH_BASE_URL}/search/photos?query=${encodeURIComponent(city)}&per_page=1`;
  const init: RequestInit = {
    headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` },
  };

  const { data, loading } = useFetch<UnsplashResponse>(url, init);

  if (loading) {
    return <View style={styles.skeleton} />;
  }

  const photoUri = data?.results?.[0]?.urls?.regular;

  if (!photoUri) {
    return null;
  }

  return (
    <View style={styles.card}>
      <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />
      <View style={styles.overlay}>
        <Text style={styles.cityName}>{city}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    aspectRatio: 16 / 9,
    borderRadius: 12,
    backgroundColor: Colors.card,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  cityName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
});
