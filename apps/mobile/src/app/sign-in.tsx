import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { XIcon } from 'phosphor-react-native/src/icons/X'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BrandMark } from '../brand/BrandMark'
import { GoogleMark, SolanaMark } from '../brand/marks'
import { useDraft } from '../chat/draft'
import { Button } from '../components/Button'
import { PressableScale } from '../components/PressableScale'
import { Hatch } from '../components/surfaces'
import { Body, Label, Mono, Small } from '../components/text'
import { useSession } from '../session/session'
import { useTheme } from '../theme/theme'
import { fonts, radius } from '../theme/tokens'
import * as type from '../theme/type'

/**
 * Sign in when the agent is first needed, never before: the web sign-in card
 * (lanatools/apps/web/src/routes/sign-in.tsx) as a native form sheet, with
 * the wallet on this phone in place of the browser wallets.
 */
export default function SignIn() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const session = useSession()
  const draft = useDraft()
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
    } finally {
      setBusy(false)
    }
  }

  return (
    <View
      style={[
        styles.sheet,
        { backgroundColor: colors.panel, paddingBottom: insets.bottom + 16 },
      ]}
    >
      {/* Android's form sheet draws no grabber; this is the drag cue. */}
      <View style={[styles.grabber, { backgroundColor: colors.line2 }]} />
      <View style={[styles.head, { borderColor: colors.line }]}>
        <Hatch />
        <BrandMark size={18} color={colors.text} />
        <Mono size={13} weight="700">
          lanatools.sh
        </Mono>
        <PressableScale
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={10}
          style={styles.close}
          pressedStyle={{ backgroundColor: colors.panel2 }}
        >
          <XIcon size={18} color={colors.text2} />
        </PressableScale>
      </View>

      <View style={styles.body}>
        <Label>Sign in · Create account</Label>
        <Text
          style={[styles.title, { color: colors.text }]}
          accessibilityRole="header"
          maxFontSizeMultiplier={1.3}
        >
          Connect your wallet
        </Text>
        <Body style={styles.lede}>
          {waiting
            ? 'Your agent works from your LanaTools account and wallet. Sign in and your message sends.'
            : 'Your agent works from your LanaTools account and wallet. Use the account you have on lanatools.sh, or create one.'}
        </Body>

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
          style={styles.google}
        />

        <View style={styles.divider}>
          <View style={[styles.hair, { backgroundColor: colors.line }]} />
          <Label>Or use a Solana wallet</Label>
          <View style={[styles.hair, { backgroundColor: colors.line }]} />
        </View>

        <PressableScale
          disabled={disabled}
          onPress={() =>
            void run(
              session.signInWithWallet,
              'Wallet sign-in failed. Check your wallet and try again.',
            )
          }
          accessibilityRole="button"
          accessibilityLabel="Seeker wallet"
          accessibilityHint="Signs in with the wallet on this phone"
          accessibilityState={{ disabled }}
          style={[
            styles.wallet,
            {
              borderColor: colors.line,
              backgroundColor: colors.panel,
              opacity: disabled ? 0.5 : 1,
            },
          ]}
          pressedStyle={{ borderColor: colors.line2 }}
        >
          <View style={[styles.walletTile, { backgroundColor: colors.text }]}>
            <SolanaMark size={15} color={colors.panel} />
          </View>
          <View style={styles.walletText}>
            <Mono size={13.5} weight="600">
              Seeker wallet
            </Mono>
            <Small>The wallet on this phone</Small>
          </View>
          <Text style={[type.button, { color: colors.text3 }]}>→</Text>
        </PressableScale>

        <Small style={styles.footnote}>
          A wallet sign-in verifies ownership with a message. No funds move.
        </Small>
        {(message || session.unavailable) && (
          <Small tone="bad" alert style={styles.error}>
            {message || session.unavailable}
          </Small>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  sheet: { paddingTop: 10 },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    marginBottom: 10,
    borderRadius: 2,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 46,
    paddingLeft: 20,
    paddingRight: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  close: {
    marginLeft: 'auto',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { paddingHorizontal: 20, paddingTop: 20 },
  title: {
    marginTop: 10,
    fontFamily: fonts.mono,
    fontWeight: '600',
    fontSize: 22,
    lineHeight: 27,
    letterSpacing: 22 * -0.04,
  },
  lede: { marginTop: 8 },
  google: { marginTop: 22 },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 18,
  },
  hair: { flex: 1, height: 1 },
  wallet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 60,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: radius.card,
  },
  walletTile: {
    width: 32,
    height: 32,
    borderRadius: radius.field,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletText: { flex: 1, gap: 2 },
  footnote: { marginTop: 16 },
  error: { marginTop: 8 },
})
