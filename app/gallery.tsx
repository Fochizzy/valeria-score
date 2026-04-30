import { Image, ScrollView, StyleSheet, Text, View } from 'react-native'
import { cards } from '../data/cards'
import { cardImages } from '../data/cardImages'
import { theme } from '../constants/theme'
import ValeriaHeader from '../components/ValeriaHeader'

const galleryCards = cards.filter(
  (card) => card.slug !== 'duke_00' && card.slug !== '00_duke'
)

export default function GalleryScreen() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 10, paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
    >
      <ValeriaHeader
        compact
        showBack
        title="Duke Gallery"
        subtitle="Browse all dukes"
      />

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

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 6,
  },

  card: {
    width: '48.5%',
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.lg,
    padding: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 10,
    ...theme.shadow.card,
  },

  imageWrap: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    backgroundColor: theme.colors.backgroundAlt,
    marginBottom: 6,
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
    minHeight: 32,
  },
})