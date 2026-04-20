import { Image, ScrollView, StyleSheet, Text, View } from 'react-native'
import { cards } from '../data/cards'
import { cardImages } from '../data/cardImages'
import { theme } from '../constants/theme'

const galleryCards = cards.filter((card) => card.slug !== 'duke_00' && card.slug !== '00_duke')

export default function GalleryScreen() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerCard}>
        <Text style={styles.title}>Duke Gallery</Text>
        <Text style={styles.subtitle}>
          Browse all duke cards in a clean gallery view.
        </Text>
      </View>

      <View style={styles.grid}>
        {galleryCards.map((card) => (
          <View key={card.slug} style={styles.card}>
            <View style={styles.imageWrap}>
              <Image
                source={cardImages[card.slug]}
                style={styles.image}
                resizeMode="cover"
              />
            </View>

            <Text numberOfLines={2} style={styles.name}>
              {card.name}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  content: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxxl ?? 40,
  },

  headerCard: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.xl ?? theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    ...theme.shadow.card,
  },

  title: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 8,
  },

  subtitle: {
    color: theme.colors.textMuted ?? '#B8A8D4',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '700',
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  card: {
    width: '48.5%',
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
    ...theme.shadow.card,
  },

  imageWrap: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    backgroundColor: theme.colors.backgroundAlt,
    marginBottom: theme.spacing.sm,
  },

  image: {
    width: '100%',
    height: '100%',
  },

  name: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    minHeight: 34,
  },
})