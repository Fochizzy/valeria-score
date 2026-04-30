import React from 'react'
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { cardImages } from '../data/cardImages'
import { theme } from '../constants/theme'

type DukeOption = {
  slug: string
  name: string
}

type DukePickerProps = {
  dukes: DukeOption[]
  selectedSlug: string | null
  onSelect: (slug: string) => void
}

export default function DukePicker({
  dukes,
  selectedSlug,
  onSelect,
}: DukePickerProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.grid}>
        {dukes.map((duke) => {
          const isSelected = selectedSlug === duke.slug
          const imageSource = cardImages[duke.slug]

          return (
            <Pressable
              key={duke.slug}
              onPress={() => onSelect(duke.slug)}
              style={({ pressed }) => [
                styles.card,
                isSelected && styles.cardSelected,
                selectedSlug && !isSelected && styles.cardMuted,
                pressed && styles.cardPressed,
              ]}
            >
              <View style={styles.imageWrap}>
                {imageSource ? (
                  <Image
                    source={imageSource}
                    style={styles.image}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.imageFallback}>
                    <Text style={styles.imageFallbackTitle}>No Image</Text>
                    <Text style={styles.imageFallbackText} numberOfLines={2}>
                      {duke.name}
                    </Text>
                  </View>
                )}

                <View style={styles.scrim} />

                <View style={styles.textWrap}>
                  <Text style={styles.name} numberOfLines={2}>
                    {duke.name}
                  </Text>
                </View>

                {isSelected ? (
                  <View style={styles.selectedBadge}>
                    <Text style={styles.selectedBadgeText}>Selected</Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: theme.spacing.sm,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },

  card: {
    width: '48%',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 2,
    backgroundColor: 'transparent',
  },

  cardSelected: {
    transform: [{ scale: 1.02 }],
    ...theme.shadow.glow,
  },

  cardMuted: {
    opacity: 0.36,
  },

  cardPressed: {
    opacity: 0.96,
    transform: [{ scale: 0.99 }],
  },

  imageWrap: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  image: {
    width: '100%',
    height: '100%',
  },

  imageFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    backgroundColor: theme.colors.backgroundAlt ?? theme.colors.background,
  },

  imageFallbackTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 6,
    textAlign: 'center',
  },

  imageFallbackText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },

  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '46%',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },

  textWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },

  name: {
    color: '#FFF',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '900',
    textAlign: 'center',
    minHeight: 36,
  },

  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(139,92,246,0.92)',
    borderWidth: 1,
    borderColor: '#E6DAFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
  },

  selectedBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
})