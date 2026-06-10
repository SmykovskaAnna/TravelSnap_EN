import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { useUnsplashQuery } from '@/hooks/useUnsplashQuery';
import type { UnsplashResponse } from '@/types/unsplash';
import { Colors } from '@/constants/Colors';

interface DestinationCardProps {
  city: string;
}

export default function DestinationCard({ city }: DestinationCardProps) {
  const { data, isLoading: loading } = useUnsplashQuery(city);

  if (loading) {
    return <View style={styles.skeleton} />;
  }

  const photoUri = data?.results?.[0]?.urls?.regular;

  if (!photoUri) {
    return null;
  }

  return (
    <View style={styles.card}>
      <Image source={{ uri: photoUri }} style={styles.photo} contentFit="cover" cachePolicy="memory-disk" transition={200} />
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
