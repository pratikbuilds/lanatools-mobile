import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useConversations } from '../agent/store'
import { Button } from '../components/Button'
import { Row, Value } from '../components/Ledger'
import { SheetScreen, SheetTitle } from '../components/SheetHead'
import { Label, Small } from '../components/text'
import { shortAddress, useSession } from '../session/session'
import { useTheme } from '../theme/theme'
import { fonts, radius } from '../theme/tokens'
import type { TransactionPart } from '../agent/types'

/**
 * Review and sign. Everything here is what the app decoded from the
 * transaction itself, not the agent's description of it, and nothing is
 * sent until the user signs with their wallet on this phone.
 */
export default function ReviewTransaction() {
  const { colors } = useTheme()
  const session = useSession()
  const store = useConversations()
  const { messageId, partId } = useLocalSearchParams<{
    messageId: string
    partId: string
  }>()
  const part = store.active?.messages
    .find((m) => m.id === messageId)
    ?.parts.find(
      (p): p is TransactionPart => p.type === 'transaction' && p.id === partId,
    )
  const [left, setLeft] = useState(part?.expiresInS ?? 0)
  const [signing, setSigning] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(timer)
  }, [])

  if (!part || !messageId) return null
  const expired = left === 0

  const sign = async () => {
    setSigning(true)
    // The mock wallet signs instantly; Privy's provider replaces this.
    await new Promise((resolve) => setTimeout(resolve, 900))
    store.settleTransaction(messageId, part.id, 'signed')
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    router.back()
  }

  return (
    <SheetScreen context="review">
      <Label>Decoded on this phone</Label>
      <SheetTitle>{part.title}</SheetTitle>

      <View
        style={[
          styles.amounts,
          { backgroundColor: colors.bg, borderColor: colors.line },
        ]}
      >
        <View style={styles.amount}>
          <Label>You pay</Label>
          <Text style={[styles.figure, { color: colors.text }]}>
            {part.pay.amount}
            <Text style={[styles.unit, { color: colors.text3 }]}>
              {' '}
              {part.pay.token}
            </Text>
          </Text>
        </View>
        <View style={[styles.split, { backgroundColor: colors.line }]} />
        <View style={styles.amount}>
          <Label>You receive about</Label>
          <Text style={[styles.figure, { color: colors.text }]}>
            {part.receive.amount}
            <Text style={[styles.unit, { color: colors.text3 }]}>
              {' '}
              {part.receive.token}
            </Text>
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.facts,
          { backgroundColor: colors.panel, borderColor: colors.line },
        ]}
      >
        <Row name="Fee payer" first>
          <Value>
            {session.address ? shortAddress(session.address) : 'Your wallet'}
          </Value>
        </Row>
        <Row name="Route">
          <Value>{part.route}</Value>
        </Row>
        <Row name="Network fee">
          <Value>{`${part.feeSol} SOL`}</Value>
        </Row>
        <Row name="Network">
          <Value>{part.network}</Value>
        </Row>
        <Row name="Expires">
          <Text
            style={[
              styles.expiry,
              {
                color: expired
                  ? colors.bad
                  : left <= 15
                    ? colors.warn
                    : colors.text,
              },
            ]}
          >
            {expired ? 'Expired' : `in ${left}s`}
          </Text>
        </Row>
      </View>

      {expired ? (
        <Small tone="bad" style={styles.note}>
          This transaction expired before it was signed. Ask your agent to build
          it again.
        </Small>
      ) : (
        <Small style={styles.note}>
          Signing sends it to Solana from your wallet. It can&apos;t be undone.
        </Small>
      )}

      {session.status === 'signedIn' ? (
        <Button
          primary
          size="lg"
          label={signing ? 'Signing…' : 'Sign and send'}
          disabled={expired || signing}
          onPress={() => void sign()}
          style={styles.primary}
        />
      ) : (
        <Button
          primary
          size="lg"
          label="Connect wallet to sign"
          onPress={() => router.replace('/sign-in')}
          style={styles.primary}
        />
      )}
      <Button
        size="lg"
        label="Decline"
        disabled={signing}
        onPress={() => {
          store.settleTransaction(messageId, part.id, 'declined')
          router.back()
        }}
        style={styles.secondary}
      />
    </SheetScreen>
  )
}

const styles = StyleSheet.create({
  amounts: {
    flexDirection: 'row',
    marginTop: 18,
    borderWidth: 1,
    borderRadius: radius.card,
    paddingVertical: 14,
  },
  amount: { flex: 1, gap: 6, paddingHorizontal: 14 },
  split: { width: 1 },
  figure: {
    fontFamily: fonts.mono,
    fontWeight: '600',
    fontSize: 24,
    letterSpacing: 24 * -0.04,
    fontVariant: ['tabular-nums'],
  },
  unit: { fontWeight: '500', fontSize: 13, letterSpacing: 0 },
  facts: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  expiry: {
    fontFamily: fonts.mono,
    fontWeight: '600',
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  note: { marginTop: 12 },
  primary: { marginTop: 16 },
  secondary: { marginTop: 10 },
})
