import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { GoogleMark } from '../brand/marks'
import { useConversations } from '../agent/store'
import { useDraft } from '../chat/draft'
import { Button } from '../components/Button'
import { PressableScale } from '../components/PressableScale'
import { SheetScreen, SheetTitle } from '../components/SheetHead'
import { Body, Label, Small } from '../components/text'
import { useSession } from '../session/session'
import { isNoWallet, isUserCancel } from '../session/wallet'
import { useTheme } from '../theme/theme'
import { fonts, radius } from '../theme/tokens'

// The wallets the web sign-in card lists. On Android any wallet app that
// speaks Mobile Wallet Adapter answers, so they share one row.
const WALLETS = [
  require('../../assets/wallets/phantom.png'),
  require('../../assets/wallets/solflare.png'),
  require('../../assets/wallets/backpack.png'),
]

type Method = 'google' | 'wallet'

/**
 * Sign in when the agent is first needed, never before: the web sign-in card
 * (lanatools/apps/web/src/routes/_account/sign-in.tsx) as a native form
 * sheet. Google, or any Solana wallet app on the phone over Mobile Wallet
 * Adapter. Either way the agent works from the account's embedded wallet,
 * so the sheet stays until that wallet is ready.
 */
export default function SignIn() {
  const session = useSession()
  const draft = useDraft()
  const store = useConversations()
  const [pending, setPending] = useState<Method | null>(null)
  const [message, setMessage] = useState('')
  const waiting = draft.waiting && draft.text.trim().length > 0
  // After Privy signs the user in, the embedded wallet is still opening.
  const preparing = pending !== null && session.status === 'loading'
  const disabled =
    pending !== null ||
    session.status === 'loading' ||
    session.unavailable !== null

  // Close once, even though the draft changes as the message goes out.
  const done = useRef(false)
  useEffect(() => {
    if (!pending || session.status !== 'signedIn' || done.current) return
    done.current = true
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    router.back()
    // The message that asked for sign-in goes out now.
    if (waiting) {
      store.send(draft.text)
      draft.setText('')
      draft.setWaiting(false)
    }
  }, [pending, session.status, waiting, store, draft])

  async function run(method: Method) {
    setMessage('')
    setPending(method)
    try {
      await (method === 'google'
        ? session.signInWithGoogle()
        : session.signInWithWallet())
    } catch (error) {
      setPending(null)
      if (isUserCancel(error)) return
      // The sheet shows a short message; the cause goes to the logs.
      console.warn(`${method} sign-in failed`, error)
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      setMessage(failure(method, error))
    }
  }

  if (session.walletError)
    return (
      <WalletProblem
        message={session.walletError.message}
        action={session.walletError.action}
        onRetry={session.retryWallet}
        onSignOut={() => void session.signOut()}
      />
    )

  return (
    <SheetScreen>
      <Label>Sign in · Create account</Label>
      <SheetTitle>Sign in to LanaTools</SheetTitle>
      <Body style={styles.lede}>
        {waiting
          ? 'Your agent works from your LanaTools account. Sign in and your message sends.'
          : 'Use the account you have on lanatools.sh, or create one. Your agent works from its wallet.'}
      </Body>

      <Button
        size="lg"
        label={
          pending === 'google'
            ? preparing
              ? 'Setting up your wallet…'
              : 'Signing in…'
            : 'Continue with Google'
        }
        leading={<GoogleMark size={18} />}
        disabled={disabled}
        onPress={() => void run('google')}
        style={styles.google}
      />

      <View style={styles.divider}>
        <Hair />
        <Label>Or use a Solana wallet</Label>
        <Hair />
      </View>

      <WalletRow
        state={
          pending === 'wallet' ? (preparing ? 'preparing' : 'signing') : 'idle'
        }
        disabled={disabled}
        onPress={() => void run('wallet')}
      />

      <Footnote>
        A wallet sign-in verifies ownership with a message. No funds move.
      </Footnote>
      {(message || session.unavailable) && (
        <Small tone="bad" alert style={styles.error}>
          {message || session.unavailable}
        </Small>
      )}
    </SheetScreen>
  )
}

function failure(method: Method, error: unknown) {
  if (method === 'google') return 'Google sign-in failed. Try again.'
  if (isNoWallet(error))
    return 'No wallet app on this phone can sign in. Install a Solana wallet such as Phantom or Solflare, or continue with Google.'
  return 'Wallet sign-in failed. Check your wallet and try again.'
}

/**
 * One row for every wallet app on the phone: Android asks the user which
 * one to open when there is more than one.
 */
function WalletRow({
  state,
  disabled,
  onPress,
}: {
  state: 'idle' | 'signing' | 'preparing'
  disabled: boolean
  onPress: () => void
}) {
  const { colors } = useTheme()
  const title =
    state === 'signing'
      ? 'Waiting for your wallet…'
      : state === 'preparing'
        ? 'Setting up your wallet…'
        : 'Solana wallet'
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint="Opens a wallet app on this phone to sign in"
      accessibilityState={{ disabled, busy: state !== 'idle' }}
      style={[
        styles.wallet,
        { backgroundColor: colors.panel, borderColor: colors.line2 },
        disabled && state === 'idle' && styles.dim,
      ]}
      pressedStyle={{ borderColor: colors.text3 }}
    >
      <View style={styles.logos}>
        {WALLETS.map((source, i) => (
          // A panel-coloured ring keeps each tile apart where they overlap;
          // the hairline gives white logos an edge.
          <View
            key={i}
            style={[
              styles.ring,
              { backgroundColor: colors.panel, zIndex: WALLETS.length - i },
              i > 0 && styles.overlap,
            ]}
          >
            <Image
              source={source}
              style={[styles.logo, { borderColor: colors.line }]}
            />
          </View>
        ))}
      </View>
      <View style={styles.walletText}>
        <Text
          style={[styles.walletName, { color: colors.text }]}
          maxFontSizeMultiplier={1.3}
        >
          {title}
        </Text>
        <Small>Opens any wallet app on this phone</Small>
      </View>
      {state === 'idle' ? (
        <Text style={[styles.arrow, { color: colors.text3 }]}>→</Text>
      ) : (
        <ActivityIndicator size="small" color={colors.text3} />
      )}
    </PressableScale>
  )
}

/** Signed in, but the embedded wallet would not open or be created. */
function WalletProblem({
  message,
  action,
  onRetry,
  onSignOut,
}: {
  message: string
  action: 'create' | 'recover'
  onRetry: () => void
  onSignOut: () => void
}) {
  return (
    <SheetScreen>
      <Label tone="bad">Wallet unavailable</Label>
      <SheetTitle>Your wallet didn’t open</SheetTitle>
      <Body style={styles.lede}>{message}</Body>
      <Button
        primary
        size="lg"
        label={action === 'recover' ? 'Recover wallet' : 'Try again'}
        onPress={onRetry}
        style={styles.google}
      />
      <Button label="Sign out" onPress={onSignOut} style={styles.secondary} />
    </SheetScreen>
  )
}

function Hair() {
  const { colors } = useTheme()
  return <View style={[styles.hair, { backgroundColor: colors.line }]} />
}

function Footnote({ children }: { children: string }) {
  const { colors } = useTheme()
  return (
    <View style={[styles.footnote, { borderTopColor: colors.line }]}>
      <Small>{children}</Small>
    </View>
  )
}

const styles = StyleSheet.create({
  lede: { marginTop: 8 },
  google: { marginTop: 22 },
  secondary: { marginTop: 10 },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 16,
  },
  hair: { flex: 1, height: 1 },
  wallet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: radius.card,
  },
  dim: { opacity: 0.5 },
  logos: { flexDirection: 'row' },
  ring: { padding: 2, borderRadius: 10 },
  logo: { width: 28, height: 28, borderRadius: 8, borderWidth: 1 },
  overlap: { marginLeft: -10 },
  walletText: { flex: 1, gap: 2 },
  walletName: {
    fontFamily: fonts.mono,
    fontWeight: '600',
    fontSize: 13.5,
  },
  arrow: { fontFamily: fonts.mono, fontSize: 15 },
  footnote: { marginTop: 18, paddingTop: 14, borderTopWidth: 1 },
  error: { marginTop: 8 },
})
