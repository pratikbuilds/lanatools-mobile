import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import { BrandMark } from '../brand/BrandMark'
import { Clear, FieldArea } from '../components/FieldScroll'
import { Body, Label } from '../components/text'
import { useTheme } from '../theme/theme'
import { fonts, radius } from '../theme/tokens'

// Starting points the LanaTools tools can answer, one per tool family.
export const SUGGESTIONS = [
  { source: 'Helius', prompt: 'What’s in my wallet?' },
  { source: 'Jupiter', prompt: 'What are SOL and JUP trading at?' },
  { source: 'Phoenix', prompt: 'Show me the SOL perps order book' },
  { source: 'pay.sh', prompt: 'Find a paid API for weather data' },
] as const

/**
 * A new conversation: the mark and one question on the side-field pattern,
 * with starting points within reach of the thumb, just above the composer.
 */
export function EmptyState({ onPick }: { onPick: (prompt: string) => void }) {
  const { colors } = useTheme()
  return (
    <FieldArea style={styles.area}>
      <View style={styles.middle} pointerEvents="box-none">
        <Clear id="greeting" style={styles.greeting}>
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
        </Clear>
      </View>
      <Clear id="suggestions" style={styles.suggestions}>
        <Label style={styles.suggestionsLabel}>Try</Label>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          keyboardShouldPersistTaps="handled"
        >
          {SUGGESTIONS.map((item) => (
            <Pressable
              key={item.prompt}
              onPress={() => {
                void Haptics.selectionAsync()
                onPick(item.prompt)
              }}
              accessibilityRole="button"
              accessibilityLabel={item.prompt}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: pressed ? colors.panel2 : colors.panel,
                  borderColor: pressed ? colors.line2 : colors.line,
                },
              ]}
            >
              <Label>{item.source}</Label>
              <Text
                style={[styles.chipText, { color: colors.text }]}
                maxFontSizeMultiplier={1.3}
                numberOfLines={2}
              >
                {item.prompt}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
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
