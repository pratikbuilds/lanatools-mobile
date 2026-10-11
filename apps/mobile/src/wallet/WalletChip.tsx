import { StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import Svg, { Circle, Path } from 'react-native-svg'
import { PressableScale } from '../components/PressableScale'
import { useTheme } from '../theme/theme'
import { fonts, radius } from '../theme/tokens'
import { formatUsdc } from './balances'
import { useBalances } from './provider'

/** USDC's mark: the blue coin with its dollar and two arcs. */
export function UsdcMark({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Circle cx={16} cy={16} r={16} fill="#2775CA" />
      <Path
        d="M20.4 18.5c0-2.3-1.4-3.1-4.2-3.4-2-.3-2.4-.8-2.4-1.7s.7-1.5 2-1.5c1.2 0 1.8.4 2.2 1.4.1.2.2.3.4.3h1.1c.3 0 .5-.2.5-.5-.3-1.5-1.5-2.6-3-2.8V8.8c0-.3-.2-.5-.6-.5h-1c-.3 0-.5.2-.6.5v1.5c-2 .3-3.2 1.6-3.2 3.3 0 2.2 1.3 3 4.1 3.4 1.8.3 2.4.7 2.4 1.8 0 1-.9 1.7-2.1 1.7-1.7 0-2.2-.7-2.4-1.6-.1-.3-.3-.4-.5-.4h-1.1c-.3 0-.5.2-.5.5.3 1.6 1.3 2.7 3.4 3v1.5c0 .3.2.5.6.5h1c.3 0 .5-.2.6-.5v-1.5c2-.3 3.3-1.7 3.3-3.5z"
        fill="#fff"
      />
      <Path
        d="M12.8 25.2c-5.1-1.8-7.8-7.5-5.9-12.6 1-2.8 3.1-4.9 5.9-5.9.3-.1.4-.3.4-.6v-.9c0-.3-.1-.5-.4-.5h-.1C6.6 6.6 3.1 13.4 5 19.3c1.1 3.5 3.8 6.2 7.3 7.3.3.1.6 0 .6-.3l.1-.1v-.9c0-.2-.2-.5-.4-.6zm6.5-20.1c-.3-.1-.6 0-.6.3l-.1.1v.9c0 .3.2.5.4.6 5.1 1.8 7.8 7.5 5.9 12.6-1 2.8-3.1 4.9-5.9 5.9-.3.1-.4.3-.4.6v.9c0 .3.1.5.4.5h.1c5.9-1.9 9.3-8.7 7.4-14.6-1.1-3.5-3.9-6.2-7.4-7.3z"
        fill="#fff"
      />
    </Svg>
  )
}

/**
 * The wallet's USDC, always in view at the top right: the money the agent
 * spends. Opens the wallet sheet, with the address and SOL.
 */
export function WalletChip() {
  const { colors } = useTheme()
  const { balances, error } = useBalances()
  const amount = balances ? formatUsdc(balances.usdc) : error ? '—' : '…'

  return (
    <PressableScale
      onPress={() => router.push('/wallet')}
      accessibilityRole="button"
      accessibilityLabel={
        balances ? `${amount} USDC. Wallet` : 'Wallet, balance loading'
      }
      accessibilityHint="Shows your wallet address and balances"
      hitSlop={6}
      style={[
        styles.chip,
        { backgroundColor: colors.panel, borderColor: colors.line },
      ]}
      pressedStyle={{ borderColor: colors.line2 }}
    >
      <UsdcMark size={20} />
      <View>
        <Text
          style={[styles.amount, { color: colors.text }]}
          maxFontSizeMultiplier={1.2}
        >
          {amount}
        </Text>
      </View>
    </PressableScale>
  )
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    height: 36,
    paddingLeft: 7,
    paddingRight: 13,
    borderWidth: 1,
    borderRadius: radius.pill,
  },
  amount: {
    fontFamily: fonts.mono,
    fontWeight: '600',
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
})
