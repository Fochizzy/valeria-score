import { Image, StyleSheet, Text, View } from 'react-native'
import { type Href } from 'expo-router'
import { theme } from '../constants/theme'

const logo = require('../assets/valeria_logo.png')

type RightButtonVariant = 'default' | 'tall'

// Back-compat prop bag — most pages still pass these. The top nav now renders
// the back arrow and the manage-account pill, so we silently ignore them.
type Props = {
  title?: string
  subtitle?: string
  showBack?: boolean
  onBackPress?: () => void
  backDisabled?: boolean
  backFallbackHref?: Href
  compact?: boolean
  showLogo?: boolean
  rightLabel?: string
  onRightPress?: () => void
  rightDisabled?: boolean
  rightLabelLines?: number
  rightSlotWidth?: number
  rightButtonVariant?: RightButtonVariant
}

export default function ValeriaHeader({
  title,
  subtitle,
  compact = false,
  showLogo,
  // The remaining props are accepted but unused — see comment above.
  showBack: _showBack,
  onBackPress: _onBackPress,
  backDisabled: _backDisabled,
  backFallbackHref: _backFallbackHref,
  rightLabel: _rightLabel,
  onRightPress: _onRightPress,
  rightDisabled: _rightDisabled,
  rightLabelLines: _rightLabelLines,
  rightSlotWidth: _rightSlotWidth,
  rightButtonVariant: _rightButtonVariant,
}: Props) {
  void _showBack
  void _onBackPress
  void _backDisabled
  void _backFallbackHref
  void _rightLabel
  void _onRightPress
  void _rightDisabled
  void _rightLabelLines
  void _rightSlotWidth
  void _rightButtonVariant

  const shouldShowLogo = showLogo ?? !compact

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      {shouldShowLogo ? (
        <View style={styles.logoWrap}>
          <Image
            source={logo}
            style={[styles.logo, compact && styles.logoCompact]}
            resizeMode="contain"
          />
        </View>
      ) : null}

      {title || subtitle ? (
        <View style={styles.copyWrap}>
          {title ? (
            <Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text>
          ) : null}
          {subtitle ? (
            <Text style={[styles.subtitle, compact && styles.subtitleCompact]}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: theme.spacing.md,
  },

  wrapCompact: {
    marginBottom: theme.spacing.sm,
  },

  logoWrap: {
    alignSelf: 'center',
    marginBottom: 8,
  },

  logo: {
    width: 200,
    height: 60,
  },

  logoCompact: {
    width: 140,
    height: 40,
  },

  copyWrap: {
    paddingHorizontal: 4,
  },

  title: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 2,
  },

  titleCompact: {
    fontSize: 22,
  },

  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },

  subtitleCompact: {
    fontSize: 12,
  },
})
