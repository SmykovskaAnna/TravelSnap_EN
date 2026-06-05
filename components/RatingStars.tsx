import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ReactElement } from 'react';

import { Colors } from '@/constants/Colors';

interface RatingStarsProps {
  /** Display-only rating (read mode) */
  rating?: number;
  /** Controlled value (form mode) */
  value?: number;
  /** Called with the selected star index when tapped */
  onChange?: (value: number) => void;
  maxStars?: number;
}

export default function RatingStars({
  rating,
  value,
  onChange,
  maxStars = 5,
}: RatingStarsProps) {
  const current = value ?? rating ?? 0;
  const normalized = Math.max(0, Math.min(current, maxStars));
  const interactive = typeof onChange === 'function';

  const stars: ReactElement[] = [];
  for (let i = 1; i <= maxStars; i++) {
    const filled = i <= normalized;
    stars.push(
      interactive ? (
        <Pressable key={i} onPress={() => onChange?.(i)} hitSlop={6}>
          <Ionicons
            name={filled ? 'star' : 'star-outline'}
            size={28}
            color={Colors.accent}
            style={styles.star}
          />
        </Pressable>
      ) : (
        <Ionicons
          key={i}
          name={filled ? 'star' : 'star-outline'}
          size={16}
          color={Colors.accent}
          style={styles.star}
        />
      )
    );
  }

  return <View style={styles.row}>{stars}</View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  star: {
    marginRight: 4,
  },
});
