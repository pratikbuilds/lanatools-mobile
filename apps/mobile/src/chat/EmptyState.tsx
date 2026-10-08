import { ScrollView, StyleSheet, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useKeyboardState } from 'react-native-keyboard-controller'
import Animated, {
  FadeInDown,
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BrandMark } from '../brand/BrandMark'
import { LineIcon } from '../brand/SideField'
import type { IconName } from '../brand/SideField'
import { Clear, FieldArea } from '../components/FieldArea'
import { PressableScale } from '../components/PressableScale'
import { Hatch } from '../components/surfaces'
import { Body, Label } from '../components/text'
import { EASE_OUT } from '../theme/motion'
import { useTheme } from '../theme/theme'
import { fonts, radius } from '../theme/tokens'
import type { SharedValue } from 'react-native-reanimated'

// Starting points the LanaTools tools can answer, one per tool family,
// each with the line icon from the side field that says what it does.
export const SUGGESTIONS = [
  { source: 'Helius', prompt: 'What’s in my wallet?', icon: 'wallet' },
  { source: 'Jupiter', prompt: 'Price of SOL and JUP', icon: 'coin' },
  { source: 'Phoenix', prompt: 'SOL perps order book', icon: 'chart' },
  { source: 'pay.sh', prompt: 'Find a paid weather API', icon: 'search' },
] as const satisfies readonly {
  source: string
  prompt: string
  icon: IconName
}[]

// Built once at module scope; a per-index delay staggers them 40ms apart.
const CARD_IN = SUGGESTIONS.map((_, index) =>
  FadeInDown.duration(250)
    .delay(150 + index * 40)
    .easing(EASE_OUT),
)

/**
 * A new conversation: the mark and one question on the side-field pattern,
 * with starting points within reach of the thumb, just above the composer.
 * While the keyboard is up the starting points step aside, the question
 * rises to stay centred, and the pattern quietens; all of it rides the
 * keyboard's own position on the UI thread.
 */
export function EmptyState({
  onPick,
  keyboard,
}: {
  onPick: (prompt: string) => void
  keyboard: { height: SharedValue<number>; progress: SharedValue<number> }
}) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const typing = useKeyboardState((state) => state.isVisible)

  const greetingStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: Math.min(0, keyboard.height.get() + insets.bottom) / 2 },
    ],
  }))
  const listStyle = useAnimatedStyle(() => ({
    opacity: interpolate(keyboard.progress.get(), [0, 0.6], [1, 0], 'clamp'),
  }))
  const fieldStyle = useAnimatedStyle(() => ({
    opacity: 1 - 0.85 * keyboard.progress.get(),
  }))

  return (
    <FieldArea style={styles.area} fieldStyle={fieldStyle}>
      <View style={styles.middle} pointerEvents="box-none">
        <Clear id="greeting">
          <Animated.View style={[styles.greeting, greetingStyle]}>
            <BrandMark size={44} color={colors.text} animate />
            <Text
              style={[styles.title, { color: colors.text }]}
              accessibilityRole="header"
              maxFontSizeMultiplier={1.3}
            >
              What should your agent do?
            </Text>
            <Body style={styles.lede}>
              It reads Solana data, pays for APIs and prepares transactions,
              within the limits you set.
            </Body>
          </Animated.View>
        </Clear>
      </View>
      <Clear id="suggestions" style={styles.suggestions}>
        <Animated.View
          style={listStyle}
          pointerEvents={typing ? 'none' : 'auto'}
          accessibilityElementsHidden={typing}
        >
          <Label style={styles.label}>Try asking</Label>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cards}
            keyboardShouldPersistTaps="handled"
            decelerationRate="fast"
          >
            {SUGGESTIONS.map((item, index) => (
              <Animated.View key={item.prompt} entering={CARD_IN[index]}>
                <PressableScale
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                    onPick(item.prompt)
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={item.prompt}
                  accessibilityHint={`Asks your agent, using ${item.source}`}
                  style={[
                    styles.card,
                    { backgroundColor: colors.panel, borderColor: colors.line },
                  ]}
                  pressedStyle={{ borderColor: colors.line2 }}
                >
                  <View
                    style={[
                      styles.tile,
                      {
                        backgroundColor: colors.panel2,
                        borderColor: colors.line,
                      },
                    ]}
                  >
                    <Hatch />
                    <LineIcon name={item.icon} size={18} color={colors.text} />
                  </View>
                  <View style={styles.cardText}>
                    <Text
                      style={[styles.prompt, { color: colors.text }]}
                      maxFontSizeMultiplier={1.3}
                      numberOfLines={1}
                    >
                      {item.prompt}
                    </Text>
                    <Label>{item.source}</Label>
                  </View>
                </PressableScale>
              </Animated.View>
            ))}
          </ScrollView>
        </Animated.View>
      </Clear>
    </FieldArea>
  )
}

const styles = StyleSheet.create({
  area: { justifyContent: 'flex-end' },
  middle: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  greeting: { alignItems: 'center' },
  title: {
    marginTop: 20,
    fontFamily: fonts.mono,
    fontWeight: '600',
    fontSize: 21,
    lineHeight: 26,
    letterSpacing: 21 * -0.04,
    textAlign: 'center',
  },
  lede: { marginTop: 10, textAlign: 'center', maxWidth: 300 },
  suggestions: { paddingBottom: 6 },
  label: { paddingHorizontal: 16, marginBottom: 8 },
  cards: { gap: 8, paddingHorizontal: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 64,
    paddingLeft: 12,
    paddingRight: 18,
    borderWidth: 1,
    borderRadius: radius.card,
  },
  tile: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.field,
    overflow: 'hidden',
  },
  cardText: { gap: 4 },
  prompt: {
    fontFamily: fonts.sans,
    fontWeight: '500',
    fontSize: 15,
  },
})
