import { useEffect, useState } from 'react'
import Animated, { useReducedMotion } from 'react-native-reanimated'
import { CSS_EASE_OUT } from '../theme/motion'
import type { ComponentProps, ReactNode } from 'react'

// The introduction's scenes play a short script once, the first time each
// one slides into view: a step counter driven by timers, and pieces that
// fade up when their step comes. Every piece keeps its space from the
// start, so nothing below it moves when it appears.

/** Shows a scene's script: step n arrives `times[n - 1]` ms after `play`. */
export function useTimeline(play: boolean, times: readonly number[]) {
  const reduced = useReducedMotion()
  const [step, setStep] = useState(0)
  useEffect(() => {
    if (!play || reduced) return
    const timers = times.map((at, index) =>
      setTimeout(() => setStep(index + 1), at),
    )
    return () => timers.forEach(clearTimeout)
    // The script is fixed for each scene; only `play` starts it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play, reduced])
  // Reduced motion shows every scene finished, and still.
  return reduced ? times.length : step
}

type ViewStyle = ComponentProps<typeof Animated.View>['style']

/**
 * A piece of a scene that rises 8dp and fades in when `shown`. A CSS
 * transition, so a step that comes early retargets instead of restarting.
 */
export function Reveal({
  shown,
  children,
  style,
  rise = 8,
}: {
  shown: boolean
  children: ReactNode
  style?: ViewStyle
  rise?: number
}) {
  return (
    <Animated.View
      style={[
        {
          opacity: shown ? 1 : 0,
          transform: [{ translateY: shown ? 0 : rise }],
          transitionProperty: ['opacity', 'transform'],
          transitionDuration: 360,
          transitionTimingFunction: CSS_EASE_OUT,
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  )
}
