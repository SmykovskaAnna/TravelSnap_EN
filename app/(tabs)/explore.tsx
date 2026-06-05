import { useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import DestinationCard from '@/components/DestinationCard';
import { Colors } from '@/constants/Colors';

const POPULAR = [
  'Tokyo', 'Lisbon', 'Reykjavik', 'Bali',
  'Cape Town', 'Kyoto', 'Marrakech', 'Patagonia',
];

export default function ExploreScreen() {
  const [listKey, setListKey] = useState(0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        key={listKey}
        data={POPULAR}
        keyExtractor={(city) => city}
        renderItem={({ item }) => <DestinationCard city={item} />}
        contentContainerStyle={styles.list}
        refreshing={false}
        onRefresh={() => setListKey((k) => k + 1)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  list: {
    padding: 16,
    gap: 16,
  },
});
