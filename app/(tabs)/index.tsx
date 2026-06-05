import { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Pressable,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTrips } from '@/contexts/TripContext';
import { TripCard } from '@/components/TripCard';
import ScreenHeader from '@/components/ScreenHeader';
import EmptyState from '@/components/ui/EmptyState';
import TripStats from '@/components/TripStats';
import { Colors } from '@/constants/Colors';
import type { Trip } from '@/types/trip';

// Cards without image: ~120px; with image: ~300px.
// Heights vary, so getItemLayout is skipped to avoid blank-space glitches.
const INITIAL_NUM_TO_RENDER = 10;

export default function HomeScreen() {
  const { trips, deleteTrip, loading } = useTrips();
  const router = useRouter();

  const sortedTrips = useMemo(
    () => [...trips].sort((a, b) => b.rating - a.rating),
    [trips]
  );

  const handleTripPress = useCallback(
    (id: string) => {
      router.push({ pathname: '/trip/[id]', params: { id } });
    },
    [router]
  );

  const handleDelete = useCallback(
    (id: string) => {
      void deleteTrip(id);
    },
    [deleteTrip]
  );

  const renderItem = useCallback(
    ({ item }: { item: Trip }) => (
      <TripCard
        trip={item}
        onPress={handleTripPress}
        onDelete={() => handleDelete(item.id)}
      />
    ),
    [handleTripPress, handleDelete]
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={sortedTrips}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        initialNumToRender={INITIAL_NUM_TO_RENDER}
        maxToRenderPerBatch={8}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <ScreenHeader tripCount={trips.length} />
            <TripStats trips={trips} />
          </>
        }
        ListEmptyComponent={
          <EmptyState
            icon="airplane-outline"
            title="No trips yet"
            subtitle="Add your first trip!"
          />
        }
      />

      <Pressable
        style={styles.fab}
        onPress={() => router.push('/add-trip')}
      >
        <Ionicons name="add" size={28} color={Colors.background} />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 96,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
});
