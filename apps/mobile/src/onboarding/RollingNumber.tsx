import { useEffect, useRef } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated'
import { fonts } from '../theme/tokens'

// A port of the web's rolling counter (lanatools/apps/web/src/components/ui/
// animated-counter.tsx): each digit is a wheel of faces that springs to its
// value. The wheel holds two turns of faces, so the first roll spins a full
// turn before it lands, and later changes move a face or two.

const FACES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
// The web's bounce of 0.18, as a damping ratio.
const FIRST = { duration: 1100, dampingRatio: 0.72 }
const AFTER = { duration: 420, dampingRatio: 0.8 }

function Wheel({
  digit,
  play,
  delay,
  line,
  textStyle,
}: {
  digit: number
  play: boolean
  delay: number
  line: number
  textStyle: object
}) {
  const reduced = useReducedMotion()
  const y = useSharedValue(0)
  const rolled = useRef(false)

  useEffect(() => {
    if (!play) return
    const target = -(digit + 10) * line
    if (reduced) {
      y.set(target)
    } else if (!rolled.current) {
      y.set(
        withDelay(
          delay,
          withSpring(target, { ...FIRST, reduceMotion: ReduceMotion.System }),
        ),
      )
    } else {
      y.set(withSpring(target, { ...AFTER, reduceMotion: ReduceMotion.System }))
    }
    rolled.current = true
  }, [digit, play, delay, line, reduced, y])

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.get() }],
  }))

  return (
    <View style={{ height: line, overflow: 'hidden' }}>
      <Animated.View style={style}>
        {FACES.map((face, index) => (
          <Text
            key={index}
            style={[textStyle, { height: line, lineHeight: line }]}
            maxFontSizeMultiplier={1}
          >
            {face}
          </Text>
        ))}
      </Animated.View>
    </View>
  )
}

/**
 * A figure whose digits roll into place, odometer style, once `play` turns
 * on, and roll again whenever `value` changes. Other characters ($ , .)
 * stay put. Digits are keyed from the right, so units keep their wheel when
 * the number grows a digit.
 */
export function RollingNumber({
  value,
  play,
  size = 32,
  color,
  weight = '600',
  delay = 0,
  stagger = 45,
}: {
  value: string
  play: boolean
  size?: number
  color: string
  weight?: '500' | '600' | '700'
  delay?: number
  stagger?: number
}) {
  const line = Math.round(size * 1.2)
  const textStyle = {
    fontFamily: fonts.mono,
    fontWeight: weight,
    fontSize: size,
    letterSpacing: size * -0.03,
    color,
    textAlign: 'center' as const,
    fontVariant: ['tabular-nums' as const],
  }
  const chars = [...value]
  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="text"
      accessibilityLabel={value}
    >
      {chars.map((char, index) => {
        const key = chars.length - index
        if (char >= '0' && char <= '9')
          return (
            <Wheel
              key={key}
              digit={Number(char)}
              play={play}
              delay={delay + index * stagger}
              line={line}
              textStyle={textStyle}
            />
          )
        return (
          <Text
            key={key}
            style={[textStyle, { height: line, lineHeight: line }]}
            maxFontSizeMultiplier={1}
          >
            {char}
          </Text>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({ row: { flexDirection: 'row' } })
