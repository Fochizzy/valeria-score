import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import AnalyticsSegmentedControl from '../components/AnalyticsSegmentedControl'
import ManageAccountModal from '../components/ManageAccountModal'
import PlayerCategoryBreakdownCard from '../components/PlayerCategoryBreakdownCard'
import ValeriaHeader from '../components/ValeriaHeader'
import { playerStatsSurface } from '../constants/analyticsPageSurface'
import { theme } from '../constants/theme'
import {
  analyticsRouteHrefByKey,
  buildAnalyticsRouteToggleSegments,
} from '../lib/analytics-route-toggle'
import { getBottomNavClearance } from '../lib/bottom-nav-layout'
import { formatDukeName } from '../lib/duke-names'
import { logoutAndClearActiveSessionState } from '../lib/logout'
import {
  buildBoundManageAccountMenuActions,
  manageAccountAlertCopy,
  manageAccountHeaderProps,
} from '../lib/manage-account-menu'
import {
  buildProtectedAnalyticsAccessState,
  resolveProtectedAnalyticsViewerUserId,
} from '../lib/protected-analytics-access'
import { clearActiveSessionState } from '../lib/sessions'
import {
  loadSoloStatsBundle,
  type SoloConditionSummaryRow,
  type SoloMatchupRow,
  type SoloStatsBundle,
} from '../lib/solo-stats'
import {
  SOLO_VICTORY_CONDITION_OPTIONS,
  type SoloVictoryCondition,
} from '../lib/solo-mode'
import { supabase } from '../lib/supabase'
import { Alert } from '../lib/themed-alert'

type InsightRow = {
  label: string
  value: string
  helper: string
}

type MatchupExpansionId = string | null

function getConditionLabel(condition: SoloVictoryCondition) {
  return (
    SOLO_VICTORY_CONDITION_OPTIONS.find((option) => option.id === condition)?.title ??
    condition
  )
}

function joinLabels(labels: string[]) {
  if (labels.length === 0) return ''
  if (labels.length === 1) return labels[0]
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`
  return `${labels.slice(0, -1).join(', ')}, and ${labels.at(-1)}`
}

function formatGameCount(count: number) {
  return `${count} game${count === 1 ? '' : 's'}`
}

function buildMatchupExpansionId(section: string, row: SoloMatchupRow) {
  return `${section}:${row.playerDukeSlug}:${row.darkLordDukeSlug}`
}

function formatResolutionSplit(row: SoloMatchupRow) {
  const parts = [`Contested ${row.resolutionSplit.contested}`]

  if (row.resolutionSplit.playerAuto > 0) {
    parts.push(`Player auto ${row.resolutionSplit.playerAuto}`)
  }

  if (row.resolutionSplit.darkLordAuto > 0) {
    parts.push(`Dark Lord auto ${row.resolutionSplit.darkLordAuto}`)
  }

  return parts.join(' - ')
}

function buildDukelessRankingNote(count: number) {
  if (count === 1) {
    return 'An automatic solo result was saved without Dukes, so it counts in totals but not Duke or matchup rankings.'
  }

  return `${count} automatic solo results were saved without Dukes, so they count in totals but not Duke or matchup rankings.`
}

function buildWinPatternRows(bundle: SoloStatsBundle): InsightRow[] {
  const { strongestDuke, bestVictoryCondition, contestedConversion } =
    bundle.strategy.winPatterns

  return [
    {
      label: 'Strongest Duke',
      value: strongestDuke ? formatDukeName(strongestDuke.dukeSlug) : 'Not enough solo data yet',
      helper: strongestDuke
        ? `${strongestDuke.winRate}% win rate in ${formatGameCount(strongestDuke.games)}`
        : 'Need 3 games with one Duke before this ranking appears.',
    },
    {
      label: 'Best Victory Condition',
      value: bestVictoryCondition
        ? getConditionLabel(bestVictoryCondition.victoryCondition)
        : 'Not enough solo data yet',
      helper: bestVictoryCondition
        ? `${bestVictoryCondition.winRate}% player win rate across ${formatGameCount(bestVictoryCondition.totalGames)}`
        : 'Play a few solo endings to compare the conditions.',
    },
    {
      label: 'Contested Conversion',
      value: contestedConversion.total
        ? `${contestedConversion.winRate}%`
        : 'No contested games yet',
      helper: contestedConversion.total
        ? `${contestedConversion.wins} of ${contestedConversion.total} contested games won`
        : 'This fills in once a solo game reaches scoring.',
    },
  ]
}

function buildRiskPatternRows(bundle: SoloStatsBundle): InsightRow[] {
  const {
    hardestVictoryCondition,
    toughestDarkLord,
    lossTypeSplit,
    lossTrapCategory,
  } = bundle.strategy.riskPatterns

  return [
    {
      label: 'Hardest Victory Condition',
      value: hardestVictoryCondition
        ? getConditionLabel(hardestVictoryCondition.victoryCondition)
        : 'Not enough solo data yet',
      helper: hardestVictoryCondition
        ? `${hardestVictoryCondition.winRate}% player win rate across ${formatGameCount(hardestVictoryCondition.totalGames)}`
        : 'Play a few solo endings to compare the conditions.',
    },
    {
      label: 'Toughest Dark Lord',
      value: toughestDarkLord
        ? formatDukeName(toughestDarkLord.dukeSlug)
        : 'Not enough solo data yet',
      helper: toughestDarkLord
        ? `${toughestDarkLord.wins}-${toughestDarkLord.losses} record in ${formatGameCount(toughestDarkLord.games)}`
        : 'Need 3 games against one Dark Lord before this ranking appears.',
    },
    {
      label: 'Loss Type Split',
      value: `${lossTypeSplit.autoLosses} / ${lossTypeSplit.contestedLosses}`,
      helper: 'Auto losses / contested losses',
    },
    {
      label: 'Loss Trap Category',
      value: lossTrapCategory ?? 'Not enough solo data yet',
      helper: lossTrapCategory
        ? 'Biggest average drop from wins to losses'
        : 'Need both wins and losses before this pattern appears.',
    },
  ]
}

function SoloInsightCard({
  title,
  subtitle,
  rows,
  footer,
  noteText,
  stackRows = false,
}: {
  title: string
  subtitle: string
  rows: InsightRow[]
  footer?: string | null
  noteText?: string | null
  stackRows?: boolean
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>{subtitle}</Text>
      <Text style={styles.cardTitle}>{title}</Text>
      {noteText ? (
        <View style={styles.noteRow}>
          <Text style={styles.noteBadge}>Min 3 games</Text>
          <Text style={styles.noteText}>{noteText}</Text>
        </View>
      ) : null}

      {rows.map((row) => (
        <View key={row.label} style={[styles.listRow, stackRows && styles.listRowStacked]}>
          <View style={styles.listCopy}>
            <Text style={styles.listTitle}>{row.label}</Text>
            <Text style={styles.listSubtitle}>{row.helper}</Text>
          </View>

          <View
            style={[styles.listValueGroup, stackRows && styles.listValueGroupStacked]}
          >
            <Text style={[styles.listValue, stackRows && styles.listValueStacked]}>
              {row.value}
            </Text>
          </View>
        </View>
      ))}

      {footer ? <Text style={styles.insightFooter}>{footer}</Text> : null}
    </View>
  )
}

function SoloConditionCard({
  rows,
  stackRows = false,
}: {
  rows: SoloConditionSummaryRow[]
  stackRows?: boolean
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>Consistency</Text>
      <Text style={styles.cardTitle}>Victory Types</Text>

      {rows.map((row) => (
        <View
          key={row.victoryCondition}
          style={[styles.listRow, stackRows && styles.listRowStacked]}
        >
          <View style={styles.listCopy}>
            <Text style={styles.listTitle}>{getConditionLabel(row.victoryCondition)}</Text>
            <Text style={styles.listSubtitle}>
              {formatGameCount(row.totalGames)} - {row.wins}-{row.losses} record
            </Text>
          </View>

          <View
            style={[styles.listValueGroup, stackRows && styles.listValueGroupStacked]}
          >
            <Text style={[styles.listValue, stackRows && styles.listValueStacked]}>
              {row.winRate}%
            </Text>
            <Text style={styles.listValueMeta}>Player wins</Text>
          </View>
        </View>
      ))}
    </View>
  )
}

function ExpandableMatchupRow({
  row,
  expansionId,
  expandedMatchupKey,
  onToggle,
}: {
  row: SoloMatchupRow
  expansionId: string
  expandedMatchupKey: MatchupExpansionId
  onToggle: (expansionId: string) => void
}) {
  const isExpanded = expandedMatchupKey === expansionId

  return (
    <View style={styles.matchupRowShell}>
      <Pressable
        style={({ pressed }) => [
          styles.listRow,
          styles.matchupPressable,
          pressed && styles.buttonPressed,
        ]}
        onPress={() => onToggle(expansionId)}
      >
        <View style={styles.listCopy}>
          <Text style={styles.listTitle}>
            {formatDukeName(row.playerDukeSlug)} vs {formatDukeName(row.darkLordDukeSlug)}
          </Text>
          <Text style={styles.listSubtitle}>
            {row.wins}-{row.losses} record - {row.winRate}% player win rate
          </Text>
        </View>

        <View style={styles.listValueGroup}>
          <Text style={styles.listValue}>
            {row.avgMargin >= 0 ? '+' : ''}
            {row.avgMargin}
          </Text>
          <Text style={styles.listValueMeta}>
            {isExpanded ? 'Hide details' : 'Tap for details'}
          </Text>
        </View>
      </Pressable>

      {isExpanded ? (
        <View style={styles.matchupExpansion}>
          <View style={styles.matchupMetricGrid}>
            <View style={styles.matchupMetricTile}>
              <Text style={styles.matchupMetricLabel}>Games</Text>
              <Text style={styles.matchupMetricValue}>{row.games}</Text>
            </View>

            <View style={styles.matchupMetricTile}>
              <Text style={styles.matchupMetricLabel}>Avg player total</Text>
              <Text style={styles.matchupMetricValue}>{row.avgPlayerTotal}</Text>
            </View>

            <View style={styles.matchupMetricTile}>
              <Text style={styles.matchupMetricLabel}>Avg Dark Lord total</Text>
              <Text style={styles.matchupMetricValue}>{row.avgDarkLordTotal}</Text>
            </View>
          </View>

          <View style={styles.matchupDetailBlock}>
            <Text style={styles.matchupDetailLabel}>Victory condition split</Text>
            {row.conditionRows.map((conditionRow) => (
              <Text
                key={`${expansionId}:${conditionRow.victoryCondition}`}
                style={styles.matchupDetailText}
              >
                {getConditionLabel(conditionRow.victoryCondition)}: {formatGameCount(conditionRow.totalGames)} -{' '}
                {conditionRow.wins}-{conditionRow.losses} record
              </Text>
            ))}
          </View>

          <View style={styles.matchupDetailBlock}>
            <Text style={styles.matchupDetailLabel}>Resolution split</Text>
            <Text style={styles.matchupDetailText}>{formatResolutionSplit(row)}</Text>
          </View>
        </View>
      ) : null}
    </View>
  )
}

function MatchupList({
  title,
  rows,
  emptyText,
  sectionKey,
  expandedMatchupKey,
  onToggleMatchup,
}: {
  title: string
  rows: SoloMatchupRow[]
  emptyText: string
  sectionKey: string
  expandedMatchupKey: MatchupExpansionId
  onToggleMatchup: (expansionId: string) => void
}) {
  return (
    <View style={styles.matchupSection}>
      <Text style={styles.matchupSectionTitle}>{title}</Text>

      {rows.length === 0 ? (
        <Text style={styles.emptyText}>{emptyText}</Text>
      ) : (
        rows.map((row) => (
          <ExpandableMatchupRow
            key={`${sectionKey}-${row.playerDukeSlug}-${row.darkLordDukeSlug}`}
            row={row}
            expansionId={buildMatchupExpansionId(sectionKey, row)}
            expandedMatchupKey={expandedMatchupKey}
            onToggle={onToggleMatchup}
          />
        ))
      )}
    </View>
  )
}

function SoloMatchupsCard({
  best,
  worst,
  expandedMatchupKey,
  onToggleMatchup,
}: Omit<SoloStatsBundle['strategy']['matchups'], 'mostPlayed'> & {
  expandedMatchupKey: MatchupExpansionId
  onToggleMatchup: (expansionId: string) => void
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>Exact Rivalries</Text>
      <Text style={styles.cardTitle}>Matchups</Text>
      <View style={styles.noteRow}>
        <Text style={styles.noteBadge}>Min 3 games</Text>
        <Text style={styles.noteText}>
          Best and worst matchup lists unlock after 3 games per pairing.
        </Text>
      </View>

      <MatchupList
        title="Best Matchups"
        rows={best}
        emptyText="Not enough 3-game matchup samples yet."
        sectionKey="best"
        expandedMatchupKey={expandedMatchupKey}
        onToggleMatchup={onToggleMatchup}
      />

      <MatchupList
        title="Worst Matchups"
        rows={worst}
        emptyText="Not enough 3-game matchup samples yet."
        sectionKey="worst"
        expandedMatchupKey={expandedMatchupKey}
        onToggleMatchup={onToggleMatchup}
      />
    </View>
  )
}

export default function SoloStatsScreen() {
  const { width } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const [bundle, setBundle] = useState<SoloStatsBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [expandedMatchupKey, setExpandedMatchupKey] = useState<MatchupExpansionId>(null)
  const [accountMenuVisible, setAccountMenuVisible] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [viewerUserId, setViewerUserId] = useState<string | null | undefined>(undefined)

  const accessState = useMemo(
    () =>
      viewerUserId === undefined
        ? null
        : buildProtectedAnalyticsAccessState('/solo-stats', viewerUserId),
    [viewerUserId]
  )
  const analyticsRouteSegments = useMemo(() => buildAnalyticsRouteToggleSegments('solo'), [])

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError) throw sessionError

      const nextViewerUserId = resolveProtectedAnalyticsViewerUserId(session)
      setViewerUserId(nextViewerUserId)

      if (!nextViewerUserId) {
        setBundle(null)
        return
      }

      const nextBundle = await loadSoloStatsBundle(nextViewerUserId)
      setBundle(nextBundle)
    } catch (err: any) {
      console.error(err)
      setLoadError(err?.message ?? 'Unable to load solo statistics right now. Pull to retry.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true)
      await load()
    } finally {
      setRefreshing(false)
    }
  }, [load])

  const handleLogout = useCallback(async () => {
    try {
      setLoggingOut(true)
      await logoutAndClearActiveSessionState({
        signOut: () => supabase.auth.signOut(),
        clearActiveSessionState,
      })
      router.replace('/')
    } catch (err: any) {
      Alert.alert('Logout failed', err?.message ?? 'Unknown error')
    } finally {
      setLoggingOut(false)
    }
  }, [])

  const accountMenuActions = useMemo(
    () =>
      buildBoundManageAccountMenuActions({
        onManageData: () => router.push('/manage-data'),
        onNewSession: () => router.replace('/create-session'),
        onDukeStatistics: () => router.push('/duke-stats'),
        onPlayerStatistics: () => router.push('/player-stats'),
        onGlobalTrends: () => router.push('/global-trends'),
        onSoloStatistics: () => router.push('/solo-stats' as never),
        onAbout: () => router.push('/about'),
        onLogout: () => {
          void handleLogout()
        },
      }),
    [handleLogout]
  )

  const handleAnalyticsRouteChange = useCallback(
    (key: string) => {
      const nextSegment = analyticsRouteSegments.find((segment) => segment.key === key)
      if (!nextSegment || nextSegment.href === analyticsRouteHrefByKey.solo) return
      router.push(nextSegment.href as never)
    },
    [analyticsRouteSegments]
  )

  const toggleExpandedMatchup = useCallback((nextExpansionId: string) => {
    setExpandedMatchupKey((currentValue) =>
      currentValue === nextExpansionId ? null : nextExpansionId
    )
  }, [])

  const summaryTiles = bundle
    ? [
        {
          label: 'Win Rate',
          value: `${bundle.summary.winRate}%`,
          helper: `${bundle.summary.wins}-${bundle.summary.losses} record`,
        },
        {
          label: 'Loss Rate',
          value: `${bundle.summary.lossRate}%`,
          helper: `${bundle.summary.autoLosses} auto - ${bundle.summary.contestedLosses} contested`,
        },
        {
          label: 'Avg Margin',
          value: `${bundle.summary.avgMargin >= 0 ? '+' : ''}${bundle.summary.avgMargin}`,
          helper: `Player ${bundle.summary.avgPlayerTotal} - Dark Lord ${bundle.summary.avgDarkLordTotal}`,
        },
        {
          label: 'Auto Wins',
          value: String(bundle.summary.autoWins),
          helper: `${bundle.summary.contestedWins} contested wins`,
        },
      ]
    : []

  const winPatternRows = bundle ? buildWinPatternRows(bundle) : []
  const riskPatternRows = bundle ? buildRiskPatternRows(bundle) : []
  const stackInsightRows = width < 430

  return (
    <View style={styles.pageBackground}>
      <View style={styles.pageScrim}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom: getBottomNavClearance(insets.bottom),
            },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.accent}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <ValeriaHeader
            compact
            showBack
            title="Solo Statistics"
            subtitle="Separate solo win-loss trends, matchups, and scoring patterns"
            {...manageAccountHeaderProps}
            onRightPress={() => setAccountMenuVisible(true)}
            rightDisabled={loggingOut}
          />

          <AnalyticsSegmentedControl
            segments={analyticsRouteSegments}
            activeKey="solo"
            onChange={handleAnalyticsRouteChange}
          />

          {accessState && !accessState.canLoad ? (
            <View style={styles.accessCard}>
              <Text style={styles.accessTitle}>{accessState.title}</Text>
              <Text style={styles.accessText}>{accessState.body}</Text>
              <Pressable
                style={({ pressed }) => [styles.accessButton, pressed && styles.buttonPressed]}
                onPress={() => router.push(accessState.actionPath)}
              >
                <Text style={styles.accessButtonText}>{accessState.actionLabel}</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {loadError ? (
                <View style={styles.errorCard}>
                  <Text style={styles.errorTitle}>Could not refresh solo statistics</Text>
                  <Text style={styles.errorText}>{loadError}</Text>
                  <Pressable
                    style={({ pressed }) => [styles.retryButton, pressed && styles.buttonPressed]}
                    onPress={() => {
                      void load()
                    }}
                  >
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </Pressable>
                </View>
              ) : null}

              {bundle && bundle.summary.totalGames > 0 ? (
                <>
                  <View style={styles.statGridCard}>
                    <Text style={styles.kicker}>Across Your Solo Campaigns</Text>
                    <Text style={styles.cardTitle}>Solo Snapshot</Text>
                    <View style={styles.statGrid}>
                      {summaryTiles.map((tile) => (
                        <View key={tile.label} style={styles.statTile}>
                          <Text style={styles.statTileLabel}>{tile.label}</Text>
                          <Text style={styles.statTileValue}>{tile.value}</Text>
                          <Text style={styles.statTileHelper}>{tile.helper}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  <SoloConditionCard rows={bundle.conditionRows} stackRows={stackInsightRows} />

                  <SoloInsightCard
                    title="Win Patterns"
                    subtitle="What is working in your solo runs"
                    rows={winPatternRows}
                    stackRows={stackInsightRows}
                    noteText="Duke rankings unlock after 3 games with the same Duke."
                    footer={
                      bundle.strategy.winPatterns.winningCategories.length > 0
                        ? `Your wins usually come from ${joinLabels(bundle.strategy.winPatterns.winningCategories)}.`
                        : 'Need a few solo wins before your winning score profile appears.'
                    }
                  />

                  <SoloInsightCard
                    title="Risk Patterns"
                    subtitle="Where solo games usually slip away"
                    rows={riskPatternRows}
                    stackRows={stackInsightRows}
                    noteText="Dark Lord rankings unlock after 3 games against the same Duke."
                    footer={
                      bundle.strategy.riskPatterns.lossTrapCategory
                        ? `Losses fall off most in ${bundle.strategy.riskPatterns.lossTrapCategory}.`
                        : 'Need a few solo losses before your risk patterns appear.'
                    }
                  />

                  {bundle.meta.dukelessAutomaticResults > 0 ? (
                    <View style={styles.noticeCard}>
                      <Text style={styles.noticeTitle}>Ranking note</Text>
                      <Text style={styles.noticeText}>
                        {buildDukelessRankingNote(bundle.meta.dukelessAutomaticResults)}
                      </Text>
                    </View>
                  ) : null}

                  <SoloMatchupsCard
                    best={bundle.strategy.matchups.best}
                    worst={bundle.strategy.matchups.worst}
                    expandedMatchupKey={expandedMatchupKey}
                    onToggleMatchup={toggleExpandedMatchup}
                  />

                  <PlayerCategoryBreakdownCard
                    stats={bundle.categoryStats}
                    title="Where Your Solo Points Come From"
                    kicker="Solo Point Distribution"
                    emptyHint="No saved solo scores yet - this fills in after solo games are tracked."
                  />
                </>
              ) : !loading && !loadError ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>No solo games saved yet</Text>
                  <Text style={styles.emptyText}>
                    Start a solo game from the Game Hub, then save it from the solo score screen to
                    populate this page.
                  </Text>
                </View>
              ) : null}
            </>
          )}
        </ScrollView>

        <ManageAccountModal
          visible={accountMenuVisible}
          title={manageAccountAlertCopy.title}
          message={manageAccountAlertCopy.message}
          actions={accountMenuActions}
          onRequestClose={() => setAccountMenuVisible(false)}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  pageBackground: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  pageScrim: {
    flex: 1,
    backgroundColor: 'rgba(6, 10, 24, 0.36)',
  },

  container: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },

  card: {
    backgroundColor: playerStatsSurface.panel,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginBottom: 12,
    ...theme.shadow.card,
  },

  statGridCard: {
    backgroundColor: playerStatsSurface.panel,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginBottom: 12,
    ...theme.shadow.card,
  },

  kicker: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },

  cardTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 12,
  },

  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: -2,
    marginBottom: 8,
  },

  noteBadge: {
    color: '#FFF3D7',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    backgroundColor: 'rgba(182, 126, 32, 0.24)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 133, 0.28)',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  noteText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    flex: 1,
    minWidth: 180,
  },

  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  statTile: {
    width: '47%',
    backgroundColor: playerStatsSurface.panelRaised,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
  },

  statTileLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 5,
  },

  statTileValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 4,
  },

  statTileHelper: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },

  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },

  listRowStacked: {
    alignItems: 'flex-start',
    flexDirection: 'column',
    gap: 8,
  },

  matchupPressable: {
    paddingVertical: 12,
  },

  listCopy: {
    flex: 1,
    minWidth: 0,
  },

  listTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },

  listSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 3,
  },

  listValueGroup: {
    alignItems: 'flex-end',
    minWidth: 88,
  },

  listValueGroupStacked: {
    alignItems: 'flex-start',
    alignSelf: 'stretch',
    minWidth: 0,
  },

  listValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'right',
  },

  listValueStacked: {
    textAlign: 'left',
  },

  listValueMeta: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },

  insightFooter: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 12,
  },

  matchupSection: {
    marginTop: 4,
  },

  matchupSectionTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 4,
  },

  matchupRowShell: {
    overflow: 'hidden',
  },

  matchupExpansion: {
    paddingBottom: 12,
  },

  matchupMetricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },

  matchupMetricTile: {
    minWidth: 100,
    backgroundColor: playerStatsSurface.panelRaised,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },

  matchupMetricLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },

  matchupMetricValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },

  matchupDetailBlock: {
    marginTop: 10,
  },

  matchupDetailLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 4,
  },

  matchupDetailText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 2,
  },

  emptyText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },

  emptyCard: {
    backgroundColor: playerStatsSurface.panel,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    ...theme.shadow.card,
  },

  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 6,
  },

  accessCard: {
    backgroundColor: playerStatsSurface.panel,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    ...theme.shadow.card,
  },

  accessTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 6,
  },

  accessText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginBottom: 12,
  },

  accessButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },

  accessButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },

  errorCard: {
    backgroundColor: 'rgba(92, 24, 38, 0.94)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,126,138,0.44)',
    padding: 14,
    marginBottom: 12,
  },

  errorTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 6,
  },

  errorText: {
    color: '#FFD8DC',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginBottom: 12,
  },

  retryButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },

  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },

  noticeCard: {
    backgroundColor: 'rgba(20, 28, 52, 0.94)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 133, 0.2)',
    padding: 12,
    marginBottom: 12,
  },

  noticeTitle: {
    color: '#FFF3D7',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },

  noticeText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },

  buttonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
})
