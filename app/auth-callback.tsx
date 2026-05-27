import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import * as Linking from 'expo-linking'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { theme } from '../constants/theme'
import { Alert } from '../lib/themed-alert'
import { extractSessionTokensFromUrl } from '../lib/auth-link-session'
import {
  CLAIM_GUEST_PUBLIC_PLAYER_ID_KEY,
  executePendingGuestClaim,
} from '../lib/claim-guest-flow'
import { ensureProfileRow, getMyProfile } from '../lib/profile'
import { supabase } from '../lib/supabase'

export default function AuthCallbackScreen() {
  const linkingUrl = Linking.useLinkingURL()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function finishEmailConfirmation() {
      try {
        setErrorMessage(null)

        const incomingUrl = linkingUrl ?? (await Linking.getInitialURL())
        const tokens = extractSessionTokensFromUrl(incomingUrl)

        if (!tokens) {
          throw new Error('That confirmation link is missing its session tokens. Request a new email and try again.')
        }

        await supabase.auth.setSession({
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
        })

        await ensureProfileRow()

        const {
          data: { user: authUser },
        } = await supabase.auth.getUser()

        const claimOutcome = await executePendingGuestClaim(authUser?.user_metadata, {
          callClaimRpc: async (input) => {
            const { data, error: rpcError } = await supabase.rpc('claim_guest_profile', {
              p_public_player_id: input.publicPlayerId,
            })
            return { data, error: rpcError }
          },
          clearPendingMetadata: async () => {
            await supabase.auth.updateUser({
              data: {
                [CLAIM_GUEST_PUBLIC_PLAYER_ID_KEY]: null,
              },
            })
          },
        })

        if (claimOutcome.status === 'claimed') {
          Alert.alert(
            'Guest stats claimed',
            `Moved ${claimOutcome.result.scores_transferred} game${
              claimOutcome.result.scores_transferred === 1 ? '' : 's'
            } from "${claimOutcome.result.guest_display_name}" to your account.`
          )
        } else if (claimOutcome.status === 'failed') {
          Alert.alert("Couldn't claim guest", claimOutcome.message)
        }

        const profile = await getMyProfile()

        if (!mounted) return

        router.replace(profile?.public_player_id ? '/create-session' : '/choose-player-id')
      } catch (err: any) {
        if (!mounted) return
        setErrorMessage(
          err?.message ?? 'We could not finish that email confirmation. Request a new email and try again.'
        )
      }
    }

    void finishEmailConfirmation()

    return () => {
      mounted = false
    }
  }, [linkingUrl])

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        {errorMessage ? (
          <>
            <Text style={styles.title}>Email Confirmation Failed</Text>
            <Text style={styles.body}>{errorMessage}</Text>
            <Pressable
              style={({ pressed }) => [styles.button, pressed && styles.pressed]}
              onPress={() => router.replace('/login')}
            >
              <Text style={styles.buttonText}>Back To Login</Text>
            </Pressable>
          </>
        ) : (
          <>
            <ActivityIndicator color={theme.colors.accent} size="large" />
            <Text style={styles.title}>Confirming Your Email</Text>
            <Text style={styles.body}>
              We are opening your account and finishing the sign-up link now.
            </Text>
          </>
        )}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xxl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 24,
    alignItems: 'center',
    gap: 14,
    ...theme.shadow.glow,
  },
  title: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  body: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  button: {
    marginTop: 6,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: 'center',
    alignSelf: 'stretch',
    ...theme.shadow.glow,
  },
  buttonText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.9,
  },
})
