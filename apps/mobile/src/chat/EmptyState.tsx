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
import { Clear, FieldArea } from '../components/FieldArea'
import { PressableScale } from '../components/PressableScale'
import { Body, Label } from '../components/text'
import { EASE_OUT } from '../theme/motion'
import { useTheme } from '../theme/theme'
import { fonts, radius } from '../theme/tokens'
import type { SharedValue } from 'react-native-reanimated'

// Starting points the LanaTools tools can answer, one per tool family.
export const SUGGESTIONS = [
  { source: 'Helius', prompt: 'What’s in my wallet?' },
  { source: 'Jupiter', prompt: 'What are SOL and JUP trading at?' },
  { source: 'Phoenix', prompt: 'Show me the SOL perps order book' },
  { source: 'pay.sh', prompt: 'Find a paid API for weather data' },
] as const

// Built once at module scope; a per-index delay staggers the row 40ms apart.
const CHIP_IN = SUGGESTIONS.map((_, index) =>
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
  const chipsStyle = useAnimatedStyle(() => ({
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
          style={chipsStyle}
          pointerEvents={typing ? 'none' : 'auto'}
          accessibilityElementsHidden={typing}
        >
          <Label style={styles.suggestionsLabel}>Try</Label>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
            keyboardShouldPersistTaps="handled"
          >
            {SUGGESTIONS.map((item, index) => (
              <Animated.View key={item.prompt} entering={CHIP_IN[index]}>
                <PressableScale
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                    onPick(item.prompt)
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={item.prompt}
                  style={[
                    styles.chip,
                    { backgroundColor: colors.panel, borderColor: colors.line },
                  ]}
                  pressedStyle={{ borderColor: colors.line2 }}
                >
                  <Label>{item.source}</Label>
                  <Text
                    style={[styles.chipText, { color: colors.text }]}
                    maxFontSizeMultiplier={1.3}
                    numberOfLines={2}
                  >
                    {item.prompt}
                  </Text>
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
  suggestions: { paddingBottom: 12 },
  suggestionsLabel: { paddingHorizontal: 16, marginBottom: 8 },
  chips: { gap: 8, paddingHorizontal: 16 },
  chip: {
    width: 196,
    minHeight: 84,
    paddingHorizontal: 13,
    paddingVertical: 12,
    gap: 7,
    borderWidth: 1,
    borderRadius: radius.card,
  },
  chipText: {
    fontFamily: fonts.sans,
    fontWeight: '500',
    fontSize: 14.5,
    lineHeight: 19,
  },
})
