import { StyleSheet, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import { ArrowUpRightIcon } from 'phosphor-react-native/src/icons/ArrowUpRight'
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
import { Hatch } from '../components/surfaces'
import { Body, Label } from '../components/text'
import { EASE_OUT } from '../theme/motion'
import { useTheme } from '../theme/theme'
import { fonts, radius } from '../theme/tokens'
import type { SharedValue } from 'react-native-reanimated'

// Starting points the LanaTools tools can answer, one per tool family.
// Short enough to sit on one line at the default text size.
export const SUGGESTIONS = [
  { source: 'Helius', prompt: 'What’s in my wallet?' },
  { source: 'Jupiter', prompt: 'Price of SOL and JUP' },
  { source: 'Phoenix', prompt: 'SOL perps order book' },
  { source: 'pay.sh', prompt: 'Find a paid weather API' },
] as const

// The list arrives once, after the greeting; built at module scope.
const LIST_IN = FadeInDown.duration(250).delay(150).easing(EASE_OUT)

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
          {/* The dashboard's ledger table: a hatched head, hairline rows,
              the prompt first and the tool that answers it after. */}
          <Animated.View
            entering={LIST_IN}
            style={[
              styles.list,
              { backgroundColor: colors.panel, borderColor: colors.line },
            ]}
          >
            <View
              style={[
                styles.head,
                {
                  backgroundColor: colors.panel2,
                  borderBottomColor: colors.line,
                },
              ]}
            >
              <Hatch />
              <Label>Try asking</Label>
            </View>
            {SUGGESTIONS.map((item, index) => (
              <PressableScale
                key={item.prompt}
                scale={false}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  onPick(item.prompt)
                }}
                accessibilityRole="button"
                accessibilityLabel={item.prompt}
                accessibilityHint={`Asks your agent, using ${item.source}`}
                style={[
                  styles.row,
                  index > 0 && {
                    borderTopWidth: 1,
                    borderTopColor: colors.line,
                  },
                ]}
                pressedStyle={{ backgroundColor: colors.panel2 }}
              >
                <Text
                  style={[styles.prompt, { color: colors.text }]}
                  maxFontSizeMultiplier={1.3}
                  numberOfLines={1}
                >
                  {item.prompt}
                </Text>
                <Label>{item.source}</Label>
                <ArrowUpRightIcon size={14} color={colors.text3} />
              </PressableScale>
            ))}
          </Animated.View>
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
  suggestions: { paddingHorizontal: 16, paddingBottom: 6 },
  list: {
    borderWidth: 1,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  head: {
    height: 34,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  prompt: {
    flex: 1,
    fontFamily: fonts.sans,
    fontWeight: '500',
    fontSize: 15,
  },
})
