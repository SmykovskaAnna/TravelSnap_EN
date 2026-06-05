import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { useTrips } from '@/contexts/TripContext';
import RatingStars from '@/components/RatingStars';
import { Colors } from '@/constants/Colors';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export default function EditTripScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { trips, updateTrip } = useTrips();
  const router = useRouter();

  const trip = trips.find((t) => t.id === id);

  const [title, setTitle] = useState(trip?.title ?? '');
  const [destination, setDestination] = useState(trip?.destination ?? '');
  const [date, setDate] = useState(trip?.date ?? '');
  const [rating, setRating] = useState(String(trip?.rating ?? ''));

  if (!trip) {
    return (
      <>
        <Stack.Screen options={{ title: 'Trip not found' }} />
        <View style={styles.errorScreen}>
          <Text style={styles.errorText}>Trip not found.</Text>
          <Pressable style={styles.saveButton} onPress={() => router.back()}>
            <Text style={styles.saveButtonText}>Go back</Text>
          </Pressable>
        </View>
      </>
    );
  }

  const handleSave = async (): Promise<void> => {
    if (!title.trim() || !destination.trim() || !date.trim() || !rating.trim()) {
      Alert.alert('Error', 'All fields are required!');
      return;
    }
    if (!DATE_REGEX.test(date)) {
      Alert.alert('Error', 'Date must be in YYYY-MM-DD format!');
      return;
    }
    const ratingNum = Number(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      Alert.alert('Error', 'Rating must be a number between 1 and 5!');
      return;
    }

    await updateTrip(id, {
      title: title.trim(),
      destination: destination.trim(),
      date: date.trim(),
      rating: ratingNum,
    });

    router.back();
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Edit Trip' }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholderTextColor={Colors.textSecondary}
          placeholder="Trip title"
        />

        <Text style={styles.label}>Destination</Text>
        <TextInput
          style={styles.input}
          value={destination}
          onChangeText={setDestination}
          placeholderTextColor={Colors.textSecondary}
          placeholder="Destination"
        />

        <Text style={styles.label}>Date</Text>
        <TextInput
          style={styles.input}
          value={date}
          onChangeText={setDate}
          placeholderTextColor={Colors.textSecondary}
          placeholder="YYYY-MM-DD"
        />

        <Text style={styles.label}>Rating (1–5)</Text>
        <TextInput
          style={styles.input}
          value={rating}
          onChangeText={setRating}
          keyboardType="numeric"
          placeholderTextColor={Colors.textSecondary}
          placeholder="1–5"
        />

        <View style={styles.starsPreview}>
          <RatingStars rating={Number(rating) || 0} />
        </View>

        <Pressable style={styles.saveButton} onPress={() => void handleSave()}>
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </Pressable>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 24,
    paddingBottom: 48,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  starsPreview: {
    marginBottom: 24,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    color: Colors.background,
    fontWeight: 'bold',
    fontSize: 16,
  },
  errorScreen: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
});
