import { useEffect, useState } from 'react'
import {
  BackHandler,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import Animated, {
  interpolate,
  scrollTo,
  useAnimatedScrollHandler,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets'
import { Button } from '../components/Button'
import { SideField } from '../brand/SideField'
import { PressableScale } from '../components/PressableScale'
import { Body, Label } from '../components/text'
import { useOnboarding } from '../onboarding/seen'
import { AskScene, ControlScene, WelcomeScene } from '../onboarding/scenes'
import { useTheme } from '../theme/theme'
import { fonts, radius } from '../theme/tokens'
import type { ComponentType } from 'react'
import type { SharedValue } from 'react-native-reanimated'

type Page = {
  label: string
  title: string
  body: string
  Scene: ComponentType<{ play: boolean }>
}

// What LanaTools is, in three pages: the toolkit, what the agent does with
// it, and who stays in charge. Copy follows the
// brand: sentence case, no exclamation marks.
const PAGES: Page[] = [
  {
    label: 'Welcome',
    title: 'Let your agent work.\nOn Solana.',
    body: 'Your agent’s toolkit: read Solana, pay for services, swap and trade, all through one LanaTools connection. Tap a card to play it.',
    Scene: WelcomeScene,
  },
  {
    label: '01 · Ask',
    title: 'Ask in plain words',
    body: 'Balances, prices, order books. The agent picks the right tool, runs it, and shows you every call it makes.',
    Scene: AskScene,
  },
  {
    label: '02 · Control',
    title: 'You hold the keys',
    body: 'Set one spending limit. Your agent can prepare a transaction, but only you can sign it. Try both above.',
    Scene: ControlScene,
  },
]

const LAST = PAGES.length - 1
// A scene starts its script once this much of its page has slid into view,
// so it is already moving as it arrives.
const START_AT = 0.15

/**
 * The introduction, shown once on first launch and again from settings: a
 * pager of three pages over one side-field pattern that drifts with the
 * swipe. Each page is a scene in motion with the words beneath it; the last
 * one is played with, not watched.
 */
export default function Onboarding() {
  const { colors } = useTheme()
  const { width, height } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const onboarding = useOnboarding()
  const pager = useAnimatedRef<Animated.ScrollView>()
  // 0 on the first page, 1 on the second, fractional between.
  const progress = useSharedValue(0)
  // What React last heard, so the UI thread only calls over on a change.
  const told = useSharedValue({ page: 0, reached: 0 })
  const [page, setPage] = useState(0)
  // The furthest page reached; its scene and every earlier one have played.
  const [reached, setReached] = useState(0)

  function turn(next: number) {
    setPage(next)
    void Haptics.selectionAsync()
  }
  function reach(next: number) {
    setReached((last) => Math.max(last, Math.min(next, LAST)))
  }

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      const at = event.contentOffset.x / width
      progress.set(at)
      const last = told.get()
      const page = Math.round(at)
      const reached = Math.floor(at + 1 - START_AT)
      if (page !== last.page) scheduleOnRN(turn, page)
      if (reached > last.reached) scheduleOnRN(reach, reached)
      if (page !== last.page || reached > last.reached)
        told.set({ page, reached: Math.max(reached, last.reached) })
    },
  })

  function go(next: number) {
    scheduleOnUI(() => {
      'worklet'
      scrollTo(pager, next * width, 0, true)
    })
  }

  function finish() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onboarding.finish()
    // From settings, back to where the user was; on first launch, the chat.
    if (router.canGoBack()) router.back()
    else router.replace('/')
  }

  // Back steps through the pages before it leaves them.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (page === 0) return false
      go(page - 1)
      return true
    })
    return () => sub.remove()
    // `go` only closes over values that change with `page` or `width`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, width])

  // The pattern moves a little with each page, slower than the pages, so
  // the scenes read as nearer than the field behind them.
  // It is the welcome's backdrop, and quietens on later pages so their
  // scenes stand clear of it.
  const fieldStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0, 1], [1, 0.12], 'clamp'),
    transform: [{ translateX: -progress.get() * DRIFT }],
  }))
  // The status bar, the words and the button sit on clear paper.
  const wordsTop = height - insets.bottom - FOOT - WORDS
  const span = width + DRIFT * LAST
  const avoid = [
    { x: 0, y: 0, width: span, height: insets.top + BAR },
    { x: 0, y: wordsTop, width: span, height },
  ]

  const skipStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.get(),
      [LAST - 1, LAST - 0.4],
      [1, 0],
      'clamp',
    ),
  }))

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <Animated.View
        style={[styles.field, { width: width + DRIFT * LAST }, fieldStyle]}
        pointerEvents="none"
      >
        <SideField seed={23} avoid={avoid} />
      </Animated.View>
      <Animated.ScrollView
        ref={pager}
        onScroll={onScroll}
        scrollEventThrottle={16}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        overScrollMode="never"
        style={styles.pager}
      >
        {PAGES.map((item, index) => (
          <PageView
            key={item.label}
            page={item}
            index={index}
            progress={progress}
            play={index <= reached}
            width={width}
            top={insets.top + BAR}
            bottom={insets.bottom + FOOT}
          />
        ))}
      </Animated.ScrollView>

      <View style={[styles.bar, { top: insets.top }]} pointerEvents="box-none">
        <View
          style={styles.steps}
          accessible
          accessibilityLabel={`Page ${page + 1} of ${PAGES.length}`}
        >
          {PAGES.map((item, index) => (
            <Step key={item.label} index={index} progress={progress} />
          ))}
        </View>
        <Animated.View
          style={skipStyle}
          pointerEvents={page === LAST ? 'none' : 'auto'}
        >
          <PressableScale
            onPress={finish}
            accessibilityRole="button"
            accessibilityLabel="Skip the introduction"
            hitSlop={8}
            style={styles.skip}
            pressedStyle={{ backgroundColor: colors.panel2 }}
          >
            <Text style={[styles.skipText, { color: colors.text2 }]}>Skip</Text>
          </PressableScale>
        </Animated.View>
      </View>

      <View style={[styles.foot, { paddingBottom: insets.bottom + 16 }]}>
        <Button
          primary
          size="lg"
          label={page === LAST ? 'Start chatting' : 'Continue'}
          trailing="→"
          onPress={() => (page === LAST ? finish() : go(page + 1))}
        />
      </View>
    </View>
  )
}

const BAR = 56
const FOOT = 16 + 48 + 28
const WORDS = 196
const DRIFT = 56

/** One page: the scene, then the words. */
function PageView({
  page,
  index,
  progress,
  play,
  width,
  top,
  bottom,
}: {
  page: Page
  index: number
  progress: SharedValue<number>
  play: boolean
  width: number
  top: number
  bottom: number
}) {
  const { colors } = useTheme()
  const { Scene } = page

  // Depth while swiping: the scene runs ahead of its page and shrinks a
  // touch as it leaves, so it never shows on its neighbour; the words fade.
  const sceneStyle = useAnimatedStyle(() => {
    const away = progress.get() - index
    return {
      opacity: interpolate(Math.abs(away), [0, 0.9], [1, 0.2], 'clamp'),
      transform: [
        { translateX: -away * width * 0.35 },
        { scale: interpolate(Math.abs(away), [0, 1], [1, 0.9], 'clamp') },
      ],
    }
  })
  const textStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      Math.abs(progress.get() - index),
      [0, 0.7],
      [1, 0],
      'clamp',
    ),
  }))

  return (
    <View
      style={[styles.page, { width, paddingTop: top, paddingBottom: bottom }]}
    >
      {/* Only the last scene is interactive; the others are pictures. */}
      <Animated.View
        style={[styles.scene, sceneStyle]}
        accessibilityElementsHidden={index !== LAST}
        importantForAccessibility={
          index !== LAST ? 'no-hide-descendants' : 'auto'
        }
      >
        <Scene play={play} />
      </Animated.View>
      <Animated.View style={[styles.words, textStyle]}>
        <Label>{page.label}</Label>
        <Text
          style={[styles.title, { color: colors.text }]}
          accessibilityRole="header"
          maxFontSizeMultiplier={1.25}
        >
          {page.title}
        </Text>
        <Body style={styles.body}>{page.body}</Body>
      </Animated.View>
    </View>
  )
}

/** A segment of the progress bar, filling with the finger. */
function Step({
  index,
  progress,
}: {
  index: number
  progress: SharedValue<number>
}) {
  const { colors } = useTheme()
  const fill = useAnimatedStyle(() => ({
    transform: [
      {
        scaleX: interpolate(
          progress.get(),
          [index - 1, index],
          [0, 1],
          'clamp',
        ),
      },
    ],
  }))
  return (
    <View style={[styles.step, { backgroundColor: colors.line }]}>
      <Animated.View
        style={[styles.stepFill, { backgroundColor: colors.text }, fill]}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  pager: { flex: 1 },
  page: { flex: 1 },
  scene: { flex: 1 },
  field: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  words: { paddingHorizontal: 16, paddingTop: 20, minHeight: WORDS },
  title: {
    marginTop: 10,
    fontFamily: fonts.mono,
    fontWeight: '600',
    fontSize: 25,
    lineHeight: 30,
    letterSpacing: 25 * -0.04,
  },
  body: { marginTop: 10, fontSize: 15, lineHeight: 22 },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: BAR,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 16,
    paddingRight: 6,
  },
  steps: { flexDirection: 'row', gap: 4 },
  step: { width: 22, height: 3, borderRadius: 1.5, overflow: 'hidden' },
  stepFill: {
    position: 'absolute',
    inset: 0,
    transformOrigin: 'left',
  },
  skip: {
    height: 40,
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderRadius: radius.button,
  },
  skipText: { fontFamily: fonts.mono, fontWeight: '600', fontSize: 12.5 },
  foot: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
  },
})
