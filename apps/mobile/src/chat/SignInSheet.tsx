import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { XIcon } from 'phosphor-react-native/src/icons/X'
import { BrandMark } from '../brand/BrandMark'
import { GoogleMark, SolanaMark } from '../brand/marks'
import { Button } from '../components/Button'
import { Sheet } from '../components/Sheet'
import { Hatch } from '../components/surfaces'
import { Body, Label, Mono, Small } from '../components/text'
import { useSession } from '../session/session'
import { useTheme } from '../theme/theme'
import { fonts, radius } from '../theme/tokens'
import * as type from '../theme/type'

/**
 * Sign in when the agent is first needed, never before. The web sign-in card
 * (lanatools/apps/web/src/routes/sign-in.tsx) as a sheet, with the wallet on
 * this phone in place of the browser wallets.
 */
export function SignInSheet({
  open,
  onClose,
  waiting,
}: {
  open: boolean
  onClose: () => void
  /** A message is waiting to be sent once the user signs in. */
  waiting: boolean
}) {
  const { colors } = useTheme()
  const session = useSession()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const disabled = busy || session.unavailable !== null

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
    <Sheet open={open} onClose={onClose} label="Connect your wallet">
      <View style={[styles.head, { borderColor: colors.line }]}>
        <Hatch />
        <BrandMark size={18} color={colors.text} />
        <Mono size={13} weight="700">
          lanatools.sh
        </Mono>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={10}
          style={({ pressed }) => [
            styles.close,
            { backgroundColor: pressed ? colors.panel2 : 'transparent' },
          ]}
        >
          <XIcon size={18} color={colors.text2} />
        </Pressable>
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

        <Pressable
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
          style={({ pressed }) => [
            styles.wallet,
            {
              borderColor: colors.line,
              backgroundColor: pressed ? colors.bg : colors.panel,
              opacity: disabled ? 0.5 : 1,
            },
          ]}
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
        </Pressable>

        <Small style={styles.footnote}>
          A wallet sign-in verifies ownership with a message. No funds move.
        </Small>
        {(message || session.unavailable) && (
          <Small tone="bad" alert style={styles.error}>
            {message || session.unavailable}
          </Small>
        )}
      </View>
    </Sheet>
  )
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 46,
    marginTop: 6,
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
