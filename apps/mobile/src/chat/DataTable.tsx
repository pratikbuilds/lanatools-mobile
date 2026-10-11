import { StyleSheet, Text, View } from 'react-native'
import { SolanaMark } from '../brand/marks'
import { useTheme } from '../theme/theme'
import { fonts, radius } from '../theme/tokens'
import * as type from '../theme/type'
import { UsdcMark } from '../wallet/WalletChip'
import type { ReactNode } from 'react'

// A markdown table from the agent, drawn for a phone instead of as a grid.
//
// The agent writes an ordinary table, name first and the figure that
// matters last. Each row becomes a list item: a badge for the thing, its
// name, the columns between as small labelled details, and the last column
// large on the right. A two-column table is a list of labels and values.

export type Cell = { text: string; node: ReactNode }

/** A figure: amounts, prices, percentages, with an optional unit. */
export const FIGURE = /^[\s$€£+\-−~≈]*[\d.,]+\s*[%A-Za-z]{0,5}$/

/** A loss or a fall: coral, as on the dashboard. */
const NEGATIVE = /^\s*[-−]/

/** A token symbol worth a badge: SOL, USDC, JUP, BONK, mSOL. */
const SYMBOL = /^\$?[A-Za-z0-9]{2,6}$/

function Badge({ symbol }: { symbol: string }) {
  const { colors } = useTheme()
  const upper = symbol.replace(/^\$/, '').toUpperCase()
  if (upper === 'USDC') return <UsdcMark size={30} />
  if (upper === 'SOL')
    return (
      <View style={[styles.badge, { backgroundColor: colors.text }]}>
        <SolanaMark size={14} color={colors.panel} />
      </View>
    )
  return (
    <View style={[styles.badge, { backgroundColor: colors.panel2 }]}>
      <Text style={[styles.monogram, { color: colors.text2 }]}>
        {upper.slice(0, upper.length > 4 ? 3 : 4)}
      </Text>
    </View>
  )
}

/** label → value, for a two-column table. */
function Pairs({ rows }: { rows: Cell[][] }) {
  const { colors } = useTheme()
  return (
    <View
      style={[
        styles.frame,
        { borderColor: colors.line, backgroundColor: colors.panel },
      ]}
    >
      {rows.map(([label, value], r) => (
        <View
          key={r}
          style={[
            styles.pair,
            r > 0 && { borderTopWidth: 1, borderTopColor: colors.line },
          ]}
        >
          <Text
            style={[styles.pairLabel, { color: colors.text2 }]}
            maxFontSizeMultiplier={1.3}
          >
            {label?.node}
          </Text>
          <Text
            style={[
              value && FIGURE.test(value.text) ? styles.figure : styles.value,
              styles.pairValue,
              {
                color:
                  value && NEGATIVE.test(value.text) ? colors.bad : colors.text,
              },
            ]}
            maxFontSizeMultiplier={1.3}
          >
            {value?.node}
          </Text>
        </View>
      ))}
    </View>
  )
}

/** One item per row: badge, name, details, and the figure on the right. */
function Items({ head, rows }: { head: string[]; rows: Cell[][] }) {
  const { colors } = useTheme()
  const badges = rows.every((row) => SYMBOL.test(row[0]?.text.trim() ?? ''))
  return (
    <View
      style={[
        styles.frame,
        { borderColor: colors.line, backgroundColor: colors.panel },
      ]}
    >
      {rows.map((row, r) => {
        const [first, ...rest] = row
        const last = rest.at(-1)
        const middle = rest.slice(0, -1)
        return (
          <View
            key={r}
            style={[
              styles.item,
              r > 0 && { borderTopWidth: 1, borderTopColor: colors.line },
            ]}
          >
            {badges && first && <Badge symbol={first.text.trim()} />}
            <View style={styles.itemText}>
              <Text
                style={[styles.name, { color: colors.text }]}
                maxFontSizeMultiplier={1.3}
              >
                {first?.node}
              </Text>
              {middle.length > 0 && (
                // Each detail wraps as a whole: its label and its value.
                <View style={styles.details}>
                  {middle.map((cell, i) => (
                    <Text
                      key={i}
                      style={[styles.detailLabel, { color: colors.text3 }]}
                      maxFontSizeMultiplier={1.3}
                    >
                      {head[i + 1] ? `${head[i + 1]} ` : ''}
                      <Text
                        style={[
                          styles.detailValue,
                          {
                            color: NEGATIVE.test(cell.text)
                              ? colors.bad
                              : colors.text2,
                          },
                        ]}
                      >
                        {cell.node}
                      </Text>
                    </Text>
                  ))}
                </View>
              )}
            </View>
            {last && (
              <View style={styles.trailing}>
                <Text
                  style={[
                    FIGURE.test(last.text) ? styles.lead : styles.value,
                    {
                      color: NEGATIVE.test(last.text)
                        ? colors.bad
                        : colors.text,
                    },
                  ]}
                  maxFontSizeMultiplier={1.3}
                >
                  {last.node}
                </Text>
                {head.at(-1) && rest.length > 0 && (
                  <Text style={[type.label, { color: colors.text3 }]}>
                    {head.at(-1)}
                  </Text>
                )}
              </View>
            )}
          </View>
        )
      })}
    </View>
  )
}

/**
 * The agent's table. `head` is the header row's text, `rows` each row's
 * cells (rendered inline content plus plain text, to recognise figures).
 */
export function DataTable({ head, rows }: { head: string[]; rows: Cell[][] }) {
  return head.length === 2 ? (
    <Pairs rows={rows} />
  ) : (
    <Items head={head} rows={rows} />
  )
}

const styles = StyleSheet.create({
  frame: {
    borderWidth: 1,
    borderRadius: radius.frame,
    overflow: 'hidden',
    marginBottom: 12,
  },
  pair: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pairLabel: { flexShrink: 1, fontFamily: fonts.sans, fontSize: 14.5 },
  pairValue: { flexShrink: 1, textAlign: 'right' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  badge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monogram: {
    fontFamily: fonts.mono,
    fontWeight: '700',
    fontSize: 9.5,
    letterSpacing: 0.2,
  },
  itemText: { flex: 1, gap: 3 },
  name: { fontFamily: fonts.sans, fontWeight: '600', fontSize: 15.5 },
  details: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 2 },
  detailLabel: { fontFamily: fonts.sans, fontSize: 12.5, lineHeight: 18 },
  detailValue: {
    fontFamily: fonts.mono,
    fontWeight: '500',
    fontSize: 12.5,
    fontVariant: ['tabular-nums'],
  },
  trailing: { alignItems: 'flex-end', gap: 2 },
  lead: {
    fontFamily: fonts.mono,
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: 16 * -0.02,
    fontVariant: ['tabular-nums'],
  },
  figure: {
    fontFamily: fonts.mono,
    fontWeight: '500',
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  value: { fontFamily: fonts.sans, fontWeight: '500', fontSize: 14.5 },
})
