import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'

import ValeriaHeader from '../components/ValeriaHeader'
import PasswordVisibilityToggle from '../components/PasswordVisibilityToggle'
import { performSafeBackNavigation } from '../lib/back-navigation'
import { buildBottomNavRoute } from '../lib/bottom-nav-route'
import { prepareGuestProfileCreationInput } from '../lib/guest-profile-creation'
import { getGuestProfileLabels } from '../lib/guest-profile-identity'
import { createGuestProfile } from '../lib/guestProfiles'
import {
  addPlayerToSession,
  searchAddableProfiles,
  type AddableProfile,
} from '../lib/addable-profile-search'
import { buildAddedPlayerScoreRoute } from '../lib/added-player-score-route'
import { buildGuestScoreRoute } from '../lib/guest-score-route'
import { normalizePlayerId } from '../lib/player-id'
import {
  getTrackedPreviousRoute,
  markTrackedBackNavigation,
} from '../lib/route-history'
import { resolveSessionRouteContext } from '../lib/session-route-context'
import { Alert } from '../lib/themed-alert'
import {
  addGuestPlayerToSession,
  getActiveJoinCode,
  getActiveSessionId,
} from '../lib/sessions'
import { getBottomNavClearance } from '../lib/bottom-nav-layout'
import { theme } from '../constants/theme'

type GuestProfile = {
  id: string
  display_name: string
  player_id: string | null
}

type GuestPlayerMode = 'find' | 'create'

function fromAddableProfile(profile: AddableProfile): GuestProfile {
  return {
    id: profile.refId,
    display_name: profile.displayName,
    player_id: profile.publicPlayerId,
  }
}

export default function GuestPlayerScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const params = useLocalSearchParams<{
    sessionId?: string
    id?: string
    joinCode?: string
  }>()

  const routeSessionId = useMemo(
    () => String(params.sessionId ?? params.id ?? '').trim(),
    [params.sessionId, params.id]
  )
  const routeJoinCode = useMemo(
    () => String(params.joinCode ?? '').trim(),
    [params.joinCode]
  )
  const [effectiveSessionId, setEffectiveSessionId] = useState(routeSessionId)
  const [effectiveJoinCode, setEffectiveJoinCode] = useState(routeJoinCode)

  const [mode, setMode] = useState<GuestPlayerMode>('find')
  const [searchText, setSearchText] = useState('')
  const [results, setResults] = useState<AddableProfile[]>([])
  const [searching, setSearching] = useState(false)

  const [newDisplayName, setNewDisplayName] = useState('')
  const [newPlayerId, setNewPlayerId] = useState('')
  const [creating, setCreating] = useState(false)
  const [addingGuestId, setAddingGuestId] = useState<string | null>(null)
  // When the user taps "Add to Game" on a player (not guest) result, we
  // park the request here and prompt the target player to confirm by
  // entering their password.
  const [pendingPlayerClaim, setPendingPlayerClaim] =
    useState<AddableProfile | null>(null)
  const [pendingPlayerPassword, setPendingPlayerPassword] = useState('')
  const [pendingPlayerPasswordVisible, setPendingPlayerPasswordVisible] =
    useState(false)

  const trimmedSearch = searchText.trim()
  const compareFallbackHref = useMemo(
    () =>
      buildBottomNavRoute('/compare', {
        sessionId: effectiveSessionId,
        joinCode: effectiveJoinCode,
      }),
    [effectiveJoinCode, effectiveSessionId]
  )

  const resolveSessionContext = useCallback(async () => {
    const [storedSessionId, storedJoinCode] = await Promise.all([
      getActiveSessionId(),
      getActiveJoinCode(),
    ])

    const resolved = resolveSessionRouteContext({
      routeSessionId,
      storedSessionId,
      routeJoinCode,
      storedJoinCode,
    })

    setEffectiveSessionId(resolved.sessionId)
    setEffectiveJoinCode(resolved.joinCode)
  }, [routeJoinCode, routeSessionId])

  useEffect(() => {
    void resolveSessionContext()
  }, [resolveSessionContext])

  function switchToCreate(prefillFromSearch = false) {
    setMode('create')
    if (prefillFromSearch && trimmedSearch) {
      if (!newDisplayName.trim()) {
        setNewDisplayName(trimmedSearch)
      }

      if (!newPlayerId.trim()) {
        setNewPlayerId(normalizePlayerId(trimmedSearch))
      }
    }
  }

  function resetGuestForm(nextMode: GuestPlayerMode) {
    setMode(nextMode)
    setSearchText('')
    setResults([])
    setNewDisplayName('')
    setNewPlayerId('')
  }

  function showGuestAddedAlert(
    title: string,
    body: string,
    nextMode: GuestPlayerMode,
    guest: {
      guestName: string
      guestProfileId: string
      guestEntryId: string | null
    }
  ) {
    Alert.alert(title, body, [
      {
        text: 'Score Guest',
        onPress: () => {
          if (!guest.guestEntryId) {
            Alert.alert(
              'Missing guest entry',
              'This guest was added, but no guest entry id was returned for scoring.'
            )
            return
          }

          router.replace(
            buildGuestScoreRoute({
              sessionId: effectiveSessionId,
              joinCode: effectiveJoinCode,
              guestName: guest.guestName,
              guestProfileId: guest.guestProfileId,
              guestEntryId: guest.guestEntryId,
            })
          )
        },
      },
      {
        text: 'Add Another',
        onPress: () => resetGuestForm(nextMode),
      },
      {
        text: 'Done',
        onPress: () =>
          performSafeBackNavigation({
            canGoBack: router.canGoBack(),
            fallbackHref: compareFallbackHref,
            previousHref: getTrackedPreviousRoute(),
            back: () => router.back(),
            markBackNavigation: markTrackedBackNavigation,
            replace: (href) => router.replace(href),
          }),
      },
    ])
  }

  async function runSearch() {
    const query = trimmedSearch
    if (!query) {
      setResults([])
      return
    }

    if (!effectiveSessionId) {
      Alert.alert('Missing session', 'No session was provided for this lookup.')
      return
    }

    try {
      setSearching(true)
      const rows = await searchAddableProfiles(query, effectiveSessionId)
      setResults(rows)
    } catch (error: any) {
      Alert.alert('Search failed', error?.message ?? 'Unable to search players.')
    } finally {
      setSearching(false)
    }
  }

  async function handleAddExisting(profile: AddableProfile) {
    if (!effectiveSessionId) {
      Alert.alert('Missing session', 'No session was provided for this lookup.')
      return
    }

    const labels = getGuestProfileLabels(profile.displayName, profile.publicPlayerId)

    try {
      setAddingGuestId(profile.refId)

      if (profile.kind === 'player') {
        // Adding a registered player requires the target player to confirm
        // by entering their password. Park the request and surface the
        // password prompt instead of inserting immediately.
        setPendingPlayerClaim(profile)
        setPendingPlayerPassword('')
        setPendingPlayerPasswordVisible(false)
        setAddingGuestId(null)
        return
      }

      // Guest path stays as before.
      const legacyProfile = fromAddableProfile(profile)
      const guestEntry = await addGuestPlayerToSession(effectiveSessionId, {
        guest_profile_id: legacyProfile.id,
        display_name: legacyProfile.display_name,
        player_id: legacyProfile.player_id ?? undefined,
      })

      showGuestAddedAlert(
        'Guest added',
        `${labels.title} was added to the session.`,
        'find',
        {
          guestName: legacyProfile.display_name,
          guestProfileId: legacyProfile.id,
          guestEntryId: guestEntry.guest_entry_id,
        }
      )
    } catch (error: any) {
      Alert.alert('Unable to add guest', error?.message ?? 'Please try again.')
    } finally {
      setAddingGuestId(null)
    }
  }

  function cancelPlayerClaim() {
    setPendingPlayerClaim(null)
    setPendingPlayerPassword('')
    setPendingPlayerPasswordVisible(false)
    setAddingGuestId(null)
  }

  async function confirmPlayerClaim() {
    const profile = pendingPlayerClaim
    if (!profile) return

    if (!effectiveSessionId) {
      Alert.alert('Missing session', 'No session was provided for this lookup.')
      return
    }

    const password = pendingPlayerPassword.trim()
    if (!password) {
      Alert.alert('Password required', 'Enter the player’s password to add them.')
      return
    }

    const labels = getGuestProfileLabels(profile.displayName, profile.publicPlayerId)

    try {
      setAddingGuestId(profile.refId)
      await addPlayerToSession(effectiveSessionId, profile.refId, password)
      cancelPlayerClaim()
      Alert.alert(
        'Player added',
        `${labels.title} was added to the session. You can score on their behalf, or they can take over when they sign in.`,
        [
          {
            text: 'Score Player',
            onPress: () => {
              router.replace(
                buildAddedPlayerScoreRoute({
                  sessionId: effectiveSessionId,
                  joinCode: effectiveJoinCode,
                  addedUserId: profile.refId,
                  addedPlayerName: profile.displayName,
                  addedPlayerId: profile.publicPlayerId,
                })
              )
            },
          },
          {
            text: 'Add Another',
            onPress: () => resetGuestForm('find'),
          },
          {
            text: 'Done',
            onPress: () =>
              performSafeBackNavigation({
                canGoBack: router.canGoBack(),
                fallbackHref: compareFallbackHref,
                previousHref: getTrackedPreviousRoute(),
                back: () => router.back(),
                markBackNavigation: markTrackedBackNavigation,
                replace: (href) => router.replace(href),
              }),
          },
        ]
      )
    } catch (error: any) {
      Alert.alert('Unable to add player', error?.message ?? 'Please try again.')
    } finally {
      setAddingGuestId(null)
    }
  }

  async function handleCreateGuest() {
    let guestDraft: { displayName: string; playerId: string }

    try {
      guestDraft = prepareGuestProfileCreationInput({
        displayName: newDisplayName,
        playerId: newPlayerId,
      })
    } catch (error: any) {
      Alert.alert('Missing guest details', error?.message ?? 'Enter the guest details first.')
      return
    }

    if (!effectiveSessionId) {
      Alert.alert('Missing session', 'No session was provided for this guest player.')
      return
    }

    try {
      setCreating(true)

      const created = await createGuestProfile({
        display_name: guestDraft.displayName,
        player_id: guestDraft.playerId,
      })
      const labels = getGuestProfileLabels(created.display_name, created.player_id)

      const guestEntry = await addGuestPlayerToSession(effectiveSessionId, {
        guest_profile_id: created.id,
        display_name: created.display_name,
        player_id: created.player_id ?? guestDraft.playerId,
      })

      showGuestAddedAlert(
        'Guest created',
        `${labels.title} was created and added to the session.`,
        'create',
        {
          guestName: created.display_name,
          guestProfileId: created.id,
          guestEntryId: guestEntry.guest_entry_id,
        }
      )
    } catch (error: any) {
      Alert.alert('Unable to create guest', error?.message ?? 'Please try again.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={[styles.content, { paddingBottom: getBottomNavClearance(insets.bottom) }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
        >
          <ValeriaHeader
            compact
            showBack
            backFallbackHref={compareFallbackHref}
            title="Guest Player"
            subtitle="Find an existing shared guest or create a new one"
          />

          <View style={styles.switchCard}>
            <Text style={styles.switchTitle}>Choose Flow</Text>

            <View style={styles.modeRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.modeButton,
                  mode === 'find' && styles.modeButtonActive,
                  pressed && styles.buttonPressed,
                ]}
                onPress={() => setMode('find')}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    mode === 'find' && styles.modeButtonTextActive,
                  ]}
                >
                  Find Existing
                </Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.modeButton,
                  mode === 'create' && styles.modeButtonActive,
                  pressed && styles.buttonPressed,
                ]}
                onPress={() => setMode('create')}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    mode === 'create' && styles.modeButtonTextActive,
                  ]}
                >
                  Create New
                </Text>
              </Pressable>
            </View>
          </View>

          {mode === 'find' ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Find Player or Guest</Text>
              <Text style={styles.helperText}>
                Search by Player ID or display name. You can add a shared guest or a
                registered player profile to this game.
              </Text>

              <View style={styles.inputWrap}>
                <TextInput
                  value={searchText}
                  onChangeText={setSearchText}
                  onSubmitEditing={runSearch}
                  placeholder="Search by Player ID or name"
                  placeholderTextColor={theme.colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                  style={styles.input}
                />
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.buttonPressed,
                  searching && styles.buttonDisabled,
                ]}
                onPress={runSearch}
                disabled={searching}
              >
                <Text style={styles.primaryButtonText}>
                  {searching ? 'Searching...' : 'Search Guests'}
                </Text>
              </Pressable>

              {pendingPlayerClaim ? (
                <View style={styles.passwordPromptCard}>
                  <Text style={styles.passwordPromptTitle}>
                    {pendingPlayerClaim.displayName}, confirm your password
                  </Text>
                  <Text style={styles.helperText}>
                    To add this registered player to the game, they need to enter their
                    own password. Their stats will follow this game.
                  </Text>

                  <View style={styles.inputWrap}>
                    <TextInput
                      value={pendingPlayerPassword}
                      onChangeText={setPendingPlayerPassword}
                      placeholder="Player password"
                      placeholderTextColor={theme.colors.textMuted}
                      secureTextEntry={!pendingPlayerPasswordVisible}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="off"
                      returnKeyType="go"
                      onSubmitEditing={confirmPlayerClaim}
                      style={[styles.input, styles.passwordInput]}
                    />
                    <PasswordVisibilityToggle
                      visible={pendingPlayerPasswordVisible}
                      onPress={() => setPendingPlayerPasswordVisible((prev) => !prev)}
                      disabled={addingGuestId === pendingPlayerClaim.refId}
                      topOffset={6}
                    />
                  </View>

                  <Pressable
                    style={({ pressed }) => [
                      styles.primaryButton,
                      pressed && styles.buttonPressed,
                      addingGuestId === pendingPlayerClaim.refId && styles.buttonDisabled,
                    ]}
                    onPress={confirmPlayerClaim}
                    disabled={addingGuestId === pendingPlayerClaim.refId}
                  >
                    <Text style={styles.primaryButtonText}>
                      {addingGuestId === pendingPlayerClaim.refId
                        ? 'Verifying...'
                        : 'Confirm & Add Player'}
                    </Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      pressed && styles.buttonPressed,
                    ]}
                    onPress={cancelPlayerClaim}
                  >
                    <Text style={styles.secondaryButtonText}>Cancel</Text>
                  </Pressable>
                </View>
              ) : null}

              {results.length > 0 ? (
                <View style={styles.resultsWrap}>
                  {results.map((profile) => {
                    const busy = addingGuestId === profile.refId
                    const labels = getGuestProfileLabels(
                      profile.displayName,
                      profile.publicPlayerId
                    )
                    const kindLabel = profile.kind === 'player' ? 'Player' : 'Guest'
                    return (
                      <View key={`${profile.kind}-${profile.refId}`} style={styles.resultCard}>
                        <View style={styles.resultInfo}>
                          <Text style={styles.resultName}>
                            {labels.title}
                            <Text style={styles.resultKindBadge}>  · {kindLabel}</Text>
                          </Text>
                          {labels.subtitle ? (
                            <Text style={styles.resultMeta}>Player ID: {labels.subtitle}</Text>
                          ) : null}
                        </View>

                        <Pressable
                          style={({ pressed }) => [
                            styles.smallButton,
                            pressed && styles.buttonPressed,
                            busy && styles.buttonDisabled,
                          ]}
                          onPress={() => handleAddExisting(profile)}
                          disabled={busy}
                        >
                          <Text style={styles.smallButtonText}>
                            {busy ? 'Adding...' : 'Add to Game'}
                          </Text>
                        </Pressable>
                      </View>
                    )
                  })}
                </View>
              ) : trimmedSearch && !searching ? (
                <View style={styles.emptyResultCard}>
                  <Text style={styles.emptyResultTitle}>No matching shared guest</Text>
                  <Text style={styles.helperText}>
                    Create a new shared guest and add them to this session instead.
                  </Text>

                  <Pressable
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      pressed && styles.buttonPressed,
                    ]}
                    onPress={() => switchToCreate(true)}
                  >
                    <Text style={styles.secondaryButtonText}>Create New Guest</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Create Shared Guest</Text>
              <Text style={styles.helperText}>
                Create a reusable guest profile with a display name and Player ID. If
                they later make an account, reusing that same Player ID will link this
                guest profile.
              </Text>

              <View style={styles.inputWrap}>
                <TextInput
                  value={newDisplayName}
                  onChangeText={setNewDisplayName}
                  placeholder="Guest display name"
                  placeholderTextColor={theme.colors.textMuted}
                  autoCapitalize="words"
                  autoCorrect={false}
                  style={styles.input}
                />
              </View>

              <Text style={styles.helperText}>
                This is the name everyone will see for the guest.
              </Text>

              <View style={styles.inputWrap}>
                <TextInput
                  value={newPlayerId}
                  onChangeText={(text) => setNewPlayerId(normalizePlayerId(text))}
                  placeholder="Example: IZZY"
                  placeholderTextColor={theme.colors.textMuted}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={20}
                  style={styles.input}
                />
              </View>

              <Text style={styles.helperText}>
                Use letters, numbers, hyphen, or underscore.
              </Text>

              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.buttonPressed,
                  creating && styles.buttonDisabled,
                ]}
                onPress={handleCreateGuest}
                disabled={creating}
              >
                <Text style={styles.primaryButtonText}>
                  {creating ? 'Creating...' : 'Create and Add'}
                </Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  content: {
    padding: 10,
    paddingTop: 4,
    paddingBottom: theme.layout.floatingNavClearance,
  },

  switchCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
    ...theme.shadow.card,
  },

  switchTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 10,
  },

  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },

  modeButton: {
    flex: 1,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modeButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.borderAccent ?? theme.colors.accent,
  },

  modeButtonText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '800',
  },

  modeButtonTextActive: {
    color: theme.colors.text,
  },

  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
    ...theme.shadow.card,
  },

  sectionTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
  },

  helperText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginBottom: 10,
  },

  inputWrap: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
    marginBottom: 10,
  },

  input: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },

  passwordInput: {
    paddingRight: 44,
  },

  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.glow,
  },

  primaryButtonText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '800',
  },

  secondaryButton: {
    marginTop: 10,
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  secondaryButtonText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '800',
  },

  resultsWrap: {
    marginTop: 10,
    gap: 8,
  },

  resultCard: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },

  resultInfo: {
    flex: 1,
  },

  resultName: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },

  resultKindBadge: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  passwordPromptCard: {
    marginTop: 14,
    backgroundColor: 'rgba(123, 92, 255, 0.10)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(170, 145, 255, 0.30)',
    padding: 14,
    gap: 8,
  },

  passwordPromptTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 2,
  },

  resultMeta: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },

  smallButton: {
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 104,
    alignItems: 'center',
    justifyContent: 'center',
  },

  smallButtonText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '800',
  },

  emptyResultCard: {
    marginTop: 10,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
  },

  emptyResultTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 4,
  },

  buttonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },

  buttonDisabled: {
    opacity: 0.6,
  },
})
