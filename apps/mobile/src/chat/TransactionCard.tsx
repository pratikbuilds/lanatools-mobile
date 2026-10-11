import { useState } from 'react'
import { Linking, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { useConversations } from '../agent/store'
import { useLanaTools } from '../lanatools/link'
import { RetryError, checkStatus } from '../lanatools/transactions'
import { Button } from '../components/Button'
import { StatusDot } from '../components/StatusDot'
import { Hatch } from '../components/surfaces'
import { Label, Small } from '../components/text'
import { useTheme } from '../theme/theme'
import { fonts, radius } from '../theme/tokens'
import type { TransactionPart } from '../agent/types'
import type { DotState } from '../components/StatusDot'

const STATUS: Record<
  TransactionPart['state'],
  { dot: DotState; text: string }
> = {
  awaiting: { dot: 'warn', text: 'Needs your signature' },
  sent: { dot: 'live', text: 'Signed and sent' },
  pending: { dot: 'warn', text: 'Signed · confirming' },
  declined: { dot: 'idle', text: 'Declined' },
  failed: { dot: 'bad', text: 'Not sent' },
}

/** How many of LanaTools' review fields the card shows; the sheet has all. */
const SHOWN = 4

/**
 * A transaction LanaTools prepared for this phone to sign: the dashboard's
 * hero frame, dashed and hatched, so it is the one focal point in the
 * thread. It reads LanaTools' own review of the transaction; signing
 * happens in a sheet.
 */
export function TransactionCard({
  part,
  messageId,
}: {
  part: TransactionPart
  messageId: string
}) {
  const { colors } = useTheme()
  const lanatools = useLanaTools()
  const store = useConversations()
  const [checking, setChecking] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const status = STATUS[part.state]

  // A pending transaction may still land: ask LanaTools what became of it.
  const check = async () => {
    setChecking(true)
    setNote(null)
    try {
      const outcome = await checkStatus(lanatools.call, part.id)
      if (outcome && outcome.state !== 'pending')
        store.settleTransaction(messageId, part.id, outcome)
      else setNote('Still confirming. Check again in a moment.')
    } catch (error) {
      setNote(
        error instanceof RetryError
          ? error.message
          : "Couldn't reach LanaTools. Try again.",
      )
    } finally {
      setChecking(false)
    }
  }
  const fields = part.review.fields.slice(0, SHOWN)
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
          <StatusDot state={status.dot} />
          <Label>{status.text}</Label>
        </View>
        <Text
          style={[styles.title, { color: colors.text }]}
          maxFontSizeMultiplier={1.3}
        >
          {part.review.title}
        </Text>
        {part.review.description !== '' && (
          <Small style={styles.description}>{part.review.description}</Small>
        )}

        {fields.length > 0 && (
          <View style={[styles.fields, { borderTopColor: colors.line }]}>
            {fields.map((field) => (
              <View key={field.label} style={styles.field}>
                <Text
                  style={[styles.fieldLabel, { color: colors.text3 }]}
                  maxFontSizeMultiplier={1.3}
                >
                  {field.label}
                </Text>
                <Text
                  style={[styles.fieldValue, { color: colors.text }]}
                  maxFontSizeMultiplier={1.3}
                >
                  {field.value}
                </Text>
              </View>
            ))}
          </View>
        )}

        {part.state === 'awaiting' ? (
          <Button
            primary
            size="lg"
            label={`Review and ${part.review.actionLabel.toLowerCase()}`}
            onPress={() =>
              router.push({
                pathname: '/transaction',
                params: { messageId, partId: part.id },
              })
            }
            style={styles.action}
          />
        ) : part.state === 'sent' && part.signature ? (
          <Button
            size="lg"
            label="View on Solscan"
            trailing="↗"
            onPress={() =>
              void Linking.openURL(`https://solscan.io/tx/${part.signature}`)
            }
            style={styles.action}
          />
        ) : part.state === 'pending' ? (
          <>
            <Button
              size="lg"
              label={checking ? 'Checking…' : 'Check status'}
              disabled={checking}
              onPress={() => void check()}
              style={styles.action}
            />
            <Small style={styles.note}>
              {note ??
                'LanaTools has it but hasn’t confirmed it yet. It may still land, so don’t sign it again.'}
            </Small>
          </>
        ) : part.state === 'failed' && part.error ? (
          <Small tone="bad" style={styles.note}>
            {part.error}
          </Small>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  frame: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radius.frame,
    padding: 8,
    marginBottom: 14,
    overflow: 'hidden',
  },
  inset: { borderWidth: 1, borderRadius: radius.card, padding: 16 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: {
    marginTop: 8,
    fontFamily: fonts.mono,
    fontWeight: '600',
    fontSize: 19,
    letterSpacing: 19 * -0.03,
  },
  description: { marginTop: 6 },
  fields: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, gap: 8 },
  field: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 16,
  },
  fieldLabel: { fontFamily: fonts.sans, fontSize: 13.5 },
  fieldValue: {
    flexShrink: 1,
    textAlign: 'right',
    fontFamily: fonts.mono,
    fontWeight: '500',
    fontSize: 13.5,
    fontVariant: ['tabular-nums'],
  },
  action: { marginTop: 16 },
  note: { marginTop: 12 },
})
