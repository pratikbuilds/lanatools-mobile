import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useConversations } from '../agent/store'
import { Button } from '../components/Button'
import { Row, Value } from '../components/Ledger'
import { SheetScreen, SheetTitle } from '../components/SheetHead'
import { Label, Small } from '../components/text'
import { useLanaTools } from '../lanatools/link'
import { ToolError } from '../lanatools/mcp'
import { SignError, signAndSend } from '../lanatools/transactions'
import { MOCK_AGENT, shortAddress, useSession } from '../session/session'
import { isNoWallet, isUserCancel } from '../session/wallet'
import { useTheme } from '../theme/theme'
import { fonts, radius } from '../theme/tokens'
import type { TransactionPart } from '../agent/types'

function remaining(ms: number) {
  if (ms <= 0) return 'Expired'
  const minutes = Math.floor(ms / 60_000)
  const seconds = Math.floor((ms % 60_000) / 1000)
  return minutes > 0 ? `in ${minutes}m ${seconds}s` : `in ${seconds}s`
}

/**
 * Review and sign. The review is LanaTools' own account of the transaction
 * it built, and nothing moves until the user signs here: with the wallet
 * app they signed in with, or for a Google user their LanaTools wallet.
 * LanaTools checks the signed bytes are the ones it built, then sends them.
 */
export default function ReviewTransaction() {
  const { colors } = useTheme()
  const session = useSession()
  const lanatools = useLanaTools()
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
  const [now, setNow] = useState(Date.now)
  const [signing, setSigning] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  if (!part || !messageId) return null
  const signer = session.signer
  const left = part.expiresAt - now
  const expired = left <= 0
  const wrongWallet = !!signer && signer.address !== part.wallet
  const action = part.review.actionLabel
  const signerName =
    signer?.kind === 'wallet' ? 'your wallet app' : 'your LanaTools wallet'

  const settle = (outcome: Parameters<typeof store.settleTransaction>[2]) => {
    store.settleTransaction(messageId, part.id, outcome)
    router.back()
  }

  const sign = async () => {
    setProblem(null)
    setSigning(true)
    try {
      if (MOCK_AGENT) {
        await new Promise((resolve) => setTimeout(resolve, 900))
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        settle({ state: 'sent', signature: '4vJ9mockQe2X' })
        return
      }
      if (!signer) throw new SignError('Sign in to sign this transaction.')
      const access = await lanatools.accessToken()
      if (!access) throw new SignError('Connect LanaTools to send it.')
      const sent = await signAndSend(access.token, part.id, signer)
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      settle({ state: 'sent', signature: sent.signature })
    } catch (error) {
      setSigning(false)
      if (isUserCancel(error)) {
        setProblem(`You cancelled in ${signerName}. Nothing was sent.`)
        return
      }
      console.warn('Signing failed', error)
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      if (isNoWallet(error)) {
        setProblem(
          'No wallet app on this phone answered. Open it and try again.',
        )
        return
      }
      // LanaTools refused it for good: say so in the thread and the agent.
      if (
        error instanceof SignError ||
        (error instanceof ToolError && error.code === 'transaction_expired')
      ) {
        settle({ state: 'failed', error: error.message })
        return
      }
      setProblem(
        error instanceof Error ? error.message : 'Signing failed. Try again.',
      )
    }
  }

  return (
    <SheetScreen context="review">
      <Label>Prepared by LanaTools · Solana mainnet</Label>
      <SheetTitle>{part.review.title}</SheetTitle>
      {part.review.description !== '' && (
        <Small style={styles.description}>{part.review.description}</Small>
      )}

      <View
        style={[
          styles.facts,
          { backgroundColor: colors.panel, borderColor: colors.line },
        ]}
      >
        {part.review.fields.map((field, index) => (
          <Row key={field.label} name={field.label} first={index === 0}>
            <Value>{field.value}</Value>
          </Row>
        ))}
        <Row
          name="Signs and pays the fee"
          first={part.review.fields.length === 0}
        >
          <Value>{shortAddress(part.wallet)}</Value>
        </Row>
        <Row name="Expires">
          <Text
            style={[
              styles.expiry,
              {
                color: expired
                  ? colors.bad
                  : left < 60_000
                    ? colors.warn
                    : colors.text,
              },
            ]}
          >
            {remaining(left)}
          </Text>
        </Row>
      </View>

      {wrongWallet && (
        <Small tone="bad" style={styles.note}>
          {`This was prepared for ${shortAddress(part.wallet)}, not the wallet you're signed in with. Ask your agent to prepare it again.`}
        </Small>
      )}
      {problem && (
        <Small tone="bad" alert style={styles.note}>
          {problem}
        </Small>
      )}
      {!problem && !wrongWallet && (
        <Small style={styles.note}>
          {`Signing opens ${signerName}. LanaTools checks it's this exact transaction, then sends it.`}
        </Small>
      )}

      <Button
        primary
        size="lg"
        label={
          signing
            ? 'Signing…'
            : `${action} with ${signer?.kind === 'wallet' ? 'wallet app' : 'LanaTools wallet'}`
        }
        leading={
          signing ? (
            <ActivityIndicator size="small" color={colors.onAccent} />
          ) : undefined
        }
        disabled={signing || expired || wrongWallet}
        onPress={() => void sign()}
        style={styles.primary}
      />
      <Button
        size="lg"
        label="Decline"
        disabled={signing}
        onPress={() => settle({ state: 'declined' })}
        style={styles.secondary}
      />
    </SheetScreen>
  )
}

const styles = StyleSheet.create({
  description: { marginTop: 6 },
  facts: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: radius.frame,
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
