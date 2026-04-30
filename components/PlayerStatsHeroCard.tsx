import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

import { playerStatsSurface } from '../constants/analyticsPageSurface'
import { theme } from '../constants/theme'
import type { PlayerStatsTimeWindow } from '../lib/player-stats-data'

type DukeSearchResult = {
  slug: string
  name: string
}

type PlayerStatsHeroCardProps = {
  query: string
  timeWindow: PlayerStatsTimeWindow
  dukeQuery: string
  activeDukeName: string | null
  dukeResults: DukeSearchResult[]
  onQueryChange: (value: string) => void
  onTimeWindowChange: (value: PlayerStatsTimeWindow) => void
  onDukeQueryChange: (value: string) => void
  onSubmitDukeSearch: () => void
  onApplyDukeFilter: (slug: string) => void
  onClearDukeFilter: () => void
}

export default function PlayerStatsHeroCard({
  query,
  timeWindow,
  dukeQuery,
  activeDukeName,
  dukeResults,
  onQueryChange,
  onTimeWindowChange,
  onDukeQueryChange,
  onSubmitDukeSearch,
  onApplyDukeFilter,
  onClearDukeFilter,
}: PlayerStatsHeroCardProps) {
  const hasDukeQuery = dukeQuery.trim().length > 0

  return (
    <View style={styles.heroCard}>
      <View style={styles.heroHeader}>
        <Text style={styles.heroTitle}>Search & Filter</Text>
      </View>

      <View style={styles.heroControls}>
        <TextInput
          value={query}
          onChangeText={onQueryChange}
          placeholder="Search player name or Player ID"
          placeholderTextColor={theme.colors.textMuted}
          style={styles.input}
          autoCapitalize="characters"
          autoCorrect={false}
        />

        <TextInput
          value={dukeQuery}
          onChangeText={onDukeQueryChange}
          onSubmitEditing={onSubmitDukeSearch}
          placeholder="Search duke to filter"
          placeholderTextColor={theme.colors.textMuted}
          style={styles.input}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="search"
        />

        {activeDukeName ? (
          <View style={styles.activeFilterCard}>
            <View style={styles.activeFilterCopy}>
              <Text style={styles.activeFilterLabel}>Active Duke Filter</Text>
              <Text style={styles.activeFilterValue}>{activeDukeName}</Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.clearFilterButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={onClearDukeFilter}
            >
              <Text style={styles.clearFilterText}>Clear</Text>
            </Pressable>
          </View>
        ) : hasDukeQuery ? (
          dukeResults.length === 0 ? (
            <Text style={styles.helperText}>No dukes match that search.</Text>
          ) : (
            <View style={styles.dukeResultsWrap}>
              {dukeResults.map((duke) => (
                <Pressable
                  key={duke.slug}
                  style={({ pressed }) => [
                    styles.dukeResultChip,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => onApplyDukeFilter(duke.slug)}
                >
                  <Text style={styles.dukeResultChipText}>{duke.name}</Text>
                </Pressable>
              ))}
            </View>
          )
        ) : null}

        <View style={styles.filterRow}>
          <Pressable
            style={({ pressed }) => [
              styles.filterButton,
              timeWindow === 'all' && styles.filterButtonActive,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => onTimeWindowChange('all')}
          >
            <Text
              style={[
                styles.filterButtonText,
                timeWindow === 'all' && styles.filterButtonTextActive,
              ]}
            >
              All Time
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.filterButton,
              timeWindow === '30d' && styles.filterButtonActive,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => onTimeWindowChange('30d')}
          >
            <Text
              style={[
                styles.filterButtonText,
                timeWindow === '30d' && styles.filterButtonTextActive,
              ]}
            >
              30 Days
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: playerStatsSurface.panelAlt,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 12,
    ...theme.shadow.card,
  },

  heroHeader: {
    padding: 14,
  },

  heroTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
  },

  heroControls: {
    padding: 14,
    paddingTop: 0,
  },

  input: {
    backgroundColor: playerStatsSurface.inset,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },

  helperText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    marginBottom: 10,
  },

  dukeResultsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },

  dukeResultChip: {
    backgroundColor: playerStatsSurface.panelRaised,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  dukeResultChipText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '800',
  },

  activeFilterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: playerStatsSurface.panelRaised,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginBottom: 10,
  },

  activeFilterCopy: {
    flex: 1,
    minWidth: 0,
  },

  activeFilterLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },

  activeFilterValue: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '900',
  },

  clearFilterButton: {
    backgroundColor: playerStatsSurface.inset,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  clearFilterText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '900',
  },

  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },

  filterButton: {
    flex: 1,
    backgroundColor: playerStatsSurface.panelRaised,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 10,
    alignItems: 'center',
  },

  filterButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.borderAccent ?? theme.colors.accent,
  },

  filterButtonText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '800',
  },

  filterButtonTextActive: {
    color: theme.colors.text,
  },

  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
})
