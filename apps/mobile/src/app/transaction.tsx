import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { ArrowLeftIcon } from 'phosphor-react-native/src/icons/ArrowLeft'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useConversations } from '../agent/store'
import { AppBar, BarIcon, BarTitle } from '../components/AppBar'
import { Button } from '../components/Button'
import { Row, Value } from '../components/Ledger'
import { SheetTitle } from '../components/SheetHead'
import { Label, Small } from '../components/text'
import { useLanaTools } from '../lanatools/link'
import { RetryError, signAndSend } from '../lanatools/transactions'
import { MOCK_AGENT, shortAddress, useSession } from '../session/session'
import { useTheme } from '../theme/theme'
import { fonts, radius } from '../theme/tokens'
import type { TransactionPart } from '../agent/types'
import type { Outcome } from '../lanatools/transactions'

function remaining(ms: number) {
  if (ms <= 0) return 'Expired'
  const minutes = Math.floor(ms / 60_000)
  const seconds = Math.floor((ms % 60_000) / 1000)
  return minutes > 0 ? `in ${minutes}m ${seconds}s` : `in ${seconds}s`
}

/**
 * Review and sign, a page so that every field LanaTools describes fits.
 * The review is LanaTools' own account of the transaction it built, and
 * nothing moves until the user signs here: with the wallet app they signed
 * in with, or for a Google user their LanaTools wallet.
 */
export default function ReviewTransaction() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
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
  const signerName =
    signer?.kind === 'wallet' ? 'your wallet app' : 'your LanaTools wallet'

  const settle = (outcome: Outcome) => {
    store.settleTransaction(messageId, part.id, outcome)
    router.back()
  }

  const sign = async () => {
    setProblem(null)
    setSigning(true)
    try {
      if (MOCK_AGENT) {
        await new Promise((resolve) => setTimeout(resolve, 900))
        settle({ state: 'sent', signature: '4vJ9mockQe2X' })
        return
      }
      if (!signer) throw new RetryError('Sign in to sign this transaction.')
      const outcome = await signAndSend(lanatools.call, part.id, signer)
      void Haptics.notificationAsync(
        outcome.state === 'failed'
          ? Haptics.NotificationFeedbackType.Error
          : Haptics.NotificationFeedbackType.Success,
      )
      settle(outcome)
    } catch (error) {
      // Fixable: say so here and let them try again. Nothing was sent.
      setSigning(false)
      console.warn('Signing stopped', error)
      setProblem(
        error instanceof RetryError
          ? error.message
          : "Couldn't reach LanaTools. Check your connection and try again.",
      )
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <AppBar
        leading={
          <BarIcon
            icon={<ArrowLeftIcon size={22} color={colors.text} />}
            label="Back"
            onPress={() => router.back()}
          />
        }
        title={<BarTitle>Review</BarTitle>}
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24 },
        ]}
      >
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

        <Small
          tone={problem || wrongWallet ? 'bad' : 'text3'}
          alert={!!problem}
          style={styles.note}
        >
          {problem ??
            (wrongWallet
              ? `This was prepared for ${shortAddress(part.wallet)}, not the wallet you're signed in with. Ask your agent to prepare it again.`
              : `Signing opens ${signerName}. LanaTools checks it's this exact transaction, then sends it.`)}
        </Small>

        <Button
          primary
          size="lg"
          label={
            signing
              ? 'Signing…'
              : `${part.review.actionLabel} with ${signer?.kind === 'wallet' ? 'wallet app' : 'LanaTools wallet'}`
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
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 16 },
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
