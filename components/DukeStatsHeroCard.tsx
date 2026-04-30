import { StyleSheet, Text, TextInput, View } from 'react-native'

import { theme } from '../constants/theme'

type DukeStatsHeroCardProps = {
  totalCount: number
  visibleCount: number
  search: string
  onSearchChange: (value: string) => void
  onSubmitSearch: () => void
}

export default function DukeStatsHeroCard({
  totalCount,
  visibleCount,
  search,
  onSearchChange,
  onSubmitSearch,
}: DukeStatsHeroCardProps) {
  const hasQuery = search.trim().length > 0

  return (
    <View style={styles.heroCard}>
      <View style={styles.topRow}>
        <TextInput
          value={search}
          onChangeText={onSearchChange}
          onSubmitEditing={onSubmitSearch}
          placeholder="Search duke"
          placeholderTextColor={theme.colors.textMuted}
          style={styles.searchInputInline}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />

        <View style={styles.countChip}>
          <Text style={styles.countValue}>{hasQuery ? visibleCount : totalCount}</Text>
          <Text style={styles.countLabel}>{hasQuery ? 'shown' : 'tracked'}</Text>
        </View>
      </View>

    </View>
  )
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginBottom: 12,
    ...theme.shadow.card,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  searchInputInline: {
    flex: 1,
    backgroundColor: theme.colors.backgroundAlt,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.text,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    fontWeight: '700',
  },

  countChip: {
    minWidth: 64,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },

  countValue: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 2,
  },

  countLabel: {
    color: theme.colors.textMuted,
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
})
