import { StyleSheet, View } from 'react-native'
import Animated, { css, useReducedMotion } from 'react-native-reanimated'
import Svg, { Path, Rect } from 'react-native-svg'
import { CSS_EASE_OUT } from '../theme/motion'
import { brand } from '../theme/tokens'
import type { CSSKeyframesRule } from 'react-native-reanimated'
import type { ReactNode } from 'react'
import type { ViewStyle } from 'react-native'

// "Open port": the MCP connection your agents plug into, and a prompt with a
// live cursor for the agent at work. Paths from lanatools brand.tsx.
export const PORT =
  'M16 56h-4q-4 0-4-4V15q0-7 7-7h23l19 12.5V29L37 16H19.5q-3.5 0-3.5 3.5Z'
export const PROMPT = 'M23 26l8 7-8 7'

// The landing page's draw-in, as CSS keyframes that run on the UI thread.
// The caret grows from a sliver, never from nothing.
const PORT_IN = css.keyframes({
  from: { opacity: 0, transform: [{ scale: 0.85 }] },
  to: { opacity: 1, transform: [{ scale: 1 }] },
})
const CARET_IN = css.keyframes({
  from: { opacity: 0, transform: [{ scaleX: 0.3 }] },
  to: { opacity: 1, transform: [{ scaleX: 1 }] },
})
// caret-blink: on for half of 1.1s, off for the other half, no fade.
const BLINK = css.keyframes({
  '0%': { opacity: 1 },
  '49.9%': { opacity: 1 },
  '50%': { opacity: 0 },
  '100%': { opacity: 0 },
})
// The prompt slides in from 8 of the mark's 64 units to the left.
const PROMPT_IN = css.keyframes({
  from: { opacity: 0, transform: [{ translateX: '-12.5%' }] },
  to: { opacity: 1, transform: [{ translateX: 0 }] },
})

/**
 * The LanaTools mark. With `animate`, it draws in once as on the landing page
 * (the port settles, the prompt slides in, the lime caret extends) and the
 * caret then blinks. Reduced motion shows the finished mark, still.
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
  const unit = size / 64
  return (
    <View
      style={{ width: size, height: size }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Layer
        moving={moving}
        keyframes={PORT_IN}
        duration={500}
        delay={0}
        origin={{ transformOrigin: [12 * unit, 56 * unit, 0] }}
      >
        <Svg width={size} height={size} viewBox="0 0 64 64">
          <Path d={PORT} fill={color} />
        </Svg>
      </Layer>
      <Layer moving={moving} keyframes={PROMPT_IN} duration={450} delay={300}>
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
      </Layer>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          moving && {
            animationName: BLINK,
            animationDuration: 1100,
            animationDelay: 1400,
            animationIterationCount: 'infinite',
            animationTimingFunction: 'linear',
          },
        ]}
      >
        <Layer
          moving={moving}
          keyframes={CARET_IN}
          duration={400}
          delay={600}
          origin={{ transformOrigin: [35 * unit, 43.5 * unit, 0] }}
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
        </Layer>
      </Animated.View>
    </View>
  )
}

/** One part of the mark, drawing in once on mount when `moving`. */
function Layer({
  moving,
  keyframes,
  duration,
  delay,
  origin,
  children,
}: {
  moving: boolean
  keyframes: CSSKeyframesRule
  duration: number
  delay: number
  origin?: ViewStyle
  children: ReactNode
}) {
  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        origin,
        moving && {
          animationName: keyframes,
          animationDuration: duration,
          animationDelay: delay,
          animationTimingFunction: CSS_EASE_OUT,
          animationFillMode: 'both',
        },
      ]}
    >
      {children}
    </Animated.View>
  )
}
