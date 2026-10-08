import { useEffect, useState } from 'react'
import { Modal, Pressable, StyleSheet, View } from 'react-native'
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler'
import Animated, {
  Easing,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../theme/theme'
import { easeOut, radius } from '../theme/tokens'
import type { ReactNode } from 'react'
import type { LayoutChangeEvent } from 'react-native'

const OPEN = {
  duration: 280,
  easing: Easing.bezier(...easeOut),
  reduceMotion: ReduceMotion.System,
}
const CLOSE = { ...OPEN, duration: 200 }

/**
 * A bottom sheet over a scrim. It rises on the dashboard's ease-out, closes
 * on the scrim, the back gesture, or a downward drag past a third of its
 * height or with a quick flick.
 */
export function Sheet({
  open,
  onClose,
  children,
  label,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  /** Read by screen readers when the sheet opens. */
  label: string
}) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  // Stays mounted through the closing animation.
  const [mounted, setMounted] = useState(open)
  if (open && !mounted) setMounted(true)
  const [height, setHeight] = useState(0)
  const offset = useSharedValue(1)
  const drag = useSharedValue(0)

  useEffect(() => {
    if (open) {
      drag.set(0)
      offset.set(withTiming(0, OPEN))
    } else {
      offset.set(
        withTiming(1, CLOSE, (done) => {
          if (done) runOnJS(setMounted)(false)
        }),
      )
    }
  }, [open, offset, drag])

  const pan = Gesture.Pan()
    .activeOffsetY(8)
    .onUpdate((event) => {
      drag.set(Math.max(0, event.translationY))
    })
    .onEnd((event) => {
      if (drag.get() > height / 3 || event.velocityY > 900) runOnJS(onClose)()
      else drag.set(withTiming(0, OPEN))
    })

  const panel = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.get() * (height || 600) + drag.get() }],
  }))
  const scrim = useAnimatedStyle(() => ({ opacity: 1 - offset.get() }))

  const onLayout = (event: LayoutChangeEvent) =>
    setHeight(event.nativeEvent.layout.height)

  return (
    <Modal
      visible={mounted}
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      animationType="none"
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={styles.fill}>
        <Animated.View
          style={[styles.fill, { backgroundColor: colors.scrim }, scrim]}
        >
          <Pressable
            style={styles.fill}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
          />
        </Animated.View>
        <GestureDetector gesture={pan}>
          <Animated.View
            onLayout={onLayout}
            accessibilityViewIsModal
            accessibilityLabel={label}
            style={[
              styles.panel,
              {
                backgroundColor: colors.panel,
                borderColor: colors.line,
                paddingBottom: insets.bottom + 16,
              },
              panel,
            ]}
          >
            <View style={styles.grip}>
              <View
                style={[styles.handle, { backgroundColor: colors.line2 }]}
              />
            </View>
            {children}
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  fill: StyleSheet.absoluteFill,
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: radius.frame + 4,
    borderTopRightRadius: radius.frame + 4,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: 'hidden',
  },
  grip: { alignItems: 'center', paddingTop: 10, paddingBottom: 4 },
  handle: { width: 36, height: 4, borderRadius: 2 },
})
