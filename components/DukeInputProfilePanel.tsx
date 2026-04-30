import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native'

import DukeAnalyticsStatMarker from './DukeAnalyticsStatMarker'
import { theme } from '../constants/theme'
import { cardImages } from '../data/cardImages'
import {
  type DukeInputProfileRow,
  type ScoreFamilyRow,
} from '../lib/duke-input-analytics'
import { buildSelectedDukeInsights } from '../lib/duke-panel-insights'
import type { ResolvedDukeStatsRow } from '../lib/duke-stats-data'

type DukeInputProfileState = {
  familyRows: ScoreFamilyRow[]
  resourceRows: DukeInputProfileRow[]
  monsterRows: DukeInputProfileRow[]
  domainRows: DukeInputProfileRow[]
  usualRows: DukeInputProfileRow[]
  winningRows: DukeInputProfileRow[]
  canShowWinningProfile: boolean
  insightLines: string[]
}

type DukeInputProfilePanelProps = {
  row: ResolvedDukeStatsRow
  state: DukeInputProfileState | null
  loading: boolean
  error: string
  onRetry: () => void
}

function renderMetricLine(row: DukeInputProfileRow) {
  return `Input ${row.avg_input.toFixed(1)} · Points ${row.avg_points_generated.toFixed(1)} · Share ${row.points_share.toFixed(1)}%`
}

function ProfileRows({
  rows,
  emptyText,
  limit,
}: {
  rows: DukeInputProfileRow[]
  emptyText: string
  limit?: number
}) {
  // Filter out rows that don't contribute any points (avoids a wall of 0% noise).
  const visibleRows = rows.filter((row) => row.points_share > 0 || row.avg_points_generated > 0)

  if (visibleRows.length === 0) {
    return <Text style={styles.emptyText}>{emptyText}</Text>
  }

  return (
    <View style={styles.rowsWrap}>
      {visibleRows.slice(0, typeof limit === 'number' ? limit : visibleRows.length).map((row) => (
        <View key={`${row.profile_scope}-${row.stat_key}`} style={styles.profileRow}>
          <View style={styles.profileHeader}>
            <DukeAnalyticsStatMarker statKey={row.stat_key} fallbackLabel={row.label} />
            <Text style={styles.profileShare}>{row.points_share.toFixed(1)}%</Text>
          </View>
          <Text style={styles.profileMeta}>{renderMetricLine(row)}</Text>
        </View>
      ))}
    </View>
  )
}

function FamilyMixGrid({
  rows,
  emptyText,
}: {
  rows: ScoreFamilyRow[]
  emptyText: string
}) {
  if (rows.length === 0) {
    return <Text style={styles.emptyText}>{emptyText}</Text>
  }

  return (
    <View style={styles.familyGrid}>
      {rows.map((row) => (
        <View key={row.family_key} style={styles.familyCard}>
          <Text style={styles.familyLabel}>{row.label}</Text>
          <Text style={styles.familyValue}>{row.points_share.toFixed(1)}%</Text>
          <Text style={styles.familyMeta}>{row.avg_points_generated.toFixed(1)} avg pts</Text>
        </View>
      ))}
    </View>
  )
}

export default function DukeInputProfilePanel({
  row,
  state,
  loading,
  error,
  onRetry,
}: DukeInputProfilePanelProps) {
  const winningRows = state?.winningRows ?? []
  const familyRows = state?.familyRows ?? []
  const resourceRows = state?.resourceRows ?? []
  const monsterRows = state?.monsterRows ?? []
  const domainRows = state?.domainRows ?? []
  const canShowWinningProfile = state?.canShowWinningProfile ?? false
  const insightLines = state?.insightLines ?? []
  const resourceShare = Number(
    resourceRows.reduce((sum, row) => sum + row.points_share, 0).toFixed(1)
  )
  const monsterFamily = familyRows.find((entry) => entry.family_key === 'monsters')
  const domainFamily = familyRows.find((entry) => entry.family_key === 'domains')

  return (
    <View style={styles.panel}>
      <View style={styles.headerRow}>
        <View style={styles.imageWrap}>
          {cardImages[row.duke_slug] ? (
            <Image
              source={cardImages[row.duke_slug]}
              style={styles.dukeImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imageFallback}>
              <Text style={styles.imageFallbackText}>No Image</Text>
            </View>
          )}
        </View>

        <View style={styles.headerMeta}>
          <Text style={styles.kicker}>Selected Duke</Text>
          <Text style={styles.title}>{row.duke_name}</Text>
          <Text style={styles.subtitle}>
            {row.games_played === 1
              ? `1 tracked game · ${row.scores_through_summary}`
              : `${row.games_played} tracked games · ${row.scores_through_summary}`}
          </Text>
        </View>
      </View>

      <View style={styles.teaserGrid}>
        <View style={styles.teaserCard}>
          <Text style={styles.teaserLabel}>Scores Through</Text>
          <Text style={styles.teaserValue}>{row.scores_through_summary}</Text>
        </View>

        <View style={styles.teaserCard}>
          <Text style={styles.teaserLabel}>Winning Edge</Text>
          <Text style={styles.teaserValue}>{row.winning_edge_summary}</Text>
        </View>
      </View>

      {(() => {
        const insightCards = buildSelectedDukeInsights({
          dukeName: row.duke_name,
          gamesPlayed: row.games_played,
          familyRows,
          winningRows,
          canShowWinningProfile,
        })
        if (insightCards.length === 0) return null
        return (
          <View style={styles.insightsCard}>
            {insightCards.map((insight) => (
              <View key={insight.title} style={styles.insightItem}>
                <Text style={styles.insightItemTitle}>{insight.title}</Text>
                <Text style={styles.insightItemBody}>{insight.body}</Text>
              </View>
            ))}
          </View>
        )
      })()}

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Unable to refresh duke trends</Text>
          <Text style={styles.errorText}>{error}</Text>

          <Pressable
            style={({ pressed }) => [styles.retryButton, pressed && styles.buttonPressed]}
            onPress={onRetry}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {loading && familyRows.length === 0 && !error ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator color={theme.colors.accent} />
          <Text style={styles.loadingText}>Loading duke trends...</Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Score Mix</Text>
        <FamilyMixGrid rows={familyRows} emptyText="No family score mix data yet." />
      </View>

      <View style={styles.section}>
        <View style={styles.symbolTitleRow}>
          <DukeAnalyticsStatMarker statKey="gold" fallbackLabel="Gold" />
          <DukeAnalyticsStatMarker statKey="magic" fallbackLabel="Mana" />
          <DukeAnalyticsStatMarker statKey="fight" fallbackLabel="Fight" />
          <DukeAnalyticsStatMarker statKey="key" fallbackLabel="Key" />
        </View>
        <Text style={styles.sectionLead}>
          These symbols contribute {resourceShare.toFixed(1)}% of this duke&apos;s average final
          score.
        </Text>
        <ProfileRows rows={resourceRows} emptyText="No symbol data yet." />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Monsters</Text>
        <Text style={styles.sectionLead}>
          Monster-related scoring contributes {monsterFamily?.points_share.toFixed(1) ?? '0.0'}%
          of this duke&apos;s average final score.
        </Text>
        <ProfileRows rows={monsterRows} emptyText="No monster scoring data yet." />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Domains</Text>
        <Text style={styles.sectionLead}>
          Domain scoring contributes {domainFamily?.points_share.toFixed(1) ?? '0.0'}% of this
          duke&apos;s average final score.
        </Text>
        <ProfileRows rows={domainRows} emptyText="No domain scoring data yet." />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Winning Profile</Text>
        {!canShowWinningProfile ? (
          <Text style={styles.emptyText}>
            Three tracked wins unlock the winning profile and win-delta callouts.
          </Text>
        ) : (
          <>
            <ProfileRows
              rows={winningRows}
              emptyText="No winning profile rows yet."
              limit={4}
            />

            {insightLines.length === 0 ? (
              <Text style={styles.emptyText}>
                Wins with this duke do not overindex any input source yet.
              </Text>
            ) : (
              <View style={styles.insightList}>
                {insightLines.map((line) => (
                  <Text key={line} style={styles.insightText}>
                    {line}
                  </Text>
                ))}
              </View>
            )}
          </>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  insightsCard: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginTop: 12,
    gap: 10,
  },

  insightItem: {
    gap: 4,
  },

  insightItemTitle: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '900',
  },

  insightItemBody: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },

  panel: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.borderAccent ?? theme.colors.border,
    padding: 14,
    marginBottom: 12,
    ...theme.shadow.card,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },

  imageWrap: {
    width: 78,
    height: 78,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: theme.colors.backgroundAlt,
  },

  dukeImage: {
    width: '100%',
    height: '100%',
  },

  imageFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },

  imageFallbackText: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },

  headerMeta: {
    flex: 1,
    minWidth: 0,
  },

  kicker: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },

  title: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 4,
  },

  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },

  teaserGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  familyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  teaserCard: {
    width: '48.5%',
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginBottom: 8,
  },

  familyCard: {
    width: '31.5%',
    flexGrow: 1,
    backgroundColor: theme.colors.backgroundAlt,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 10,
    marginBottom: 8,
  },

  teaserLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },

  teaserValue: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },

  familyLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },

  familyValue: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
  },

  familyMeta: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
  },

  errorCard: {
    backgroundColor: 'rgba(255, 126, 138, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.error,
    padding: 12,
    marginBottom: 10,
  },

  errorTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 4,
  },

  errorText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },

  retryButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.error,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  retryButtonText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '900',
  },

  loadingCard: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  loadingText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },

  section: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginTop: 8,
  },

  sectionTitle: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 10,
  },

  sectionLead: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 17,
    marginBottom: 10,
  },

  symbolTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },

  rowsWrap: {
    gap: 8,
  },

  profileRow: {
    backgroundColor: theme.colors.backgroundAlt,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 10,
  },

  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    gap: 10,
  },

  profileShare: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: '900',
  },

  profileMeta: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
  },

  emptyText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },

  insightList: {
    gap: 8,
  },

  insightText: {
    color: theme.colors.success,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18,
  },

  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
})
