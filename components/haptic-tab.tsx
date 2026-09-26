import { Pressable, Text, StyleSheet } from 'react-native';

export function HapticTab({ children, onPress }: any) {
  return (
    <Pressable onPress={onPress} style={styles.button}>
      <Text style={styles.text}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 10,
  },
  text: {
    fontSize: 16,
  },
});