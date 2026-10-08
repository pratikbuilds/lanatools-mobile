import { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import Svg, { Path, Rect } from 'react-native-svg'
import { brand, easeOut } from '../theme/tokens'

// "Open port": the MCP connection your agents plug into, and a prompt with a
// live cursor for the agent at work. Paths from lanatools brand.tsx.
export const PORT =
  'M16 56h-4q-4 0-4-4V15q0-7 7-7h23l19 12.5V29L37 16H19.5q-3.5 0-3.5 3.5Z'
export const PROMPT = 'M23 26l8 7-8 7'

const EASE = Easing.bezier(...easeOut)

/**
 * The LanaTools mark. With `animate`, it draws in as on the landing page: the
 * port settles, the prompt slides in, the lime caret extends and then blinks.
 */
export function BrandMark({
  size = 28,
  color,
  animate = false,
}: {
  size?: number
  color: string
  animate?: boolean
}) {
  const reduced = useReducedMotion()
  const moving = animate && !reduced
  const port = useSharedValue(moving ? 0 : 1)
  const prompt = useSharedValue(moving ? 0 : 1)
  const caret = useSharedValue(moving ? 0 : 1)
  const blink = useSharedValue(1)

  useEffect(() => {
    if (!moving) return
    const timing = (ms: number) => ({
      duration: ms,
      easing: EASE,
      reduceMotion: ReduceMotion.System,
    })
    port.value = withTiming(1, timing(500))
    prompt.value = withDelay(300, withTiming(1, timing(450)))
    caret.value = withDelay(600, withTiming(1, timing(400)))
    // caret-blink: 1.1s steps(1), from 1.4s.
    blink.value = withDelay(
      1400,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 550 }),
          withTiming(0, { duration: 0 }),
          withTiming(0, { duration: 550 }),
          withTiming(1, { duration: 0 }),
        ),
        -1,
      ),
    )
  }, [moving, port, prompt, caret, blink])

  const unit = size / 64
  const portStyle = useAnimatedStyle(() => ({
    opacity: port.value,
    transform: [{ scale: 0.85 + 0.15 * port.value }],
  }))
  const promptStyle = useAnimatedStyle(() => ({
    opacity: prompt.value,
    transform: [{ translateX: -8 * unit * (1 - prompt.value) }],
  }))
  const caretStyle = useAnimatedStyle(() => ({
    opacity: blink.value,
    transform: [{ scaleX: caret.value }],
  }))

  return (
    <View
      style={{ width: size, height: size }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { transformOrigin: [12 * unit, 56 * unit, 0] },
          portStyle,
        ]}
      >
        <Svg width={size} height={size} viewBox="0 0 64 64">
          <Path d={PORT} fill={color} />
        </Svg>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, promptStyle]}>
        <Svg width={size} height={size} viewBox="0 0 64 64">
          <Path
            d={PROMPT}
            fill="none"
            stroke={color}
            strokeWidth={4.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Animated.View>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { transformOrigin: [35 * unit, 43.5 * unit, 0] },
          caretStyle,
        ]}
      >
        <Svg width={size} height={size} viewBox="0 0 64 64">
          <Rect
            x={35}
            y={41}
            width={15}
            height={5}
            rx={2.5}
            fill={brand.lime}
          />
        </Svg>
      </Animated.View>
    </View>
  )
}
