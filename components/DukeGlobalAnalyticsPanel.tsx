import { StyleSheet, Text, View } from 'react-native'

import DukeAnalyticsStatMarker from './DukeAnalyticsStatMarker'
import { theme } from '../constants/theme'
import {
  buildInputBreakdownSections,
  type DukeInputProfileRow,
  type GlobalGameMarginRow,
} from '../lib/duke-input-analytics'
import { buildAcrossGamesInsights } from '../lib/duke-panel-insights'

type DukeGlobalAnalyticsPanelProps = {
  rows: DukeInputProfileRow[]
  marginRows: GlobalGameMarginRow[]
  error?: string
  // When a duke is selected on the parent screen we use that name in the
  // panel header so the "Across Games" tab feels scoped to the user's pick
  // even though the data behind it is currently global.
  selectedDukeName?: string | null
}

function renderMetricLine(row: DukeInputProfileRow) {
  return `Input ${row.avg_input.toFixed(1)} · Points ${row.avg_points_generated.toFixed(1)} · Share ${row.points_share.toFixed(1)}%`
}

function FamilyGrid({
  rows,
  emptyText,
}: {
  rows: ReturnType<typeof buildInputBreakdownSections>['familyRows']
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
          <Text style={styles.familyMeta} numberOfLines={1}>
            {row.avg_points_generated.toFixed(1)} avg pts
          </Text>
        </View>
      ))}
    </View>
  )
}

function MetricRows({
  rows,
  emptyText,
}: {
  rows: DukeInputProfileRow[]
  emptyText: string
}) {
  if (rows.length === 0) {
    return <Text style={styles.emptyText}>{emptyText}</Text>
  }

  return (
    <View style={styles.rowsWrap}>
      {rows.map((row) => (
        <View key={`${row.profile_scope}-${row.stat_key}`} style={styles.metricRow}>
          <View style={styles.metricHeader}>
            <DukeAnalyticsStatMarker statKey={row.stat_key} fallbackLabel={row.label} />
            <Text style={styles.metricShare}>{row.points_share.toFixed(1)}%</Text>
          </View>
          <Text style={styles.metricMeta}>{renderMetricLine(row)}</Text>
        </View>
      ))}
    </View>
  )
}

function MarginGrid({ rows }: { rows: GlobalGameMarginRow[] }) {
  if (rows.length === 0) {
    return <Text style={styles.emptyText}>No close-game margin data yet.</Text>
  }

  return (
    <View style={styles.familyGrid}>
      {rows.map((row) => (
        <View key={row.margin_bucket} style={styles.familyCard}>
          <Text style={styles.familyLabel}>{row.label}</Text>
          <Text style={styles.familyValue}>{row.share_percentage.toFixed(1)}%</Text>
          <Text style={styles.familyMeta}>
            {row.tables_with_margin} of {row.tables_sample} tables
          </Text>
        </View>
      ))}
    </View>
  )
}

export default function DukeGlobalAnalyticsPanel({
  rows,
  marginRows,
  error = '',
  selectedDukeName,
}: DukeGlobalAnalyticsPanelProps) {
  const sections = buildInputBreakdownSections(rows)
  const resourceShare = Number(
    sections.resourceRows.reduce((sum, row) => sum + row.points_share, 0).toFixed(1)
  )
  const monsterFamily = sections.familyRows.find((row) => row.family_key === 'monsters')
  const domainFamily = sections.familyRows.find((row) => row.family_key === 'domains')

  return (
    <View style={styles.panel}>
      <Text style={styles.kicker}>
        {selectedDukeName ? 'Selected Duke' : 'Global Data'}
      </Text>
      <Text style={styles.title}>
        {selectedDukeName
          ? `${selectedDukeName} Across Games`
          : 'Score Mix Across Tracked Games'}
      </Text>
      <Text style={styles.subtitle}>
        {selectedDukeName
          ? `How ${selectedDukeName} compares to global scoring patterns.`
          : 'See how final scores split across families, symbol groups, and close finishes.'}
      </Text>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {(() => {
        const insightCards = buildAcrossGamesInsights({
          familyRows: sections.familyRows,
          marginRows,
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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Share of Final Score by Family</Text>
        <FamilyGrid rows={sections.familyRows} emptyText="No global score mix data yet." />
      </View>

      <View style={styles.section}>
        <View style={styles.symbolTitleRow}>
          <DukeAnalyticsStatMarker statKey="gold" fallbackLabel="Gold" />
          <DukeAnalyticsStatMarker statKey="magic" fallbackLabel="Mana" />
          <DukeAnalyticsStatMarker statKey="fight" fallbackLabel="Fight" />
          <DukeAnalyticsStatMarker statKey="key" fallbackLabel="Key" />
        </View>
        <Text style={styles.sectionLead}>
          These symbols account for {resourceShare.toFixed(1)}% of final score overall.
        </Text>
        <MetricRows
          rows={sections.resourceRows}
          emptyText="No symbol data yet."
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Monster-Related Inputs and Scoring</Text>
        <Text style={styles.sectionLead}>
          Monster scoring contributes {monsterFamily?.points_share.toFixed(1) ?? '0.0'}% of total
          score across tracked tables.
        </Text>
        <MetricRows rows={sections.monsterRows} emptyText="No monster scoring data yet." />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Domain Counts and Domain Points</Text>
        <Text style={styles.sectionLead}>
          Domain scoring contributes {domainFamily?.points_share.toFixed(1) ?? '0.0'}% of total
          score across tracked tables.
        </Text>
        <MetricRows rows={sections.domainRows} emptyText="No domain scoring data yet." />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Close Games</Text>
        <MarginGrid rows={marginRows} />
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
    marginTop: 10,
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

  errorText: {
    color: theme.colors.error,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 10,
    lineHeight: 18,
  },

  section: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginTop: 10,
  },

  sectionTitle: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 8,
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

  familyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  familyCard: {
    width: '48.5%',
    backgroundColor: theme.colors.backgroundAlt,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 10,
    marginBottom: 8,
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

  rowsWrap: {
    gap: 8,
  },

  metricRow: {
    backgroundColor: theme.colors.backgroundAlt,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 10,
  },

  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },

  metricShare: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: '900',
  },

  metricMeta: {
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
})
