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
              <View
                style={[
                  styles.imageWrap,
                  isSelected && styles.imageWrapSelected,
                ]}
              >
                {imageSource ? (
                  <Image
                    source={imageSource}
                    style={styles.image}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.imageFallback}>
                    <Text style={styles.imageFallbackTitle}>No Image</Text>
                  </View>
                )}
              </View>

              <View
                style={[
                  styles.nameStrip,
                  isSelected && styles.nameStripSelected,
                ]}
              >
                <Text
                  style={[styles.name, isSelected && styles.nameSelected]}
                  numberOfLines={2}
                >
                  {duke.name}
                </Text>
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
    marginTop: 2,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },

  card: {
    width: '47%',
    borderRadius: 14,
    overflow: 'visible',
    backgroundColor: 'transparent',
  },

  cardSelected: {
    transform: [{ scale: 1.06 }],
    zIndex: 10,
  },

  cardMuted: {
    opacity: 0.36,
  },

  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.97 }],
  },

  imageWrap: {
    width: '100%',
    aspectRatio: 0.72,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },

  imageWrapSelected: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
    borderBottomWidth: 0,
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.55,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },

  image: {
    width: '100%',
    height: '100%',
  },

  imageFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    backgroundColor: theme.colors.backgroundAlt ?? theme.colors.background,
  },

  imageFallbackTitle: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },

  nameStrip: {
    backgroundColor: 'rgba(25, 18, 43, 0.95)',
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: theme.colors.border,
    paddingHorizontal: 6,
    paddingVertical: 8,
    minHeight: 42,
    justifyContent: 'center',
  },

  nameStripSelected: {
    backgroundColor: 'rgba(123, 92, 255, 0.18)',
    borderColor: theme.colors.primary,
    borderWidth: 2,
    borderTopWidth: 0,
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.55,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },

  name: {
    color: theme.colors.text,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '800',
    textAlign: 'center',
  },

  nameSelected: {
    color: theme.colors.accent,
  },
})