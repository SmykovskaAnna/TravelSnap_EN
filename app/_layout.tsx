import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { TripProvider } from '@/contexts/TripContext';
import { Colors } from '@/constants/Colors';

const darkHeaderOptions = {
  headerStyle: { backgroundColor: Colors.background },
  headerTintColor: Colors.primary,
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <TripProvider>
      <Stack screenOptions={darkHeaderOptions}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="trip/[id]"
          options={{
            title: 'Trip Details',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="trip/gallery/[id]"
          options={{
            title: 'Gallery',
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="trip/edit/[id]"
          options={{
            title: 'Edit Trip',
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="add-trip"
          options={{
            title: 'Add Trip',
            presentation: 'modal',
          }}
        />
      </Stack>
      <StatusBar style="light" />
    </TripProvider>
    </GestureHandlerRootView>
  );
}
