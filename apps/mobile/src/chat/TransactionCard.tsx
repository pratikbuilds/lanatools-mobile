import { StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { Button } from '../components/Button'
import { StatusDot } from '../components/StatusDot'
import { Hatch } from '../components/surfaces'
import { Label, Small } from '../components/text'
import { useTheme } from '../theme/theme'
import { fonts, radius } from '../theme/tokens'
import type { TransactionPart } from '../agent/types'

/**
 * A transaction the agent prepared and cannot send: the dashboard's hero
 * frame, dashed and hatched, so it is the one focal point in the thread.
 * Signing happens in a sheet that shows what the app decoded.
 */
export function TransactionCard({
  part,
  messageId,
}: {
  part: TransactionPart
  messageId: string
}) {
  const { colors } = useTheme()
  const awaiting = part.state === 'awaiting'
  return (
    <View
      style={[
        styles.frame,
        { borderColor: colors.line2, backgroundColor: colors.bg },
      ]}
    >
      <Hatch />
      <View
        style={[
          styles.inset,
          { backgroundColor: colors.panel, borderColor: colors.line },
        ]}
      >
        <View style={styles.status}>
          <StatusDot
            state={
              awaiting ? 'warn' : part.state === 'signed' ? 'live' : 'idle'
            }
          />
          <Label>
            {awaiting
              ? 'Needs your signature'
              : part.state === 'signed'
                ? 'Signed and sent'
                : 'Declined'}
          </Label>
        </View>
        <Text
          style={[styles.title, { color: colors.text }]}
          maxFontSizeMultiplier={1.3}
        >
          {part.title}
        </Text>

        <View style={styles.amounts}>
          <Amount
            label="You pay"
            amount={part.pay.amount}
            token={part.pay.token}
          />
          <Text style={[styles.arrow, { color: colors.text3 }]}>→</Text>
          <Amount
            label="You receive"
            amount={`≈${part.receive.amount}`}
            token={part.receive.token}
          />
        </View>

        <View style={[styles.facts, { borderTopColor: colors.line }]}>
          <Fact label="Route" value={part.route} />
          <Fact label="Network fee" value={`${part.feeSol} SOL`} />
          <Fact label="Network" value={part.network} />
        </View>

        {awaiting ? (
          <View style={styles.actions}>
            <Button
              primary
              size="lg"
              label="Review and sign"
              onPress={() =>
                router.push({
                  pathname: '/transaction',
                  params: { messageId, partId: part.id },
                })
              }
              style={styles.primary}
            />
          </View>
        ) : part.state === 'signed' ? (
          <Small style={styles.after}>
            Signed on this phone. Signature {part.signature}
          </Small>
        ) : (
          <Small style={styles.after}>Nothing was signed or sent.</Small>
        )}
      </View>
    </View>
  )
}

function Amount({
  label,
  amount,
  token,
}: {
  label: string
  amount: string
  token: string
}) {
  const { colors } = useTheme()
  return (
    <View style={styles.amount}>
      <Label>{label}</Label>
      <Text
        style={[styles.figure, { color: colors.text }]}
        maxFontSizeMultiplier={1.2}
        numberOfLines={1}
      >
        {amount}
        <Text style={[styles.unit, { color: colors.text3 }]}> {token}</Text>
      </Text>
    </View>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme()
  return (
    <View style={styles.fact}>
      <Label>{label}</Label>
      <Text
        style={[styles.factValue, { color: colors.text }]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  frame: {
    padding: 7,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radius.frame,
    overflow: 'hidden',
    marginBottom: 12,
  },
  inset: {
    borderWidth: 1,
    borderRadius: radius.inset,
    padding: 16,
  },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: {
    marginTop: 8,
    fontFamily: fonts.mono,
    fontWeight: '600',
    fontSize: 18,
    letterSpacing: 18 * -0.03,
  },
  amounts: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  amount: { flex: 1, gap: 4 },
  arrow: { fontFamily: fonts.mono, fontSize: 16, paddingBottom: 4 },
  figure: {
    fontFamily: fonts.mono,
    fontWeight: '600',
    fontSize: 22,
    letterSpacing: 22 * -0.04,
    fontVariant: ['tabular-nums'],
  },
  unit: { fontWeight: '500', fontSize: 13, letterSpacing: 0 },
  facts: { marginTop: 16, paddingTop: 12, borderTopWidth: 1, gap: 10 },
  fact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  factValue: { flexShrink: 1, fontFamily: fonts.mono, fontSize: 12.5 },
  actions: { marginTop: 16 },
  primary: { alignSelf: 'stretch' },
  after: { marginTop: 14 },
})
