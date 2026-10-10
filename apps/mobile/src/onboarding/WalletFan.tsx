import { useEffect, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import Animated, {
  FadeInDown,
  FadeOutUp,
  Keyframe,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated'
import { LineIcon } from '../brand/SideField'
import { EASE_OUT } from '../theme/motion'
import { useTheme } from '../theme/theme'
import { brand, fonts } from '../theme/tokens'
import {
  AnalyzeArt,
  CARD_FACE,
  PayArt,
  ReadArt,
  SendArt,
  TrackArt,
} from './arts'
import type { ArtProps } from './arts'
import type { IconName } from '../brand/SideField'
import type { ComponentType } from 'react'
import type { LayoutChangeEvent } from 'react-native'

// The landing page's wallet fan (lanatools/apps/web/src/components/landing/
// wallet-fan.tsx) for a phone: the agent's toolkit as a hand of cards dealt
// out of a lime pocket, then played one at a time. Tapping a card plays it.
// Drawn at a fixed size and scaled to fit, as on the web.

const W = 440
const H = 470
const CARD = { w: 168, h: 236 }
const CARD_TOP = 96
const SHADOW = 5
// The web's compact fan, drawn in a little so the outer cards, and the
// badge over a played one, stay on a phone's screen.
const FAN = [
  { dx: -100, dy: 26, r: -8 },
  { dx: -52, dy: 8, r: -4 },
  { dx: 0, dy: 0, r: 0 },
  { dx: 52, dy: 8, r: 4 },
  { dx: 100, dy: 26, r: 8 },
]
// The web's springs: cards settle with a little give, badges pop.
const SETTLE = {
  stiffness: 210,
  damping: 22,
  reduceMotion: ReduceMotion.System,
}

type Card = {
  verb: string
  icon: IconName
  value: string
  detail: string
  result: string
  Art: ComponentType<ArtProps>
}

// One card per kind of work, named for what the LanaTools tools behind it
// do. Sample values, not live data.
const CARDS: Card[] = [
  {
    verb: 'pay',
    icon: 'receipt',
    value: '0.25 USDC',
    detail: 'pay.sh · x402',
    result: 'paid · receipt saved',
    Art: PayArt,
  },
  {
    verb: 'read',
    icon: 'database',
    value: '12.5 SOL',
    detail: 'Helius · balance',
    result: 'balance returned',
    Art: ReadArt,
  },
  {
    verb: 'track',
    icon: 'wallet',
    value: '6 tokens',
    detail: 'tokens · positions',
    result: 'portfolio returned',
    Art: TrackArt,
  },
  {
    verb: 'swap',
    icon: 'transfer',
    value: 'SOL → USDC',
    detail: 'Jupiter · you sign',
    result: 'ready for you to sign',
    Art: SendArt,
  },
  {
    verb: 'trade',
    icon: 'chart',
    value: 'SOL-PERP',
    detail: 'Phoenix · order book',
    result: 'order book returned',
    Art: AnalyzeArt,
  },
]

// The order the sample loop plays them in.
const LOOP = [1, 0, 3, 2, 4]
const CYCLE_MS = 2600
const REST_MS = 1900

const BADGE_IN = new Keyframe({
  0: { opacity: 0, transform: [{ translateY: 12 }, { scale: 0.8 }] },
  100: {
    opacity: 1,
    transform: [{ translateY: 0 }, { scale: 1 }],
    easing: EASE_OUT,
  },
}).duration(260)
const LOG_IN = FadeInDown.duration(260).easing(EASE_OUT)
const LOG_OUT = FadeOutUp.duration(180).easing(EASE_OUT)

function FanCard({
  card,
  index,
  dealt,
  active,
  shadow,
  onPress,
}: {
  card: Card
  index: number
  dealt: boolean
  active: boolean
  shadow: string
  onPress: () => void
}) {
  const pos = FAN[index] ?? { dx: 0, dy: 0, r: 0 }
  const reduced = useReducedMotion()
  const deal = useSharedValue(reduced ? 1 : 0)
  const lift = useSharedValue(0)

  useEffect(() => {
    if (!dealt || reduced) return
    deal.set(withDelay(250 + index * 70, withSpring(1, SETTLE)))
  }, [dealt, reduced, index, deal])

  useEffect(() => {
    lift.set(withSpring(active ? 1 : 0, SETTLE))
  }, [active, lift])

  const style = useAnimatedStyle(() => {
    const d = deal.get()
    const l = lift.get()
    return {
      transform: [
        { translateX: pos.dx * d * (1 + 0.08 * l) },
        { translateY: 190 + (pos.dy - 190) * d - 64 * l },
        { rotate: `${pos.r * d * (1 - 0.5 * l)}deg` },
      ],
    }
  })

  const { Art } = card
  return (
    <Animated.View
      style={[styles.card, { zIndex: active ? 15 : 10 + index }, style]}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${card.verb}: ${card.detail}`}
        style={styles.fill}
      >
        <View style={[styles.shadow, { backgroundColor: shadow }]} />
        <View style={styles.face}>
          <View
            style={[
              styles.iconTile,
              { backgroundColor: active ? brand.lime : CARD_FACE },
            ]}
          >
            <LineIcon name={card.icon} size={20} color={brand.ink} />
          </View>
          <Text style={styles.verb} maxFontSizeMultiplier={1}>
            {card.verb}
          </Text>
          <View style={styles.art}>
            <Art on={active} />
          </View>
          <View
            style={{
              opacity: active ? 1 : 0,
              transitionProperty: 'opacity',
              transitionDuration: 200,
            }}
          >
            <Text style={styles.value} maxFontSizeMultiplier={1}>
              {card.value}
            </Text>
            <Text style={styles.detail} maxFontSizeMultiplier={1}>
              {card.detail}
            </Text>
          </View>
        </View>
      </Pressable>
      {active && (
        <Animated.View entering={BADGE_IN} style={styles.badgeWrap}>
          <View>
            <View style={[styles.badgeShadow, { backgroundColor: shadow }]} />
            <View style={styles.badge}>
              <Text
                style={styles.badgeText}
                numberOfLines={1}
                maxFontSizeMultiplier={1}
              >
                ✓ {card.result}
              </Text>
            </View>
          </View>
        </Animated.View>
      )}
    </Animated.View>
  )
}

/** The hand of tool cards and the pocket they come out of. */
export function WalletFan({ play }: { play: boolean }) {
  const { name, colors } = useTheme()
  const reduced = useReducedMotion()
  const [scale, setScale] = useState(0)
  const [active, setActive] = useState<number | null>(null)
  const [log, setLog] = useState<{ card: number; n: number } | null>(null)
  // A tap takes over from the sample loop for a while.
  const [heldUntil, setHeldUntil] = useState(0)
  const n = useRef(0)
  // Ink shadows read on paper; on black, a quieter line keeps the depth.
  const shadow = name === 'dark' ? colors.line2 : brand.ink

  const show = (card: number) => {
    setActive(card)
    setLog({ card, n: n.current++ })
  }

  useEffect(() => {
    if (!play || reduced) return
    let step = 0
    let timer: ReturnType<typeof setTimeout>
    const loop = () => {
      const wait = heldUntil - Date.now()
      if (wait > 0) {
        timer = setTimeout(loop, wait)
        return
      }
      show(LOOP[step++ % LOOP.length] ?? 1)
      timer = setTimeout(() => {
        setActive(null)
        timer = setTimeout(loop, CYCLE_MS - REST_MS)
      }, REST_MS)
    }
    // After the deal has settled.
    timer = setTimeout(loop, 1500)
    return () => clearTimeout(timer)
  }, [play, reduced, heldUntil])

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout
    setScale(Math.min(1, (width - 12) / W, height / H))
  }

  const entry = log ? CARDS[log.card] : undefined

  return (
    <View style={styles.stage} onLayout={onLayout}>
      {scale > 0 && (
        <View style={[styles.board, { transform: [{ scale }] }]}>
          {CARDS.map((card, index) => (
            <FanCard
              key={card.verb}
              card={card}
              index={index}
              dealt={play}
              active={active === index}
              shadow={shadow}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                setHeldUntil(Date.now() + 3500)
                show(index)
              }}
            />
          ))}

          <View style={styles.pocket} pointerEvents="none">
            <View style={[styles.pocketShadow, { backgroundColor: shadow }]} />
            <View style={styles.pocketFace}>
              <View style={styles.pocketStrap} />
              <View style={styles.pocketHead}>
                <View>
                  <Text style={styles.pocketKicker}>one MCP connection</Text>
                  <Text style={styles.pocketTitle}>your toolkit</Text>
                </View>
                <View style={styles.host}>
                  <Text style={styles.hostText}>mcp.lanatools.sh</Text>
                </View>
              </View>
              <View style={styles.logRow}>
                <Animated.View
                  key={log ? log.n : 'idle'}
                  entering={LOG_IN}
                  exiting={LOG_OUT}
                  style={styles.logLine}
                >
                  {entry ? (
                    <>
                      <Text style={styles.logText} numberOfLines={1}>
                        your agent · {entry.verb} · {entry.value}
                      </Text>
                      <Text style={styles.logState}>allowed</Text>
                    </>
                  ) : (
                    <Text style={styles.logText}>
                      your permissions · your limit · one log
                    </Text>
                  )}
                </Animated.View>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}

const INK = brand.ink

const styles = StyleSheet.create({
  fill: { flex: 1 },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  board: { width: W, height: H },
  card: {
    position: 'absolute',
    width: CARD.w,
    height: CARD.h,
    left: W / 2 - CARD.w / 2,
    top: CARD_TOP,
    transformOrigin: '50% 100%',
  },
  shadow: {
    position: 'absolute',
    left: SHADOW,
    top: SHADOW,
    width: CARD.w,
    height: CARD.h,
    borderRadius: 12,
  },
  face: {
    width: CARD.w,
    height: CARD.h,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: INK,
    backgroundColor: brand.paper,
  },
  iconTile: {
    width: 36,
    height: 36,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: INK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verb: {
    marginTop: 10,
    fontFamily: fonts.mono,
    fontWeight: '700',
    fontSize: 15,
    color: INK,
  },
  art: { marginTop: 14 },
  value: {
    marginTop: 14,
    fontFamily: fonts.mono,
    fontWeight: '700',
    fontSize: 17,
    color: INK,
  },
  detail: {
    marginTop: 5,
    fontFamily: fonts.mono,
    fontSize: 10.5,
    color: '#4a5480',
  },
  // Wider than the card, so a long result stays on one line.
  badgeWrap: {
    position: 'absolute',
    top: -46,
    left: -60,
    right: -60,
    alignItems: 'center',
  },
  badgeShadow: {
    position: 'absolute',
    left: 3,
    top: 3,
    right: -3,
    bottom: -3,
    borderRadius: 6,
  },
  badge: {
    height: 32,
    paddingHorizontal: 10,
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: INK,
    backgroundColor: brand.lime,
  },
  badgeText: {
    fontFamily: fonts.mono,
    fontWeight: '700',
    fontSize: 12,
    color: INK,
  },
  pocket: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 8,
    height: 150,
    zIndex: 20,
  },
  pocketShadow: {
    position: 'absolute',
    left: 6,
    top: 6,
    right: -6,
    bottom: -6,
    borderRadius: 14,
  },
  pocketFace: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: INK,
    backgroundColor: brand.lime,
  },
  pocketStrap: {
    position: 'absolute',
    left: 20,
    right: 20,
    top: 12,
    height: 5,
    borderRadius: 3,
    backgroundColor: INK,
    opacity: 0.85,
  },
  pocketHead: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  pocketKicker: {
    fontFamily: fonts.mono,
    fontWeight: '600',
    fontSize: 12,
    color: INK,
    opacity: 0.7,
  },
  pocketTitle: {
    marginTop: 4,
    fontFamily: fonts.mono,
    fontWeight: '700',
    fontSize: 24,
    letterSpacing: 24 * -0.04,
    color: INK,
  },
  host: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: INK,
    backgroundColor: CARD_FACE,
  },
  hostText: {
    fontFamily: fonts.mono,
    fontWeight: '700',
    fontSize: 11.5,
    color: INK,
  },
  logRow: {
    marginTop: 16,
    height: 31,
    borderTopWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(10, 31, 110, 0.4)',
    overflow: 'hidden',
  },
  logLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 9,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  logText: {
    flexShrink: 1,
    fontFamily: fonts.mono,
    fontWeight: '600',
    fontSize: 12,
    color: INK,
  },
  logState: {
    fontFamily: fonts.mono,
    fontWeight: '600',
    fontSize: 12,
    color: INK,
    opacity: 0.7,
  },
})
