import { useCallback, useMemo } from 'react';
import {
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { useTripsQuery } from '@/hooks/useTripsQuery';
import { useDeleteTrip } from '@/hooks/useTripMutations';
import { AnimatedTripCard } from '@/components/AnimatedTripCard';
import { FAB } from '@/components/FAB';
import { SkeletonCard } from '@/components/SkeletonCard';
import ScreenHeader from '@/components/ScreenHeader';
import EmptyState from '@/components/ui/EmptyState';
import TripStats from '@/components/TripStats';
import { Colors } from '@/constants/Colors';
import type { Trip } from '@/types/trip';

export default function HomeScreen() {
  const { data: trips = [], isLoading: loading } = useTripsQuery();
  const { mutate: deleteTrip } = useDeleteTrip();
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
    ({ item, index }: { item: Trip; index: number }) => (
      <AnimatedTripCard
        trip={item}
        index={index}
        onPress={handleTripPress}
        onDelete={handleDelete}
      />
    ),
    [handleTripPress, handleDelete]
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Animated.FlatList
        data={sortedTrips}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        itemLayoutAnimation={LinearTransition.springify()}
        initialNumToRender={10}
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

      <FAB onPress={() => router.push('/add-trip')} />
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
});
