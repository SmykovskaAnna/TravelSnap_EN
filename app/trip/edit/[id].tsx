import { useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { useTrips } from '@/contexts/TripContext';
import RatingStars from '@/components/RatingStars';
import { tripSchema, type TripFormData } from '@/types/tripSchema';
import { Colors } from '@/constants/Colors';

export default function EditTripScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { trips, updateTrip } = useTrips();
  const router = useRouter();

  const trip = useMemo(() => trips.find((t) => t.id === id), [trips, id]);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TripFormData>({
    resolver: zodResolver(tripSchema),
    mode: 'onBlur',
  });

  useEffect(() => {
    if (!trip) return;
    reset({
      title: trip.title,
      destination: trip.destination,
      date: trip.date,
      rating: trip.rating,
      imageUri: trip.imageUri,
      galleryUris: trip.galleryUris,
    });
  }, [trip, reset]);

  const onSubmit = async (data: TripFormData): Promise<void> => {
    if (!trip) return;
    try {
      await updateTrip(trip.id, data);
      router.back();
    } catch (err) {
      Alert.alert('Could not update', String(err));
    }
  };

  if (!trip) {
    return (
      <>
        <Stack.Screen options={{ title: 'Trip not found' }} />
        <View style={styles.errorScreen}>
          <Text style={styles.errorText}>Trip not found.</Text>
          <Pressable style={styles.submitBtn} onPress={() => router.back()}>
            <Text style={styles.submitBtnText}>Go back</Text>
          </Pressable>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Edit Trip' }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>

        {/* Title */}
        <Text style={styles.label}>Title</Text>
        <Controller
          control={control}
          name="title"
          render={({ field, fieldState }) => (
            <>
              <TextInput
                style={[styles.input, fieldState.error && styles.inputError]}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                placeholderTextColor={Colors.textSecondary}
                placeholder="Trip title"
              />
              {fieldState.error && (
                <Text style={styles.fieldError}>{fieldState.error.message}</Text>
              )}
            </>
          )}
        />

        {/* Destination */}
        <Text style={styles.label}>Destination</Text>
        <Controller
          control={control}
          name="destination"
          render={({ field, fieldState }) => (
            <>
              <TextInput
                style={[styles.input, fieldState.error && styles.inputError]}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                placeholderTextColor={Colors.textSecondary}
                placeholder="Destination"
              />
              {fieldState.error && (
                <Text style={styles.fieldError}>{fieldState.error.message}</Text>
              )}
            </>
          )}
        />

        {/* Date */}
        <Text style={styles.label}>Date</Text>
        <Controller
          control={control}
          name="date"
          render={({ field, fieldState }) => (
            <>
              <TextInput
                style={[styles.input, fieldState.error && styles.inputError]}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                placeholderTextColor={Colors.textSecondary}
                placeholder="YYYY-MM-DD"
              />
              {fieldState.error && (
                <Text style={styles.fieldError}>{fieldState.error.message}</Text>
              )}
            </>
          )}
        />

        {/* Rating */}
        <Text style={styles.label}>Rating</Text>
        <Controller
          control={control}
          name="rating"
          render={({ field, fieldState }) => (
            <>
              <RatingStars value={field.value} onChange={field.onChange} />
              {fieldState.error && (
                <Text style={styles.fieldError}>{fieldState.error.message}</Text>
              )}
            </>
          )}
        />

        {/* Submit */}
        <Pressable
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
        >
          {isSubmitting ? (
            <ActivityIndicator color={Colors.background} />
          ) : (
            <Text style={styles.submitBtnText}>Save Changes</Text>
          )}
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
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 10,
    padding: 12,
    marginBottom: 4,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  inputError: {
    borderColor: Colors.accent,
    borderWidth: 1.5,
  },
  fieldError: {
    color: Colors.accent,
    fontSize: 12,
    marginTop: 2,
    marginBottom: 8,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
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
