import { Linking, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { LineIcon } from '../brand/SideField'
import { useDraft } from '../chat/draft'
import { Button } from '../components/Button'
import { Ticks } from '../components/Ledger'
import { SheetScreen, SheetTitle } from '../components/SheetHead'
import { StatusDot } from '../components/StatusDot'
import { Hatch } from '../components/surfaces'
import { Body, Label, Mono, Small } from '../components/text'
import { MOCK_AGENT, useSession } from '../session/session'
import { useTheme } from '../theme/theme'
import { fonts, radius } from '../theme/tokens'
import type { IconName } from '../brand/SideField'

// The tool families a LanaTools grant can include, in the consent page's
// words (lanatools/apps/mcp/consent/permissions.tsx).
const FAMILIES: { name: string; detail: string; icon: IconName }[] = [
  {
    name: 'Helius',
    detail: 'Read Solana tokens, wallets and transactions',
    icon: 'database',
  },
  {
    name: 'Jupiter',
    detail: 'Read token prices, swap quotes and lending data',
    icon: 'coin',
  },
  {
    name: 'Phoenix',
    detail: 'Read perps markets, order books and candles',
    icon: 'chart',
  },
  {
    name: 'Pay',
    detail: 'Pay for APIs in USDC from your LanaTools wallet',
    icon: 'receipt',
  },
]

// The mock grant's limit and spend. Until LanaTools is linked (milestone 4)
// only the mock agent claims a connection.
const LIMIT = 5
const SPENT = 0.03

/** What this chat's agent can reach through LanaTools, and its limit. */
export default function Tools() {
  const { colors } = useTheme()
  const session = useSession()
  const draft = useDraft()
  const connected = MOCK_AGENT && session.status === 'signedIn'

  return (
    <SheetScreen context="tools">
      <View style={styles.status}>
        <StatusDot state={connected ? 'live' : 'idle'} />
        <Label>{connected ? 'Connected' : 'Not connected'}</Label>
      </View>
      <SheetTitle>Tools your agent can use</SheetTitle>
      <Body style={styles.lede}>
        {connected
          ? 'Every call runs through mcp.lanatools.sh, inside the tools and limit you approved for LanaTools Mobile.'
          : 'Connect your wallet and approve LanaTools Mobile to give your agent these tools.'}
      </Body>

      <View
        style={[
          styles.card,
          { backgroundColor: colors.panel, borderColor: colors.line },
        ]}
      >
        {FAMILIES.map((family, index) => (
          <View
            key={family.name}
            style={[
              styles.row,
              index > 0 && { borderTopWidth: 1, borderTopColor: colors.line },
            ]}
          >
            <View
              style={[
                styles.tile,
                { backgroundColor: colors.panel2, borderColor: colors.line },
              ]}
            >
              <Hatch />
              <LineIcon name={family.icon} size={16} color={colors.text} />
            </View>
            <View style={styles.rowText}>
              <Mono size={13} weight="600">
                {family.name}
              </Mono>
              <Small>{family.detail}</Small>
            </View>
            <Text
              style={[
                styles.state,
                { color: connected ? colors.live : colors.text3 },
              ]}
            >
              {connected ? 'ON' : 'OFF'}
            </Text>
          </View>
        ))}
        {connected && (
          <View style={[styles.limit, { borderTopColor: colors.line }]}>
            <View style={styles.limitHead}>
              <Label>Spending limit</Label>
              <Mono size={12.5} tone="text2">
                {`$${SPENT.toFixed(2)} of $${LIMIT.toFixed(2)}`}
              </Mono>
            </View>
            <Ticks spent={SPENT} limit={LIMIT} />
          </View>
        )}
      </View>

      {connected ? (
        <Button
          size="lg"
          label="Change on lanatools.sh"
          trailing="↗"
          onPress={() => void Linking.openURL('https://lanatools.sh/dashboard')}
          style={styles.action}
        />
      ) : (
        <Button
          primary
          size="lg"
          label="Connect wallet"
          onPress={() => {
            draft.setWaiting(false)
            router.replace('/sign-in')
          }}
          style={styles.action}
        />
      )}
    </SheetScreen>
  )
}

const styles = StyleSheet.create({
  status: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lede: { marginTop: 8 },
  card: {
    marginTop: 18,
    borderWidth: 1,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  tile: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.field,
    overflow: 'hidden',
  },
  rowText: { flex: 1, gap: 2 },
  state: {
    fontFamily: fonts.mono,
    fontWeight: '600',
    fontSize: 11,
    letterSpacing: 0.66,
  },
  limit: { borderTopWidth: 1, padding: 12, gap: 10 },
  limitHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  action: { marginTop: 18 },
})
