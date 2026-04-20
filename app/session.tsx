import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { theme } from '../constants/theme'

export default function SessionScreen() {
  const { sessionId, joinCode } = useLocalSearchParams()

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Session</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Join Code</Text>
        <Text style={styles.code}>{joinCode}</Text>
      </View>

      <View style={styles.grid}>
        <Pressable
          style={styles.button}
          onPress={() => router.push(`/score?sessionId=${sessionId}`)}
        >
          <Text style={styles.buttonText}>Resume</Text>
        </Pressable>

        <Pressable
          style={styles.button}
          onPress={() => router.push(`/guest-player?sessionId=${sessionId}`)}
        >
          <Text style={styles.buttonText}>Add Guest</Text>
        </Pressable>

        <Pressable
          style={styles.button}
          onPress={() => router.push(`/compare?sessionId=${sessionId}`)}
        >
          <Text style={styles.buttonText}>Compare</Text>
        </Pressable>

        <Pressable
          style={styles.button}
          onPress={() => router.replace('/create-session')}
        >
          <Text style={styles.buttonText}>New</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: theme.colors.background,
  },

  title: {
    fontSize: 28,
    fontWeight: '900',
    color: theme.colors.text,
    marginBottom: 16,
  },

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },

  label: {
    color: theme.colors.textMuted,
  },

  code: {
    fontSize: 24,
    fontWeight: '900',
    color: theme.colors.accent,
    marginTop: 4,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  button: {
    width: '48%',
    backgroundColor: theme.colors.surfaceRaised,
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
  },

  buttonText: {
    color: '#FFF',
    fontWeight: '800',
  },
})