import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import { CheckIcon } from 'phosphor-react-native/src/icons/Check'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  css,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'
import { LineIcon } from '../brand/SideField'
import { PressableScale } from '../components/PressableScale'
import { StatusDot } from '../components/StatusDot'
import { Label } from '../components/text'
import { CSS_EASE_OUT, EASE_OUT } from '../theme/motion'
import { useTheme } from '../theme/theme'
import { brand, fonts, radius } from '../theme/tokens'
import { RollingNumber } from './RollingNumber'
import { WalletFan } from './WalletFan'
import { Reveal, useTimeline } from './timeline'

// The introduction's four scenes. No cards and no frames: each is a small
// piece of motion built from the brand's own vocabulary (the mark and its
// lime caret, the side field's line icons, mono figures that roll like the
// dashboard's counters) and plays once, the first time it slides into view.
// Figures are illustrative.

/* ───────────────────────────── Welcome ───────────────────────────── */

/** The agent's toolkit, dealt out of its pocket and played. */
export function WelcomeScene({ play }: { play: boolean }) {
  return <WalletFan play={play} />
}

/* ─────────────────────────────── Ask ─────────────────────────────── */

const BLINK = css.keyframes({
  '0%': { opacity: 1 },
  '49.9%': { opacity: 1 },
  '50%': { opacity: 0 },
  '100%': { opacity: 0 },
})

/** Types `text` out a character at a time, with the mark's lime caret. */
function Typed({
  text,
  play,
  onDone,
}: {
  text: string
  play: boolean
  onDone: () => void
}) {
  const { colors } = useTheme()
  const reduced = useReducedMotion()
  const [shown, setShown] = useState(reduced ? text.length : 0)

  useEffect(() => {
    if (!play) return
    if (reduced) {
      onDone()
      return
    }
    let count = 0
    const timer = setInterval(() => {
      count += 1
      setShown(count)
      if (count >= text.length) {
        clearInterval(timer)
        onDone()
      }
    }, 46)
    return () => clearInterval(timer)
    // The text is fixed; only `play` starts the typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play, reduced])

  return (
    <View style={styles.prompt} accessible accessibilityLabel={text}>
      <Text style={[styles.promptGlyph, { color: colors.text3 }]}>›</Text>
      <Text
        style={[styles.promptText, { color: colors.text }]}
        maxFontSizeMultiplier={1}
      >
        {text.slice(0, shown)}
      </Text>
      <Animated.View
        style={[
          styles.caret,
          { backgroundColor: brand.lime },
          !reduced && {
            animationName: BLINK,
            animationDuration: 1100,
            animationIterationCount: 'infinite',
            animationTimingFunction: 'linear',
          },
        ]}
      />
    </View>
  )
}

const HOLDINGS = [
  { token: 'SOL', amount: '12.40', usd: '$1,934' },
  { token: 'USDC', amount: '310.00', usd: '$310' },
  { token: 'JUP', amount: '1,204.50', usd: '$723' },
]

/** A question typed out, the tool it becomes, and the answer rolling in. */
export function AskScene({ play }: { play: boolean }) {
  const { colors } = useTheme()
  const [typed, setTyped] = useState(false)
  // After the typing: the call starts, finishes, and the figures roll.
  const step = useTimeline(typed, [150, 900, 1000])

  return (
    <View style={[styles.fill, styles.ask]}>
      <Typed
        text="What’s in my wallet?"
        play={play}
        onDone={() => setTyped(true)}
      />
      <Reveal shown={step >= 1} style={styles.call}>
        <StatusDot state={step >= 2 ? 'done' : 'live'} />
        <Text style={[styles.callName, { color: colors.text }]}>
          get_wallet_holdings
        </Text>
        <Text style={[styles.callMeta, { color: colors.text3 }]}>Helius</Text>
        <Animated.Text
          style={[
            styles.callTime,
            {
              color: colors.text3,
              opacity: step >= 2 ? 1 : 0,
              transitionProperty: 'opacity',
              transitionDuration: 200,
            },
          ]}
        >
          0.6s
        </Animated.Text>
      </Reveal>
      <View style={styles.holdings}>
        {HOLDINGS.map((row, index) => (
          <Reveal
            key={row.token}
            shown={step >= 3}
            rise={6}
            style={[
              styles.holding,
              { borderTopColor: colors.line, transitionDelay: index * 140 },
            ]}
          >
            <RollingNumber
              value={row.amount}
              play={step >= 3}
              size={30}
              color={colors.text}
              delay={index * 140}
            />
            <Text style={[styles.token, { color: colors.text2 }]}>
              {row.token}
            </Text>
            <Reveal
              shown={step >= 3}
              rise={4}
              style={[styles.usd, { transitionDelay: 700 + index * 140 }]}
            >
              <Text style={[styles.usdText, { color: colors.text3 }]}>
                {row.usd}
              </Text>
            </Reveal>
          </Reveal>
        ))}
      </View>
    </View>
  )
}

/* ───────────────────────────── Control ───────────────────────────── */

const TICKS = 24
const START = 5
const HOLD_MS = 900

function tickAt(x: number, width: number) {
  'worklet'
  return Math.max(1, Math.min(TICKS, Math.ceil((x / width) * TICKS)))
}

/** A spending limit to drag, ticking under the finger. */
function LimitDial({ play }: { play: boolean }) {
  const { colors } = useTheme()
  const reduced = useReducedMotion()
  // Reduced motion starts at the default; otherwise it sweeps up to it.
  const [count, setCount] = useState(reduced ? START : 0)
  const [width, setWidth] = useState(0)
  const shared = useSharedValue(0)
  const edge = useSharedValue(0)

  // Once in view, the limit sweeps up to its default, to show it moves.
  useEffect(() => {
    if (!play || reduced) return
    let next = 0
    const timer = setInterval(() => {
      next += 1
      setCount(next)
      if (next >= START) clearInterval(timer)
    }, 90)
    return () => clearInterval(timer)
  }, [play, reduced])

  useEffect(() => {
    shared.set(count)
    edge.set(
      withSpring((count / TICKS) * width, {
        duration: 260,
        dampingRatio: 0.85,
        reduceMotion: ReduceMotion.System,
      }),
    )
  }, [count, width, shared, edge])

  const pick = (next: number) => {
    setCount(next)
    void Haptics.selectionAsync()
  }

  const pan = Gesture.Pan()
    .minDistance(0)
    .onBegin((event) => {
      if (width === 0) return
      const next = tickAt(event.x, width)
      if (next !== shared.get()) {
        shared.set(next)
        scheduleOnRN(pick, next)
      }
    })
    .onUpdate((event) => {
      if (width === 0) return
      const next = tickAt(event.x, width)
      if (next !== shared.get()) {
        shared.set(next)
        scheduleOnRN(pick, next)
      }
    })

  const handle = useAnimatedStyle(() => ({
    transform: [{ translateX: edge.get() - 2 }],
  }))

  return (
    <View>
      <View style={styles.limitHead}>
        <Label>Spending limit</Label>
      </View>
      <View style={styles.limitFigure}>
        <RollingNumber
          value={`$${count}`}
          play={play}
          size={44}
          color={colors.text}
          weight="700"
        />
        <Text style={[styles.limitUnit, { color: colors.text3 }]}>
          USDC per agent
        </Text>
      </View>
      <GestureDetector gesture={pan}>
        <View
          style={styles.track}
          onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="Spending limit"
          accessibilityValue={{ text: `$${count}` }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(event) => {
            const delta = event.nativeEvent.actionName === 'increment' ? 1 : -1
            setCount((last) => Math.max(1, Math.min(TICKS, last + delta)))
          }}
        >
          {Array.from({ length: TICKS }, (_, index) => (
            <View
              key={index}
              style={[styles.dialTick, { backgroundColor: colors.panel2 }]}
            >
              <Animated.View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    backgroundColor: colors.tick,
                    opacity: index < count ? 1 : 0,
                    transitionProperty: 'opacity',
                    transitionDuration: 120,
                  },
                ]}
              />
            </View>
          ))}
          <Animated.View
            style={[styles.handle, { backgroundColor: colors.text }, handle]}
          />
        </View>
      </GestureDetector>
      <Label style={styles.dialHint}>Drag to set it</Label>
    </View>
  )
}

const STAMP = css.keyframes({
  from: { opacity: 0, transform: [{ scale: 1.6 }, { rotate: '-12deg' }] },
  to: { opacity: 1, transform: [{ scale: 1 }, { rotate: '0deg' }] },
})

/** Hold to sign: the fill grows while held, and lets go if released. */
function HoldToSign() {
  const { name, colors } = useTheme()
  const reduced = useReducedMotion()
  const [signed, setSigned] = useState(false)
  // By night the primary button is paper, so this one is an outline that
  // only turns lime once signed, and the two never look alike.
  const night = name === 'dark' && !signed
  const ink = night ? colors.text : brand.ink
  const progress = useSharedValue(0)

  const sign = () => {
    setSigned(true)
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  }

  const fill = useAnimatedStyle(() => ({
    transform: [{ scaleX: progress.get() }],
  }))

  return (
    <PressableScale
      disabled={signed}
      onPressIn={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        // Slow and linear while the user decides; quick to let go.
        progress.set(
          withTiming(
            1,
            { duration: reduced ? 0 : HOLD_MS, easing: Easing.linear },
            (finished) => {
              if (finished) scheduleOnRN(sign)
            },
          ),
        )
      }}
      onPressOut={() => {
        if (progress.get() < 1)
          progress.set(withTiming(0, { duration: 200, easing: EASE_OUT }))
      }}
      accessibilityRole="button"
      accessibilityLabel={signed ? 'Signed' : 'Hold to sign the swap'}
      accessibilityState={{ disabled: signed }}
      style={styles.hold}
    >
      {/* The toolkit cards' look: paper, an ink outline, a hard shadow, and
          lime, the primary action, filling in while held. */}
      <View
        style={[
          styles.holdShadow,
          { backgroundColor: name === 'dark' ? colors.line2 : brand.ink },
        ]}
      />
      <View
        style={[
          styles.holdFace,
          night && { backgroundColor: colors.panel, borderColor: colors.text },
          signed && { backgroundColor: brand.lime },
        ]}
      >
        <Animated.View
          style={[
            styles.holdFill,
            { backgroundColor: brand.lime, opacity: night ? 0.3 : 1 },
            fill,
          ]}
        />
        {signed ? (
          <Animated.View
            style={[
              styles.holdContent,
              !reduced && {
                animationName: STAMP,
                animationDuration: 380,
                animationTimingFunction: CSS_EASE_OUT,
                animationFillMode: 'both',
              },
            ]}
          >
            <CheckIcon size={16} weight="bold" color={brand.ink} />
            <Text style={styles.holdText}>Signed on this phone</Text>
          </Animated.View>
        ) : (
          <View style={styles.holdContent}>
            <LineIcon name="sign" size={16} color={ink} />
            <Text style={[styles.holdText, { color: ink }]}>Hold to sign</Text>
          </View>
        )}
      </View>
    </PressableScale>
  )
}

/** A limit to drag, and a swap only the user can sign. */
export function ControlScene({ play }: { play: boolean }) {
  const { colors } = useTheme()
  const step = useTimeline(play, [0, 700])
  return (
    <View style={[styles.fill, styles.control]}>
      <Reveal shown={step >= 1}>
        <LimitDial play={play} />
      </Reveal>
      <Reveal shown={step >= 2} style={styles.swap}>
        <Label>Your agent prepared</Label>
        <View style={styles.swapRow}>
          <Text style={[styles.swapAmount, { color: colors.text }]}>
            1.00 USDC
          </Text>
          <Text style={[styles.swapArrow, { color: colors.text3 }]}>→</Text>
          <Text style={[styles.swapAmount, { color: colors.text }]}>
            0.0064 SOL
          </Text>
        </View>
        <HoldToSign />
      </Reveal>
    </View>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },

  ask: { justifyContent: 'center', paddingHorizontal: 16 },
  prompt: { flexDirection: 'row', alignItems: 'center' },
  promptGlyph: {
    fontFamily: fonts.mono,
    fontWeight: '600',
    fontSize: 22,
    marginRight: 10,
  },
  promptText: {
    fontFamily: fonts.mono,
    fontWeight: '600',
    fontSize: 21,
    letterSpacing: 21 * -0.03,
  },
  caret: {
    width: 11,
    height: 4,
    borderRadius: 2,
    marginLeft: 3,
    marginTop: 14,
  },
  call: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 22,
  },
  callName: { fontFamily: fonts.mono, fontWeight: '600', fontSize: 12.5 },
  callMeta: { fontFamily: fonts.mono, fontSize: 12.5 },
  callTime: { marginLeft: 'auto', fontFamily: fonts.mono, fontSize: 12 },
  holdings: { marginTop: 18 },
  holding: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  token: { fontFamily: fonts.mono, fontWeight: '500', fontSize: 14 },
  usd: { marginLeft: 'auto' },
  usdText: {
    fontFamily: fonts.mono,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },

  control: { justifyContent: 'center', paddingHorizontal: 16, gap: 34 },
  limitHead: { flexDirection: 'row', justifyContent: 'space-between' },
  dialHint: { marginTop: 8 },
  limitFigure: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    marginTop: 6,
    marginBottom: 14,
  },
  limitUnit: { fontFamily: fonts.mono, fontSize: 12.5, marginBottom: 12 },
  track: { flexDirection: 'row', gap: 3, height: 44, alignItems: 'center' },
  dialTick: { flex: 1, height: 30, borderRadius: 3, overflow: 'hidden' },
  handle: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 4,
    height: 44,
    borderRadius: 2,
  },
  swap: { gap: 10 },
  swapRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  swapAmount: {
    fontFamily: fonts.mono,
    fontWeight: '600',
    fontSize: 20,
    letterSpacing: 20 * -0.03,
    fontVariant: ['tabular-nums'],
  },
  swapArrow: { fontFamily: fonts.mono, fontSize: 16 },
  hold: { height: 54, marginTop: 6, marginRight: 4 },
  holdShadow: {
    position: 'absolute',
    left: 4,
    top: 4,
    right: -4,
    bottom: -4,
    borderRadius: radius.button,
  },
  holdFace: {
    flex: 1,
    justifyContent: 'center',
    borderRadius: radius.button,
    borderWidth: 1.5,
    borderColor: brand.ink,
    backgroundColor: brand.paper,
    overflow: 'hidden',
  },
  holdFill: { position: 'absolute', inset: 0, transformOrigin: 'left' },
  holdContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  holdText: {
    fontFamily: fonts.mono,
    fontWeight: '700',
    fontSize: 13.5,
    color: brand.ink,
  },
})
