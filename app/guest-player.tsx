import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import {
  createSharedGuestProfile,
  getGuestProfileByPlayerId,
  type GuestProfile,
} from '../lib/guestProfiles'
import { normalizePlayerId } from '../lib/profile'

export default function GuestPlayerScreen() {
  const params = useLocalSearchParams<{ sessionId?: string; joinCode?: string }>()
  const [displayName, setDisplayName] = useState('')
  const [playerIdSearch, setPlayerIdSearch] = useState('')
  const [newPlayerId, setNewPlayerId] = useState('')
  const [results, setResults] = useState<GuestProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)

  function continueWithProfile(profile: GuestProfile) {
    router.push({
      pathname: '/score',
      params: {
        sessionId: typeof params.sessionId === 'string' ? params.sessionId : '',
        joinCode: typeof params.joinCode === 'string' ? params.joinCode : '',
        guestMode: '1',
        guestName: profile.display_name,
        guestProfileId: profile.id,
      },
    })
  }

  async function handleSearchByPlayerId() {
    try {
      const value = normalizePlayerId(playerIdSearch)

      if (!value) {
        Alert.alert('Missing Player ID', 'Enter a Player ID first.')
        return
      }

      setLoading(true)

      const profile = await getGuestProfileByPlayerId(value)

      if (!profile) {
        setResults([])
        Alert.alert('Not found', 'No guest player was found with that Player ID.')
        return
      }

      setResults([profile])
    } catch (err: any) {
      Alert.alert('Search failed', err?.message ?? 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate() {
    try {
      const trimmedName = displayName.trim()
      const trimmedPlayerId = normalizePlayerId(newPlayerId)

      if (!trimmedName) {
        Alert.alert('Missing name', 'Enter a player name first.')
        return
      }

      if (!trimmedPlayerId) {
        Alert.alert('Missing Player ID', 'Enter a Player ID for the guest player.')
        return
      }

      if (trimmedPlayerId.length < 3) {
        Alert.alert('Player ID too short', 'Use at least 3 characters.')
        return
      }

      setCreating(true)

      const profile = await createSharedGuestProfile({
        displayName: trimmedName,
        publicPlayerId: trimmedPlayerId,
      })

      continueWithProfile(profile)
    } catch (err: any) {
      Alert.alert('Create failed', err?.message ?? 'Unknown error')
    } finally {
      setCreating(false)
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.kicker}>Shared Player Profiles</Text>
        <Text style={styles.title}>Select Guest Player</Text>
        <Text style={styles.subtitle}>
          Find an existing shared guest player by Player ID, or create a new shared player profile.
        </Text>

        <Text style={styles.sectionTitle}>Find Existing Player</Text>

        <TextInput
          value={playerIdSearch}
          onChangeText={(text) => setPlayerIdSearch(normalizePlayerId(text))}
          placeholder="Enter Player ID"
          placeholderTextColor="#A79BC9"
          style={styles.input}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={20}
        />

        <Pressable style={styles.secondaryButton} onPress={handleSearchByPlayerId}>
          <Text style={styles.secondaryButtonText}>
            {loading ? 'Searching...' : 'Search by Player ID'}
          </Text>
        </Pressable>

        {results.map((profile) => (
          <Pressable
            key={profile.id}
            style={({ pressed }) => [styles.profileRow, pressed && styles.pressed]}
            onPress={() => continueWithProfile(profile)}
          >
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profile.display_name}</Text>
              <Text style={styles.profileMeta}>
                Player ID: {profile.public_player_id}
              </Text>
            </View>
            <Text style={styles.profileAction}>Use</Text>
          </Pressable>
        ))}

        <Text style={styles.sectionTitle}>Create New Shared Player</Text>

        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Player name"
          placeholderTextColor="#A79BC9"
          style={styles.input}
          autoCapitalize="words"
        />

        <TextInput
          value={newPlayerId}
          onChangeText={(text) => setNewPlayerId(normalizePlayerId(text))}
          placeholder="Choose Player ID"
          placeholderTextColor="#A79BC9"
          style={styles.input}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={20}
        />

        <Text style={styles.helper}>
          Use letters, numbers, hyphen, or underscore.
        </Text>

        <Pressable style={styles.primaryButton} onPress={handleCreate} disabled={creating}>
          <Text style={styles.primaryButtonText}>
            {creating ? 'Creating Shared Player...' : 'Create Shared Player'}
          </Text>
        </Pressable>

        <Text style={styles.helper}>
          New shared players now keep the exact Player ID entered above.
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
    flexGrow: 1,
  },
  card: {
    backgroundColor: '#1E152C',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#4F3A72',
    padding: 20,
  },
  kicker: {
    color: '#BCAEE0',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom: 6,
  },
  title: {
    color: '#FFF8FF',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 8,
  },
  subtitle: {
    color: '#CFC3E8',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 18,
  },
  sectionTitle: {
    color: '#FFF8FF',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 10,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#180F23',
    color: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#5A4380',
    fontSize: 15,
  },
  primaryButton: {
    backgroundColor: '#7046C9',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#AF92F5',
    paddingVertical: 16,
    marginTop: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: '#2A1E3E',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#6A4D98',
    paddingVertical: 16,
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: '#E2D4FF',
    textAlign: 'center',
    fontWeight: '900',
    fontSize: 15,
  },
  profileRow: {
    backgroundColor: '#241836',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#4F3A72',
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
    paddingRight: 10,
  },
  profileName: {
    color: '#FFF8FF',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  profileMeta: {
    color: '#CFC3E8',
    fontSize: 12,
    lineHeight: 18,
  },
  profileAction: {
    color: '#CDBDFF',
    fontSize: 14,
    fontWeight: '900',
  },
  helper: {
    color: '#CFC3E8',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 10,
  },
  pressed: {
    opacity: 0.92,
  },
})