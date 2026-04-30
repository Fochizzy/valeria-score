import { Image, StyleSheet, Text, View } from 'react-native'

import { playerStatsSurface } from '../constants/analyticsPageSurface'
import { theme } from '../constants/theme'
import { cardImages } from '../data/cardImages'
import { formatDukeName } from '../lib/duke-names'
import type { TierBucket, TierEntry } from '../lib/global-trends'

type Props = {
  entries: TierEntry[]
}

const TIER_COLOR: Record<TierBucket, string> = {
  S: '#FFB347',
  A: '#C084FC',
  B: '#59B7FF',
  C: '#7A8696',
  Unranked: '#5B6378',
}

const TIER_DESCRIPTION: Record<TierBucket, string> = {
  S: 'Dominant — 50%+ win rate',
  A: 'Strong — 35–49%',
  B: 'Solid — 20–34%',
  C: 'Underperforming — under 20%',
  Unranked: 'Not enough games yet',
}

const TIER_ORDER: TierBucket[] = ['S', 'A', 'B', 'C', 'Unranked']

// Win-rate pill color band — green for ≥60%, neutral for 40–59%, red for <40%.
function winRatePillColors(winPct: number) {
  if (winPct >= 60) {
    return { background: 'rgba(82, 196, 110, 0.22)', border: 'rgba(82, 196, 110, 0.65)', text: '#7DE89D' }
  }
  if (winPct >= 40) {
    return { background: 'rgba(255, 255, 255, 0.08)', border: 'rgba(255, 255, 255, 0.18)', text: '#E6E2F4' }
  }
  return { background: 'rgba(255, 110, 120, 0.16)', border: 'rgba(255, 110, 120, 0.55)', text: '#FFB8BF' }
}

export default function TierListCard({ entries }: Props) {
  const grouped: Record<TierBucket, TierEntry[]> = {
    S: [],
    A: [],
    B: [],
    C: [],
    Unranked: [],
  }
  for (const entry of entries) {
    grouped[entry.tier].push(entry)
  }

  const populatedTiers = TIER_ORDER.filter((tier) => grouped[tier].length > 0)
  // When only one tier ends up with rows, the giant tier-label column wastes
  // ~25% of horizontal space — collapse it into a small chip above the list.
  const collapseTierLabel = populatedTiers.length === 1

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.kicker}>Tier List</Text>
        <Text style={styles.title}>Auto-Ranked by Win Rate</Text>
      </View>

      {entries.length === 0 ? (
        <Text style={styles.empty}>
          No locked games yet — the tier list builds itself once players finish tracked games.
        </Text>
      ) : null}

      {populatedTiers.map((tier) => {
        const items = grouped[tier]

        return (
          <View key={tier} style={styles.tierGroup}>
            {collapseTierLabel ? (
              <View style={styles.tierChipRow}>
                <View style={[styles.tierChip, { backgroundColor: TIER_COLOR[tier] }]}>
                  <Text style={styles.tierChipText}>{tier}</Text>
                </View>
                <Text style={styles.tierChipDescription}>{TIER_DESCRIPTION[tier]}</Text>
              </View>
            ) : (
              <View style={styles.tierHeaderRow}>
                <View style={[styles.tierPill, { backgroundColor: TIER_COLOR[tier] }]}>
                  <Text style={styles.tierPillText}>{tier}</Text>
                </View>
                <Text style={styles.tierDescription}>{TIER_DESCRIPTION[tier]}</Text>
              </View>
            )}

            <View style={styles.entriesColumn}>
              {items.map((entry) => {
                const pillColors = winRatePillColors(entry.win_percentage)
                const portrait = cardImages[entry.duke_slug]
                return (
                  <View key={entry.duke_slug} style={styles.entryRow}>
                    <View style={styles.entryThumbWrap}>
                      {portrait ? (
                        <Image
                          source={portrait}
                          style={styles.entryThumb}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[styles.entryThumb, styles.entryThumbFallback]}>
                          <Text style={styles.entryThumbFallbackText}>
                            {formatDukeName(entry.duke_slug).charAt(0)}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.entryBody}>
                      <Text style={styles.entryName} numberOfLines={1} ellipsizeMode="tail">
                        {formatDukeName(entry.duke_slug)}
                      </Text>
                      <Text style={styles.entryGames}>
                        {entry.games_played}g
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.winPill,
                        {
                          backgroundColor: pillColors.background,
                          borderColor: pillColors.border,
                        },
                      ]}
                    >
                      <Text style={[styles.winPillText, { color: pillColors.text }]}>
                        {entry.win_percentage.toFixed(0)}%
                      </Text>
                    </View>
                  </View>
                )
              })}
            </View>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: playerStatsSurface.panel,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginBottom: 12,
    ...theme.shadow.card,
  },

  header: { marginBottom: 12 },

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
    fontSize: 18,
    fontWeight: '900',
  },

  empty: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },

  tierGroup: {
    marginBottom: 14,
  },

  // Compact form — used when only one tier has rows.
  tierChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },

  tierChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },

  tierChipText: {
    color: '#1A1426',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  tierChipDescription: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flexShrink: 1,
  },

  // Standard form — used when multiple tiers have rows.
  tierHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },

  tierPill: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tierPillText: {
    color: '#1A1426',
    fontSize: 16,
    fontWeight: '900',
  },

  tierDescription: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flexShrink: 1,
  },

  entriesColumn: {
    gap: 6,
  },

  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: playerStatsSurface.panelAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
  },

  // Square thumb (rounded corners) so duke art is consistent with the
  // selected-duke card on the score screen.
  entryThumbWrap: {
    width: 44,
    height: 44,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },

  entryThumb: {
    width: '100%',
    height: '100%',
  },

  entryThumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.32)',
  },

  entryThumbFallbackText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
  },

  entryBody: {
    flex: 1,
    minWidth: 0,
  },

  entryName: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '900',
  },

  entryGames: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },

  winPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },

  winPillText: {
    fontSize: 12,
    fontWeight: '900',
  },
})
