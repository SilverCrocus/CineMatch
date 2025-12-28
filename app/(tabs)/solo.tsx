import { View, Text, StyleSheet } from 'react-native';

export default function SoloScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Swipe Screen Coming Soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 18,
  },
});
