import { useState } from 'react'
import {
  ActivityIndicator,
  Linking,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import * as Haptics from 'expo-haptics'
import { Button } from '../components/Button'
import { SheetScreen, SheetTitle } from '../components/SheetHead'
import { Label, Small } from '../components/text'
import { useSession } from '../session/session'
import { useTheme } from '../theme/theme'
import { fonts, radius } from '../theme/tokens'
import { formatSol, formatUsdc } from '../wallet/balances'
import { useBalances } from '../wallet/provider'

/**
 * The LanaTools wallet: its full address, to copy, and what it holds. This
 * is the wallet the agent pays from and the one lanatools.sh shows.
 */
export default function Wallet() {
  const { colors } = useTheme()
  const session = useSession()
  const { balances, loading, error, refresh } = useBalances()
  const [copied, setCopied] = useState(false)
  const address = session.address

  if (!address)
    return (
      <SheetScreen context="wallet">
        <SheetTitle>No wallet yet</SheetTitle>
        <Small>Sign in to see your LanaTools wallet.</Small>
      </SheetScreen>
    )

  return (
    <SheetScreen context="wallet">
      <Label>LanaTools wallet · Solana mainnet</Label>
      <SheetTitle>Your wallet</SheetTitle>

      <View
        style={[
          styles.card,
          { backgroundColor: colors.panel, borderColor: colors.line },
        ]}
      >
        <View style={styles.balances}>
          {(
            [
              ['SOL', balances && formatSol(balances.sol)],
              ['USDC', balances && formatUsdc(balances.usdc)],
            ] as const
          ).map(([token, amount]) => (
            <View key={token} style={styles.balance}>
              <Label>{token}</Label>
              <Text
                style={[styles.amount, { color: colors.text }]}
                maxFontSizeMultiplier={1.2}
              >
                {amount ?? '—'}
              </Text>
            </View>
          ))}
        </View>
        <View style={[styles.address, { borderTopColor: colors.line }]}>
          <Label>Address</Label>
          <Text style={[styles.addressText, { color: colors.text }]} selectable>
            {address}
          </Text>
        </View>
      </View>

      {error && (
        <Small tone="bad" style={styles.note}>
          {"Couldn't read the balance. Showing the last one, if any."}
        </Small>
      )}

      <View style={styles.actions}>
        <Button
          primary
          size="lg"
          label={copied ? 'Copied' : 'Copy address'}
          onPress={() => {
            void Clipboard.setStringAsync(address)
            void Haptics.selectionAsync()
            setCopied(true)
            setTimeout(() => setCopied(false), 1400)
          }}
        />
        <View style={styles.row}>
          <Button
            size="lg"
            label="Refresh"
            leading={
              loading ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : undefined
            }
            disabled={loading}
            onPress={refresh}
            style={styles.half}
          />
          <Button
            size="lg"
            label="Solscan"
            trailing="↗"
            onPress={() =>
              void Linking.openURL(`https://solscan.io/account/${address}`)
            }
            style={styles.half}
          />
        </View>
      </View>
    </SheetScreen>
  )
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: radius.frame,
    overflow: 'hidden',
  },
  balances: { flexDirection: 'row', padding: 16, gap: 16 },
  balance: { flex: 1, gap: 6 },
  amount: {
    fontFamily: fonts.mono,
    fontWeight: '600',
    fontSize: 26,
    letterSpacing: 26 * -0.04,
    fontVariant: ['tabular-nums'],
  },
  address: { borderTopWidth: 1, padding: 16, gap: 6 },
  addressText: { fontFamily: fonts.mono, fontSize: 13, lineHeight: 19 },
  note: { marginTop: 10 },
  actions: { marginTop: 16, gap: 10 },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
})
