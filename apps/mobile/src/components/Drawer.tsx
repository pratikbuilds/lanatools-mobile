import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  BackHandler,
  Keyboard,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  interpolate,
  ReduceMotion,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'
import { useTheme } from '../theme/theme'
import type { ReactNode } from 'react'

// The conversations drawer: the screen slides right to reveal it, as in
// Evan Bacon's chat template (a fork of react-native-drawer-layout), with
// the motion rules of animate-expo: a spring that carries the finger's
// velocity, a flick is enough, nothing past the edges, and one haptic when
// a drag commits.

type DrawerState = { isOpen: boolean; open: () => void; close: () => void }
const DrawerContext = createContext<DrawerState | null>(null)

export function useDrawer() {
  const drawer = use(DrawerContext)
  if (!drawer) throw new Error('useDrawer needs a DrawerLayout')
  return drawer
}

// Called from the gesture worklet; a plain function, so the worklet does not
// try to copy React Native's Keyboard module onto the UI thread.
const dismissKeyboard = () => Keyboard.dismiss()

const EDGE = 28
const MIN_DISTANCE = 60
const MIN_VELOCITY = 500
// The sheet spring from animate-expo, clamped: a drawer does not overshoot
// its edge.
const SPRING = {
  duration: 300,
  dampingRatio: 1,
  overshootClamping: true,
  reduceMotion: ReduceMotion.System,
}

export function DrawerLayout({
  drawer,
  children,
}: {
  drawer: ReactNode
  children: ReactNode
}) {
  const { colors } = useTheme()
  const { width: screen } = useWindowDimensions()
  // Leave a strip of the conversation showing, so it reads as behind.
  const width = Math.min(screen - 64, 340)
  const [isOpen, setOpen] = useState(false)
  // Distance the screen has slid: 0 closed, `width` open.
  const x = useSharedValue(0)
  const start = useSharedValue(0)

  const settle = useCallback(
    (open: boolean, velocity = 0) => {
      x.set(withSpring(open ? width : 0, { ...SPRING, velocity }))
    },
    [width, x],
  )

  useEffect(() => {
    settle(isOpen)
    if (isOpen) Keyboard.dismiss()
  }, [isOpen, settle])

  // Back closes the drawer before it leaves the screen.
  useEffect(() => {
    if (!isOpen) return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setOpen(false)
      return true
    })
    return () => sub.remove()
  }, [isOpen])

  const commit = useCallback((open: boolean) => {
    setOpen(open)
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }, [])

  const pan = useMemo(() => {
    const gesture = Gesture.Pan()
      .activeOffsetX([-8, 8])
      .failOffsetY([-12, 12])
      .onStart(() => {
        start.set(x.get())
        scheduleOnRN(dismissKeyboard)
      })
      .onUpdate((event) => {
        x.set(Math.min(width, Math.max(0, start.get() + event.translationX)))
      })
      .onEnd((event) => {
        const moved = Math.abs(event.translationX)
        const flicked = Math.abs(event.velocityX) > MIN_VELOCITY
        const open =
          moved > MIN_DISTANCE || flicked
            ? (event.velocityX === 0 ? event.translationX : event.velocityX) > 0
            : start.get() > 0
        x.set(
          withSpring(open ? width : 0, {
            ...SPRING,
            velocity: event.velocityX,
          }),
        )
        scheduleOnRN(commit, open)
      })
    // Closed, a drag opens it only from the left edge; open, from anywhere.
    if (!isOpen) gesture.hitSlop({ left: 0, width: EDGE })
    return gesture
  }, [commit, isOpen, start, width, x])

  const screenStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }],
  }))
  const drawerStyle = useAnimatedStyle(() => {
    const progress = x.get() / width
    return {
      opacity: interpolate(progress, [0, 1], [0.6, 1]),
      transform: [
        { translateX: interpolate(progress, [0, 1], [-width * 0.15, 0]) },
      ],
    }
  })
  const scrimStyle = useAnimatedStyle(() => ({
    opacity: x.get() / width,
  }))
  const scrimProps = useAnimatedProps(() => ({
    pointerEvents: x.get() > 4 ? ('auto' as const) : ('none' as const),
  }))

  const state = useMemo(
    () => ({
      isOpen,
      open: () => setOpen(true),
      close: () => setOpen(false),
    }),
    [isOpen],
  )

  return (
    <DrawerContext value={state}>
      <GestureDetector gesture={pan}>
        <View style={[styles.fill, { backgroundColor: colors.panel }]}>
          <Animated.View
            style={[styles.drawer, { width }, drawerStyle]}
            accessibilityElementsHidden={!isOpen}
            importantForAccessibility={isOpen ? 'auto' : 'no-hide-descendants'}
          >
            {drawer}
          </Animated.View>
          <Animated.View
            style={[styles.fill, { backgroundColor: colors.bg }, screenStyle]}
          >
            <View
              style={styles.fill}
              accessibilityElementsHidden={isOpen}
              importantForAccessibility={
                isOpen ? 'no-hide-descendants' : 'auto'
              }
            >
              {children}
            </View>
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.scrim },
                scrimStyle,
              ]}
              animatedProps={scrimProps}
            >
              <Pressable
                style={styles.fill}
                onPress={() => setOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Close conversations"
              />
            </Animated.View>
          </Animated.View>
        </View>
      </GestureDetector>
    </DrawerContext>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  drawer: { position: 'absolute', top: 0, bottom: 0, left: 0 },
})
