import { StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../theme/theme'
import { fonts, radius } from '../theme/tokens'
import { Label } from './text'
import type { ReactNode } from 'react'

/** A labelled group of rows on one card, as the dashboard lists facts. */
export function Section({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  const { colors } = useTheme()
  return (
    <View style={styles.section}>
      <Label style={styles.label}>{label}</Label>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.panel, borderColor: colors.line },
        ]}
      >
        {children}
      </View>
    </View>
  )
}

/** One fact: a name on the left, its value or control on the right. */
export function Row({
  name,
  detail,
  children,
  first = false,
}: {
  name: string
  detail?: string
  children?: ReactNode
  /** The first row in a section draws no rule above itself. */
  first?: boolean
}) {
  const { colors } = useTheme()
  return (
    <View
      style={[
        styles.row,
        !first && { borderTopWidth: 1, borderTopColor: colors.line },
      ]}
    >
      <View style={styles.name}>
        <Text
          style={[styles.nameText, { color: colors.text }]}
          maxFontSizeMultiplier={1.3}
        >
          {name}
        </Text>
        {detail && (
          <Text
            style={[styles.detail, { color: colors.text3 }]}
            maxFontSizeMultiplier={1.3}
          >
            {detail}
          </Text>
        )}
      </View>
      {children}
    </View>
  )
}

/** A value in a row: mono, so figures and addresses line up. */
export function Value({ children }: { children: string }) {
  const { colors } = useTheme()
  return (
    <Text
      style={[styles.value, { color: colors.text }]}
      numberOfLines={1}
      maxFontSizeMultiplier={1.3}
    >
      {children}
    </Text>
  )
}

/**
 * `.d-ticks`: spent of limit as a row of 24 ticks. Near the limit they turn
 * warn, at it bad.
 */
export function Ticks({ spent, limit }: { spent: number; limit: number }) {
  const { colors } = useTheme()
  const share = limit > 0 ? spent / limit : 0
  const filled = Math.min(24, Math.ceil(share * 24))
  const tone =
    share >= 1 ? colors.bad : share >= 0.8 ? colors.warn : colors.tick
  return (
    <View
      style={styles.ticks}
      accessible
      accessibilityLabel={`$${spent.toFixed(2)} spent of $${limit.toFixed(2)}`}
    >
      {Array.from({ length: 24 }, (_, i) => (
        <View
          key={i}
          style={[
            styles.tick,
            { backgroundColor: i < filled ? tone : colors.panel2 },
          ]}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  section: { marginBottom: 22 },
  label: { marginBottom: 8, paddingHorizontal: 2 },
  card: { borderWidth: 1, borderRadius: radius.card, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  name: { flex: 1, gap: 2 },
  nameText: { fontFamily: fonts.sans, fontWeight: '500', fontSize: 15 },
  detail: { fontFamily: fonts.sans, fontSize: 12.5, lineHeight: 17 },
  value: {
    flexShrink: 1,
    fontFamily: fonts.mono,
    fontWeight: '500',
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  ticks: { flexDirection: 'row', gap: 2 },
  tick: { flex: 1, height: 12, borderRadius: 2 },
})
