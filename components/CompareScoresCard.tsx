import { useRef } from 'react'
import { Image, Pressable, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { theme } from '../constants/theme'
import { cardImages } from '../data/cardImages'
import type { CompareEntry } from '../lib/compare-entries'
import { buildCompareGuestRemovalPlan } from '../lib/compare-guest-removal'
import { buildCompareEntryScoreRoute } from '../lib/compare-score-route'
import {
  buildCompareEntryStatusText,
  getCompareEntryStatusTone,
} from '../lib/compare-screen-state'
import { compareScreenStyles as styles } from './compare-screen-styles'

type Props = {
  scores: CompareEntry[]
  loading: boolean
  sessionId: string
  joinCode: string
  currentUserId: string
  viewerCanRemoveGuestSeats: boolean
  expectedPlayerCount: number
  minimumPlayerCount: number
  onOpenScoreEntry: (entry: CompareEntry) => void
  onRemoveGuestEntry: (entry: CompareEntry, nextExpectedPlayerCount: number) => void
}

export default function CompareScoresCard({
  scores,
  loading,
  sessionId,
  joinCode,
  currentUserId,
  viewerCanRemoveGuestSeats,
  expectedPlayerCount,
  minimumPlayerCount,
  onOpenScoreEntry,
  onRemoveGuestEntry,
}: Props) {
  const longPressEntryIdRef = useRef<string | null>(null)

  return (
    <View style={styles.scoresCard}>
      <Text style={styles.sectionTitle}>Standings</Text>

      {scores.length === 0 && !loading ? (
        <Text style={styles.emptyText}>No saved scores yet.</Text>
      ) : (
        scores.map((entry, index) => {
          const rowTarget = buildCompareEntryScoreRoute(entry, {
            sessionId,
            joinCode,
            currentUserId,
          })
          const removalPlan = buildCompareGuestRemovalPlan({
            viewerCanRemove: viewerCanRemoveGuestSeats,
            expectedPlayerCount,
            minimumPlayerCount,
            entry,
          })
          const rowStatusTone = getCompareEntryStatusTone(entry)
          const rowStatusText = buildCompareEntryStatusText(entry, {
            isEditable: Boolean(rowTarget),
          })
          const canInteract = Boolean(rowTarget) || removalPlan.canRemove
          const idLabel = entry.playerId ? entry.playerId : '—'

          return (
            <Pressable
              key={entry.id}
              style={({ pressed }) => [
                styles.scoreRow,
                canInteract && pressed && styles.buttonPressed,
              ]}
              onPress={() => {
                if (longPressEntryIdRef.current === entry.id) {
                  longPressEntryIdRef.current = null
                  return
                }

                if (rowTarget) {
                  onOpenScoreEntry(entry)
                }
              }}
              onLongPress={
                removalPlan.canRemove
                  ? () => {
                      longPressEntryIdRef.current = entry.id
                      onRemoveGuestEntry(
                        entry,
                        removalPlan.nextExpectedPlayerCount ?? expectedPlayerCount
                      )
                    }
                  : undefined
              }
              delayLongPress={400}
              disabled={!canInteract}
            >
              <View style={styles.rankWrap}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankBadgeText}>{entry.placement ?? index + 1}</Text>
                </View>
              </View>

              <View style={styles.thumbWrap}>
                {entry.dukeSlug && cardImages[entry.dukeSlug] ? (
                  <Image
                    source={cardImages[entry.dukeSlug]}
                    style={styles.thumb}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.thumbFallback}>
                    <MaterialCommunityIcons
                      name="shield-half-full"
                      size={28}
                      color={theme.colors.accent}
                    />
                  </View>
                )}
              </View>

              <View style={styles.scoreMeta}>
                <Text style={styles.scoreName} numberOfLines={1} ellipsizeMode="tail">
                  {entry.label}
                  {entry.isGuest ? ' (Guest)' : ''}
                </Text>

                <Text style={styles.scoreId} numberOfLines={1} ellipsizeMode="tail">
                  {idLabel}
                </Text>

                <View style={styles.scoreStatusRow}>
                  <View
                    style={[
                      styles.statusDot,
                      rowStatusTone === 'pending'
                        ? styles.statusDotPending
                        : rowStatusTone === 'locked'
                        ? styles.statusDotLocked
                        : styles.statusDotOpen,
                    ]}
                  />
                  <Text style={styles.scoreSubtext} numberOfLines={2}>
                    {rowStatusText}
                    {removalPlan.canRemove ? ' · Hold to remove' : ''}
                  </Text>
                </View>
              </View>

              <View style={styles.scoreValueWrap}>
                <Text
                  style={[styles.scoreValue, !entry.hasScore && styles.scoreValuePending]}
                >
                  {entry.hasScore ? entry.totalScore : '—'}
                </Text>
              </View>
            </Pressable>
          )
        })
      )}
    </View>
  )
}
