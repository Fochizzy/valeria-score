import { useEffect, useMemo, useRef } from 'react'
import { Animated, Easing, StyleSheet, View } from 'react-native'
import {
  createVictoryFireworkBursts,
  type VictoryFireworkBurst,
} from '../lib/victory-fireworks'

const PARTICLE_VECTORS = [
  { dx: 0, dy: -42 },
  { dx: 30, dy: -26 },
  { dx: 38, dy: 6 },
  { dx: 18, dy: 30 },
  { dx: -18, dy: 30 },
  { dx: -38, dy: 6 },
  { dx: -30, dy: -26 },
]

function FireworkBurst({
  burst,
  progress,
}: {
  burst: VictoryFireworkBurst
  progress: Animated.Value
}) {
  const ringScale = progress.interpolate({
    inputRange: [0, 0.25, 1],
    outputRange: [0.2, 0.95, 1.45],
  })
  const ringOpacity = progress.interpolate({
    inputRange: [0, 0.15, 0.75, 1],
    outputRange: [0, 0.9, 0.25, 0],
  })
  const particleOpacity = progress.interpolate({
    inputRange: [0, 0.1, 0.75, 1],
    outputRange: [0, 1, 0.35, 0],
  })

  return (
    <View style={[styles.burstWrap, { top: burst.top, left: burst.left }]}>
      <Animated.View
        style={[
          styles.ring,
          {
            borderColor: burst.color,
            opacity: ringOpacity,
            transform: [{ scale: ringScale }],
          },
        ]}
      />

      {PARTICLE_VECTORS.map((vector, index) => {
        const translateX = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, vector.dx],
        })
        const translateY = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, vector.dy],
        })
        const scale = progress.interpolate({
          inputRange: [0, 0.2, 1],
          outputRange: [0.35, 1, 0.65],
        })

        return (
          <Animated.View
            key={`${burst.key}-${index}`}
            style={[
              styles.particle,
              {
                backgroundColor: burst.color,
                opacity: particleOpacity,
                transform: [{ translateX }, { translateY }, { scale }],
              },
            ]}
          />
        )
      })}
    </View>
  )
}

export default function VictoryFireworks() {
  const bursts = useMemo(() => createVictoryFireworkBursts(), [])
  const progressValues = useRef(
    bursts.map(() => new Animated.Value(0))
  ).current

  useEffect(() => {
    const animations = progressValues.map((value, index) =>
      Animated.sequence([
        Animated.delay(bursts[index]?.delayMs ?? 0),
        Animated.timing(value, {
          toValue: 1,
          duration: bursts[index]?.durationMs ?? 2200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ])
    )

    const animation = Animated.parallel(animations)
    animation.start()

    return () => {
      animation.stop()
      progressValues.forEach((value) => value.stopAnimation())
    }
  }, [bursts, progressValues])

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {bursts.map((burst, index) => (
        <FireworkBurst
          key={burst.key}
          burst={burst}
          progress={progressValues[index]}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  burstWrap: {
    position: 'absolute',
    width: 96,
    height: 96,
    marginLeft: -48,
    marginTop: -48,
    alignItems: 'center',
    justifyContent: 'center',
  },

  ring: {
    position: 'absolute',
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
  },

  particle: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 999,
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
})
