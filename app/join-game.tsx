import { useMemo, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  Image,
  ScrollView,
} from 'react-native'
import { router } from 'expo-router'
import * as Clipboard from 'expo-clipboard'
import { joinSessionByCode } from '../lib/sessions'

const logo = require('../assets/valeria_logo.jpeg')

const normalizeJoinCode = (value: string) =>
  value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)

export default function JoinGameScreen() {
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)

  const normalizedCode = useMemo(() => normalizeJoinCode(joinCode), [joinCode])
  const canJoin = normalizedCode.length === 6 && !loading

  const handlePaste = async () => {
    try {
      const clipboardText = await Clipboard.getStringAsync()
      setJoinCode(normalizeJoinCode(clipboardText || ''))
    } catch {
      Alert.alert('Paste failed', 'Unable to read from clipboard.')
    }
  }

  const handleJoin = async () => {
    try {
      if (!normalizedCode) {
        Alert.alert('Missing code', 'Enter a join code first.')
        return
      }

      if (normalizedCode.length !== 6) {
        Alert.alert('Invalid code', 'Join codes must be 6 characters.')
        return
      }

      setLoading(true)

      const session = await joinSessionByCode(normalizedCode)

      router.replace({
        pathname: '/session/[id]',
        params: {
          id: String(session.id),
          joinCode: String(session.join_code ?? normalizedCode),
        },
      })
    } catch (err: any) {
      Alert.alert('Join game failed', err?.message ?? 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.container}>
      <View style={styles.heroCard}>
        <View style={styles.logoFrame}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />
        </View>

        <Text style={styles.kicker}>Enter a Hosted Table</Text>
        <Text style={styles.title}>Join Game</Text>
        <Text style={styles.subtitle}>
          Paste or type the host&apos;s 6-character join code to enter the same scoring table.
        </Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.label}>Join Code</Text>

        <TextInput
          placeholder="ABC123"
          placeholderTextColor="#A79BC9"
          value={normalizedCode}
          onChangeText={(text) => setJoinCode(normalizeJoinCode(text))}
          style={styles.input}
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="off"
          maxLength={6}
          textAlign="center"
        />

        <View style={styles.buttonRow}>
          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.pressed,
            ]}
            onPress={handlePaste}
            disabled={loading}
          >
            <Text style={styles.secondaryButtonText}>Paste Code</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && styles.pressed,
              (!canJoin || loading) && styles.disabled,
            ]}
            onPress={handleJoin}
            disabled={!canJoin}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Joining...' : 'Join Session'}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.helper}>
          Spaces and symbols are removed automatically.
        </Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#140F1F',
  },
  content: {
    padding: 20,
    justifyContent: 'center',
    flexGrow: 1,
  },
  heroCard: {
    backgroundColor: '#1E152C',
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#4F3A72',
  },
  logoFrame: {
    width: 180,
    height: 108,
    borderRadius: 18,
    backgroundColor: '#2A1E3E',
    borderWidth: 1,
    borderColor: '#9272D8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    padding: 8,
  },
  logo: {
    width: 150,
    height: 84,
  },
  kicker: {
    color: '#BCAEE0',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  title: {
    color: '#FFF8FF',
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: '#CFC3E8',
    textAlign: 'center',
    lineHeight: 21,
    fontSize: 14,
  },
  formCard: {
    backgroundColor: '#1E152C',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#4F3A72',
  },
  label: {
    color: '#E6D8FF',
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#180F23',
    color: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#5A4380',
    letterSpacing: 4,
    fontSize: 24,
    fontWeight: '900',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  secondaryButton: {
    backgroundColor: '#2A1E3E',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#6A4D98',
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  secondaryButtonText: {
    color: '#E2D4FF',
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
  button: {
    flex: 1,
    backgroundColor: '#7046C9',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#AF92F5',
    paddingVertical: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  helper: {
    color: '#9F90C4',
    fontSize: 12,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.92,
  },
  disabled: {
    opacity: 0.6,
  },
})