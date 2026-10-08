import { useState } from 'react'
import { Pressable } from 'react-native'
import Animated from 'react-native-reanimated'
import { CSS_EASE_OUT, PRESS_MS } from '../theme/motion'
import type { ReactNode } from 'react'
import type { PressableProps, StyleProp, ViewStyle } from 'react-native'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

/**
 * A pressable that answers the moment a finger lands: it settles to 97%
 * on press-in and back on release, on a CSS transition off the JS thread.
 * `scale` takes the label and icons with it, which is what reads as physical.
 */
export function PressableScale({
  children,
  style,
  pressedStyle,
  disabled,
  ...props
}: Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode
  style?: StyleProp<ViewStyle>
  /** Extra style while pressed, such as a darker border. */
  pressedStyle?: StyleProp<ViewStyle>
}) {
  const [pressed, setPressed] = useState(false)
  const active = pressed && !disabled
  return (
    <AnimatedPressable
      {...props}
      disabled={disabled}
      onPressIn={(event) => {
        setPressed(true)
        props.onPressIn?.(event)
      }}
      onPressOut={(event) => {
        setPressed(false)
        props.onPressOut?.(event)
      }}
      pressRetentionOffset={16}
      style={[
        {
          transform: [{ scale: active ? 0.97 : 1 }],
          transitionProperty: ['transform', 'backgroundColor', 'borderColor'],
          transitionDuration: PRESS_MS,
          transitionTimingFunction: CSS_EASE_OUT,
        },
        style,
        active && pressedStyle,
      ]}
    >
      {children}
    </AnimatedPressable>
  )
}
