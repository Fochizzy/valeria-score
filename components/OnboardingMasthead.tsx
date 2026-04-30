import { Image, ImageBackground, StyleSheet, Text, View } from 'react-native'
import { theme } from '../constants/theme'

const logo = require('../assets/valeria_logo.png')
const backdrop = require('../assets/Citizen Backdrop.png')

type Props = {
  kicker: string
  title: string
  subtitle: string
}

export default function OnboardingMasthead({
  kicker,
  title,
  subtitle,
}: Props) {
  return (
    <View style={styles.wrap}>
      <ImageBackground
        source={backdrop}
        style={styles.hero}
        imageStyle={styles.heroImage}
        resizeMode="cover"
      >
        <View style={styles.scrim}>
          <View style={styles.logoFrame}>
            <Image source={logo} style={styles.logo} resizeMode="contain" />
          </View>

          <View style={styles.copyBlock}>
            <Text style={styles.kicker}>{kicker}</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
        </View>
      </ImageBackground>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 0,
    ...theme.shadow.glow,
  },

  hero: {
    minHeight: 268,
    borderRadius: theme.radius.xxl,
    overflow: 'hidden',
    backgroundColor: theme.colors.backgroundAlt,
  },

  heroImage: {
    opacity: 1,
  },

  scrim: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(10, 15, 30, 0.62)',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },

  logoFrame: {
    width: 176,
    height: 96,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    backgroundColor: 'rgba(25, 18, 43, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },

  logo: {
    width: 144,
    height: 76,
  },

  copyBlock: {
    alignItems: 'center',
  },

  kicker: {
    color: theme.colors.primaryLight,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom: 6,
  },

  title: {
    color: theme.colors.text,
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },

  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
    textAlign: 'center',
    maxWidth: 280,
  },
})
