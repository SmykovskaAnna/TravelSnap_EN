import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/Colors';

export default function MapScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Map is not available on web</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  text: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
});
