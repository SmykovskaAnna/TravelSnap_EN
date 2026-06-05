import { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { tripSchema, type TripFormData } from '@/types/tripSchema';
import { useTrips } from '@/contexts/TripContext';
import RatingStars from '@/components/RatingStars';
import { Colors } from '@/constants/Colors';
import { deleteImage, deleteTripAssets, saveImageToTrip } from '@/utils/imageStorage';

const createTripId = (): string => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export default function AddTripForm() {
  const { addTrip } = useTrips();
  const router = useRouter();

  const draftTripId = useRef(createTripId());
  const didSubmit = useRef(false);
  const latestImageUri = useRef<string | undefined>(undefined);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TripFormData>({
    resolver: zodResolver(tripSchema),
    mode: 'onBlur',
    defaultValues: {
      title: '',
      destination: '',
      date: '',
      rating: 3,
      galleryUris: [],
    },
  });

  const imageUri = watch('imageUri');

  useEffect(() => {
    latestImageUri.current = imageUri;
  }, [imageUri]);

  // Clean up draft images if user leaves without submitting
  useEffect(() => {
    return () => {
      if (didSubmit.current || !latestImageUri.current) return;
      void deleteTripAssets(draftTripId.current);
    };
  }, []);

  const replaceDraftImage = async (sourceUri: string): Promise<void> => {
    const savedUri = await saveImageToTrip(sourceUri, draftTripId.current);
    if (imageUri && imageUri !== savedUri) {
      await deleteImage(imageUri);
    }
    setValue('imageUri', savedUri);
  };

  const pickImage = async (): Promise<void> => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });
      if (!result.canceled) await replaceDraftImage(result.assets[0].uri);
    } catch {
      Alert.alert('Photo error', 'Could not select a photo. Please try again.');
    }
  };

  const takePhoto = async (): Promise<void> => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Camera access needed', 'Allow camera access to take a trip photo.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });
      if (!result.canceled) await replaceDraftImage(result.assets[0].uri);
    } catch {
      Alert.alert('Photo error', 'Could not take a photo. Please try again.');
    }
  };

  const handleAddPhoto = (): void => {
    Alert.alert('Add a photo', 'Choose where to get your photo from.', [
      { text: 'Gallery', onPress: () => void pickImage() },
      { text: 'Camera', onPress: () => void takePhoto() },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const onSubmit = async (data: TripFormData): Promise<void> => {
    try {
      didSubmit.current = true;
      addTrip(
        {
          ...data,
          galleryUris: data.imageUri ? [data.imageUri] : [],
        },
        draftTripId.current
      );
      router.back();
    } catch (err) {
      didSubmit.current = false;
      Alert.alert('Could not save', String(err));
    }
  };

  return (
    <View style={styles.form}>
      <Text style={styles.formTitle}>Add new trip</Text>

      {/* Title */}
      <Controller
        control={control}
        name="title"
        render={({ field, fieldState }) => (
          <>
            <TextInput
              style={[styles.input, fieldState.error && styles.inputError]}
              placeholder="Title"
              placeholderTextColor={Colors.textSecondary}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
            />
            {fieldState.error && (
              <Text style={styles.errorText}>{fieldState.error.message}</Text>
            )}
          </>
        )}
      />

      {/* Destination */}
      <Controller
        control={control}
        name="destination"
        render={({ field, fieldState }) => (
          <>
            <TextInput
              style={[styles.input, fieldState.error && styles.inputError]}
              placeholder="Destination"
              placeholderTextColor={Colors.textSecondary}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
            />
            {fieldState.error && (
              <Text style={styles.errorText}>{fieldState.error.message}</Text>
            )}
          </>
        )}
      />

      {/* Date */}
      <Controller
        control={control}
        name="date"
        render={({ field, fieldState }) => (
          <>
            <TextInput
              style={[styles.input, fieldState.error && styles.inputError]}
              placeholder="Date (YYYY-MM-DD)"
              placeholderTextColor={Colors.textSecondary}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
            />
            {fieldState.error && (
              <Text style={styles.errorText}>{fieldState.error.message}</Text>
            )}
          </>
        )}
      />

      {/* Rating — stars instead of text input */}
      <Controller
        control={control}
        name="rating"
        render={({ field, fieldState }) => (
          <>
            <View style={styles.ratingRow}>
              <RatingStars value={field.value} onChange={field.onChange} />
            </View>
            {fieldState.error && (
              <Text style={styles.errorText}>{fieldState.error.message}</Text>
            )}
          </>
        )}
      />

      {/* Photo */}
      {imageUri ? (
        <View style={styles.photoSection}>
          <Image source={{ uri: imageUri }} style={styles.previewImage} />
          <Pressable style={styles.changePhotoButton} onPress={handleAddPhoto}>
            <Text style={styles.changePhotoText}>Change photo</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable style={styles.photoPicker} onPress={handleAddPhoto}>
          <Ionicons name="camera-outline" size={28} color={Colors.primary} />
          <Text style={styles.photoPickerText}>Add a photo</Text>
        </Pressable>
      )}

      {/* Submit */}
      <Pressable
        onPress={handleSubmit(onSubmit)}
        disabled={isSubmitting}
        style={[styles.addButton, isSubmitting && styles.addButtonDisabled]}
      >
        {isSubmitting ? (
          <ActivityIndicator color={Colors.textPrimary} />
        ) : (
          <Text style={styles.addButtonText}>Add Trip</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    backgroundColor: Colors.card,
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: Colors.textPrimary,
  },
  input: {
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  inputError: {
    borderColor: Colors.accent,
    borderWidth: 1.5,
    marginBottom: 4,
  },
  errorText: {
    color: Colors.accent,
    fontSize: 12,
    marginBottom: 8,
  },
  ratingRow: {
    marginBottom: 12,
  },
  photoSection: {
    marginBottom: 12,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
  },
  changePhotoButton: {
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  changePhotoText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 15,
  },
  photoPicker: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.inputBorder,
    borderRadius: 12,
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
    backgroundColor: 'rgba(97, 218, 251, 0.04)',
  },
  photoPickerText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: Colors.accent,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    color: Colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 16,
  },
});
