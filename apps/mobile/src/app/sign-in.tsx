import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { GoogleMark, SolanaMark } from '../brand/marks'
import { useConversations } from '../agent/store'
import { useDraft } from '../chat/draft'
import { Button } from '../components/Button'
import { SheetScreen, SheetTitle } from '../components/SheetHead'
import { Body, Label, Small } from '../components/text'
import { useSession } from '../session/session'
import { useTheme } from '../theme/theme'

/**
 * Sign in when the agent is first needed, never before: the web sign-in card
 * (lanatools/apps/web/src/routes/sign-in.tsx) as a native form sheet, with
 * the wallet on this phone in place of the browser wallets.
 */
export default function SignIn() {
  const { colors } = useTheme()
  const session = useSession()
  const draft = useDraft()
  const store = useConversations()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const disabled = busy || session.unavailable !== null
  const waiting = draft.waiting && draft.text.trim().length > 0

  async function run(signIn: () => Promise<void>, failure: string) {
    setMessage('')
    setBusy(true)
    try {
      await signIn()
    } catch {
      setMessage(failure)
      setBusy(false)
      return
    }
    setBusy(false)
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    router.back()
    // The message that asked for sign-in goes out now.
    if (waiting) {
      store.send(draft.text)
      draft.setText('')
      draft.setWaiting(false)
    }
  }

  return (
    <SheetScreen>
      <Label>Sign in · Create account</Label>
      <SheetTitle>Connect your wallet</SheetTitle>
      <Body style={styles.lede}>
        {waiting
          ? 'Your agent works from your LanaTools account and wallet. Sign in and your message sends.'
          : 'Your agent works from your LanaTools account and wallet. Use the account you have on lanatools.sh, or create one.'}
      </Body>

      {/* One focal point: the wallet on this phone is the quickest way
            in on a Seeker, so it is the only filled control. */}
      <Button
        primary
        size="lg"
        label={busy ? 'Signing in…' : 'Continue with Seeker wallet'}
        leading={<SolanaMark size={15} color={colors.onAccent} />}
        accessibilityHint="Signs in with the wallet on this phone"
        disabled={disabled}
        onPress={() =>
          void run(
            session.signInWithWallet,
            'Wallet sign-in failed. Check your wallet and try again.',
          )
        }
        style={styles.primary}
      />

      <View style={styles.divider}>
        <View style={[styles.hair, { backgroundColor: colors.line }]} />
        <Label>Or</Label>
        <View style={[styles.hair, { backgroundColor: colors.line }]} />
      </View>

      <Button
        size="lg"
        label="Continue with Google"
        leading={<GoogleMark />}
        disabled={disabled}
        onPress={() =>
          void run(
            session.signInWithGoogle,
            'Google sign-in failed. Try again.',
          )
        }
      />

      <Small style={styles.footnote}>
        A wallet sign-in verifies ownership with a message. No funds move.
      </Small>
      {(message || session.unavailable) && (
        <Small tone="bad" alert style={styles.error}>
          {message || session.unavailable}
        </Small>
      )}
    </SheetScreen>
  )
}

const styles = StyleSheet.create({
  lede: { marginTop: 8 },
  primary: { marginTop: 22 },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 14,
  },
  hair: { flex: 1, height: 1 },
  footnote: { marginTop: 16 },
  error: { marginTop: 8 },
})
