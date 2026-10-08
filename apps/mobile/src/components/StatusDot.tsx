import { StyleSheet, View } from 'react-native'
import Animated, { css, useReducedMotion } from 'react-native-reanimated'
import { useTheme } from '../theme/theme'

export type DotState = 'live' | 'done' | 'warn' | 'bad' | 'idle'

// `.d-status` live: a glow ring that opens from 3px to 6px and fades,
// every two seconds. A loop with no state, so a CSS animation.
const PULSE = css.keyframes({
  from: { opacity: 1, transform: [{ scale: 1 }] },
  to: { opacity: 0, transform: [{ scale: 19 / 13 }] },
})

/** The dashboard's 7px status dot. Live pulses; reduced motion holds it. */
export function StatusDot({ state }: { state: DotState }) {
  const { colors } = useTheme()
  const reduced = useReducedMotion()
  const color = {
    live: colors.live,
    done: colors.text3,
    warn: colors.warn,
    bad: colors.bad,
    idle: colors.line2,
  }[state]
  return (
    <View style={styles.box}>
      {state === 'live' && (
        <Animated.View
          style={[
            styles.ring,
            { backgroundColor: colors.liveGlow },
            !reduced && {
              animationName: PULSE,
              animationDuration: 1000,
              animationIterationCount: 'infinite',
              animationDirection: 'alternate',
              animationTimingFunction: 'ease-in-out',
            },
          ]}
        />
      )}
      <View style={[styles.dot, { backgroundColor: color }]} />
    </View>
  )
}

const styles = StyleSheet.create({
  box: {
    width: 13,
    height: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  ring: { position: 'absolute', width: 13, height: 13, borderRadius: 6.5 },
})
