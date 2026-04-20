import React, { useEffect, useMemo, useState } from 'react'
import { useLocalSearchParams, router } from 'expo-router'
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  Pressable,
  Alert,
} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { supabase } from '../../lib/supabase'
import { deleteEntireSession, deleteMyParticipation } from '../../lib/deleteGame'
import { theme } from '../../constants/theme'

export default function SessionDetailsScreen() {
  const { id, joinCode } = useLocalSearchParams<{
    id?: string
    joinCode?: string
  }>()

  const [copied, setCopied] = useState(false)
  const [isCreator, setIsCreator] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const displayedCode = useMemo(() => {
    if (typeof joinCode === 'string' && joinCode.length > 0) return joinCode
    return '------'
  }, [joinCode])

  useEffect(() => {
    async function loadCreatorState() {
      try {
        if (typeof id !== 'string' || !id) return

        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) return

        const { data, error } = await supabase
          .from('game_sessions')
          .select('created_by')
          .eq('id', id)
          .maybeSingle()

        if (error) throw error
        setIsCreator(data?.created_by === user.id)
      } catch (err) {
        console.error(err)
      }
    }

    loadCreatorState()
  }, [id])

  const copyCode = async () => {
    if (!displayedCode || displayedCode === '------') return
    await Clipboard.setStringAsync(displayedCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function handleDelete() {
    if (typeof id !== 'string' || !id) return

    if (isCreator) {
      Alert.alert(
        'Delete entire game?',
        'This will permanently delete the whole session, including scores and guest entries.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete Game',
            style: 'destructive',
            onPress: async () => {
              try {
                setDeleting(true)
                await deleteEntireSession(id)
                router.replace('/create-session')
              } catch (err: any) {
                Alert.alert('Delete failed', err?.message ?? 'Unknown error')
              } finally {
                setDeleting(false)
              }
            },
          },
        ]
      )
      return
    }

    Alert.alert(
      'Remove your game entries?',
      'This will remove your score and any guest players entered from this device for this session.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove My Entries',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true)
              await deleteMyParticipation(id)
              router.replace('/create-session')
            } catch (err: any) {
              Alert.alert('Delete failed', err?.message ?? 'Unknown error')
            } finally {
              setDeleting(false)
            }
          },
        },
      ]
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.heroCard}>
          <Text style={styles.kicker}>Multiplayer Session</Text>
          <Text style={styles.title}>Session Hub</Text>
          <Text style={styles.subtitle}>
            Copy the join code, continue scoring, add a guest player, compare results, or remove this session.
          </Text>
        </View>

        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>Join Code</Text>
          <Text style={styles.codeValue}>{displayedCode}</Text>

          <Pressable
            style={({ pressed }) => [
              styles.copyButton,
              pressed && styles.pressed,
            ]}
            onPress={copyCode}
          >
            <Text style={styles.copyButtonText}>
              {copied ? 'Copied' : 'Copy Code'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.grid}>
          <Pressable
            style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
            onPress={() =>
              router.push({
                pathname: '/score',
                params: {
                  sessionId: typeof id === 'string' ? id : '',
                  joinCode: displayedCode,
                },
              })
            }
          >
            <Text style={styles.actionTitle}>Resume</Text>
            <Text style={styles.actionText}>Continue your score</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
            onPress={() =>
              router.push({
                pathname: '/guest-player',
                params: {
                  sessionId: typeof id === 'string' ? id : '',
                  joinCode: displayedCode,
                },
              })
            }
          >
            <Text style={styles.actionTitle}>Add Guest</Text>
            <Text style={styles.actionText}>Create or pick a guest</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
            onPress={() =>
              router.push({
                pathname: '/compare',
                params: {
                  sessionId: typeof id === 'string' ? id : '',
                  joinCode: displayedCode,
                },
              })
            }
          >
            <Text style={styles.actionTitle}>Compare</Text>
            <Text style={styles.actionText}>See live results</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
            onPress={() => router.replace('/create-session')}
          >
            <Text style={styles.actionTitle}>New Session</Text>
            <Text style={styles.actionText}>Start another table</Text>
          </Pressable>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.deleteButton,
            pressed && styles.pressed,
            deleting && styles.disabled,
          ]}
          onPress={handleDelete}
          disabled={deleting}
        >
          <Text style={styles.deleteButtonText}>
            {deleting
              ? 'Deleting...'
              : isCreator
              ? 'Delete Entire Game'
              : 'Remove My Entries'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  screen: {
    flex: 1,
    padding: 16,
  },

  heroCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 18,
    marginBottom: 12,
    ...theme.shadow.card,
  },

  kicker: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },

  title: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 6,
  },

  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },

  codeCard: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    padding: 16,
    marginBottom: 12,
    ...theme.shadow.glow,
  },

  codeLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },

  codeValue: {
    color: theme.colors.text,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 12,
  },

  copyButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: 16,
    paddingVertical: 12,
  },

  copyButtonText: {
    color: theme.colors.background,
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 14,
  },

  actionButton: {
    width: '48%',
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    minHeight: 110,
    justifyContent: 'space-between',
    ...theme.shadow.card,
  },

  actionTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 6,
  },

  actionText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },

  deleteButton: {
    backgroundColor: 'rgba(240, 138, 126, 0.12)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.error,
    paddingVertical: 14,
  },

  deleteButtonText: {
    color: theme.colors.error,
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
  },

  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },

  disabled: {
    opacity: 0.5,
  },
})