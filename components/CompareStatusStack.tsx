import { Pressable, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { theme } from '../constants/theme'
import type { CompareEntry } from '../lib/compare-entries'
import { compareScreenStyles as styles } from './compare-screen-styles'

type Props = {
  leader: CompareEntry | null
  loadNotice: string
  loadError: string
  hasScores: boolean
  loading: boolean
  didLoadOnce: boolean
  deleting: boolean
  onRetry: () => void
}

export default function CompareStatusStack({
  leader,
  loadNotice,
  loadError,
  hasScores,
  loading,
  didLoadOnce,
  deleting,
  onRetry,
}: Props) {
  return (
    <>
      {leader ? (
        <View style={styles.leaderStrip}>
          <View style={styles.leaderBadge}>
            <Text style={styles.leaderBadgeText}>Leader</Text>
          </View>

          <View style={styles.leaderStripMeta}>
            <Text style={styles.leaderStripName}>
              {leader.label}
              {leader.playerId ? ` (${leader.playerId})` : ''}
            </Text>
            <Text style={styles.leaderStripSub}>{`${leader.totalScore} - ${leader.dukeName}`}</Text>
          </View>
        </View>
      ) : null}

      {loadNotice ? (
        <View style={styles.inlineNotice}>
          <MaterialCommunityIcons
            name="information-outline"
            size={14}
            color={theme.colors.accent}
            style={styles.inlineNoticeIcon}
          />
          <Text style={styles.inlineNoticeText} numberOfLines={2}>
            {loadNotice}
          </Text>
        </View>
      ) : null}

      {loadError ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Unable to refresh compare data</Text>
          <Text style={styles.errorText}>
            {loadError}
            {hasScores ? ' Showing the last successful standings below.' : ''}
          </Text>

          <Pressable
            style={({ pressed }) => [styles.errorButton, pressed && styles.buttonPressed]}
            onPress={onRetry}
          >
            <Text style={styles.errorButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {loading && !didLoadOnce ? (
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Loading scores...</Text>
          <Text style={styles.statusText}>Pulling current session standings.</Text>
        </View>
      ) : null}

      {deleting ? (
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Deleting session...</Text>
          <Text style={styles.statusText}>
            Removing scores, players, and session record.
          </Text>
        </View>
      ) : null}
    </>
  )
}
