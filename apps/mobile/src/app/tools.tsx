import { useState } from 'react'
import {
  ActivityIndicator,
  Linking,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { CheckIcon } from 'phosphor-react-native/src/icons/Check'
import { LineIcon } from '../brand/SideField'
import { useDraft } from '../chat/draft'
import { Button } from '../components/Button'
import { PressableScale } from '../components/PressableScale'
import { ArrowLeftIcon } from 'phosphor-react-native/src/icons/ArrowLeft'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppBar, BarIcon, BarTitle } from '../components/AppBar'
import { SheetTitle } from '../components/SheetHead'
import { StatusDot } from '../components/StatusDot'
import { Body, Label, Small } from '../components/text'
import { useLanaTools } from '../lanatools/link'
import { DEFAULT_SCOPES, TOOL_SCOPES, choiceError } from '../lanatools/oauth'
import { useSession } from '../session/session'
import { useTheme } from '../theme/theme'
import { fonts, radius } from '../theme/tokens'
import type { IconName } from '../brand/SideField'
import type { ToolScope } from '../lanatools/oauth'

// The tool families a LanaTools grant can include, in the consent page's
// words (lanatools/apps/mcp/consent/permissions.tsx).
const FAMILIES: Record<
  ToolScope,
  { title: string; detail: string; icon: IconName }
> = {
  'helius:read': {
    title: 'Helius',
    detail: 'Read Solana tokens, wallets and transactions',
    icon: 'database',
  },
  'payments:pay': {
    title: 'Pay',
    detail: 'Pay for APIs in USDC from your LanaTools wallet',
    icon: 'receipt',
  },
  'jupiter:read': {
    title: 'Jupiter',
    detail:
      'Read token prices, swap quotes and lending data. Swap tokens from your LanaTools wallet without further approval or an amount limit.',
    icon: 'coin',
  },
  'phoenix:read': {
    title: 'Phoenix',
    detail: 'Read perps markets, order books and candles',
    icon: 'chart',
  },
  'phoenix:trade': {
    title: 'Phoenix trading',
    detail:
      'Activate Phoenix, deposit and withdraw collateral, and trade perpetuals. Your LanaTools wallet can sign without further approval or an amount limit.',
    icon: 'sign',
  },
  'solana:transfer': {
    title: 'Transfers',
    detail:
      'Send SOL and tokens from your LanaTools wallet without further approval or an amount limit.',
    icon: 'transfer',
  },
}

const PAY: ToolScope = 'payments:pay'
// Pay comes last, so its limit closes the list instead of splitting it.
const ROWS: ToolScope[] = [...TOOL_SCOPES.filter((s) => s !== PAY), PAY]

const DASHBOARD = 'https://lanatools.sh/dashboard'

function Check({ on }: { on: boolean }) {
  const { colors } = useTheme()
  return (
    <View
      style={[
        styles.check,
        on
          ? { backgroundColor: colors.accent, borderColor: colors.accent }
          : { backgroundColor: colors.bg, borderColor: colors.line2 },
      ]}
    >
      {on && <CheckIcon size={13} weight="bold" color={colors.onAccent} />}
    </View>
  )
}

function Family({
  scope,
  on,
  onToggle,
}: {
  scope: ToolScope
  on: boolean
  /** Absent while connected: the grant is fixed until changed online. */
  onToggle?: () => void
}) {
  const { colors } = useTheme()
  const family = FAMILIES[scope]
  return (
    <PressableScale
      scale={false}
      disabled={!onToggle}
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on, disabled: !onToggle }}
      accessibilityLabel={`${family.title}. ${family.detail}`}
      style={styles.family}
      pressedStyle={{ backgroundColor: colors.panel2 }}
    >
      {onToggle ? (
        <Check on={on} />
      ) : (
        <StatusDot state={on ? 'live' : 'idle'} />
      )}
      <View style={styles.familyText}>
        <View style={styles.familyTitle}>
          <LineIcon name={family.icon} size={15} color={colors.text2} />
          <Text
            style={[styles.familyName, { color: colors.text }]}
            maxFontSizeMultiplier={1.3}
          >
            {family.title}
          </Text>
        </View>
        <Small>{family.detail}</Small>
      </View>
    </PressableScale>
  )
}

/**
 * LanaTools: whether it is connected, and the tools this app's agent can
 * use through it. Before the user connects, it is the consent card: the
 * tool families, a spending limit with Pay, and Connect, which approves
 * "LanaTools Mobile" for them. A page, not a sheet: with every family it
 * is taller than a phone, and it is where the connection lives.
 */
export default function Tools() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const session = useSession()
  const lanatools = useLanaTools()
  const draft = useDraft()
  const [scopes, setScopes] = useState<ToolScope[]>([...DEFAULT_SCOPES])
  const [limit, setLimit] = useState('5')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const signedIn = session.status === 'signedIn'
  const linked = lanatools.status === 'linked'
  const pay = scopes.includes(PAY)
  const choice = { scopes, limitUsd: pay ? limit : null }

  const toggle = (scope: ToolScope) => {
    void Haptics.selectionAsync()
    setError(null)
    setScopes((all) =>
      TOOL_SCOPES.filter((each) =>
        each === scope ? !all.includes(each) : all.includes(each),
      ),
    )
  }

  const connect = async () => {
    const invalid = choiceError(choice)
    if (invalid) {
      setError(invalid)
      return
    }
    setBusy(true)
    setError(null)
    try {
      await lanatools.connect(choice)
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : 'Could not connect.',
      )
    } finally {
      setBusy(false)
    }
  }

  const status = linked
    ? { dot: 'live' as const, text: 'Connected' }
    : lanatools.status === 'revoked'
      ? { dot: 'warn' as const, text: 'Access revoked' }
      : { dot: 'idle' as const, text: 'Not connected' }

  const granted = lanatools.grant?.scopes ?? []

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
        title={<BarTitle>LanaTools</BarTitle>}
      />
      <KeyboardAwareScrollView
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24 },
        ]}
      >
        <View style={styles.status}>
          <StatusDot state={status.dot} />
          <Label>{status.text}</Label>
        </View>
        <SheetTitle>
          {linked ? 'Tools your agent can use' : 'Connect LanaTools'}
        </SheetTitle>
        <Body style={styles.lede}>
          {linked
            ? 'Every call runs through mcp.lanatools.sh, inside the tools and limit you approved for LanaTools Mobile.'
            : lanatools.status === 'revoked'
              ? 'LanaTools Mobile was disconnected on lanatools.sh. Choose what your agent can use to connect it again.'
              : 'Choose what your agent can use. You can change or revoke this on lanatools.sh at any time.'}
        </Body>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.panel, borderColor: colors.line },
          ]}
        >
          {ROWS.map((scope, index) => (
            <View
              key={scope}
              style={
                index > 0 && { borderTopWidth: 1, borderTopColor: colors.line }
              }
            >
              <Family
                scope={scope}
                on={linked ? granted.includes(scope) : scopes.includes(scope)}
                {...(linked || !signedIn || busy
                  ? {}
                  : { onToggle: () => toggle(scope) })}
              />
            </View>
          ))}
          {(linked ? lanatools.grant?.limitUsd : pay && signedIn) && (
            <View style={[styles.limit, { borderTopColor: colors.line }]}>
              <Label>Spending limit</Label>
              {linked ? (
                <Text style={[styles.limitValue, { color: colors.text }]}>
                  ${lanatools.grant?.limitUsd}
                </Text>
              ) : (
                <View
                  style={[
                    styles.limitField,
                    { borderColor: colors.line2, backgroundColor: colors.bg },
                  ]}
                >
                  <Text style={[styles.limitValue, { color: colors.text3 }]}>
                    $
                  </Text>
                  <TextInput
                    value={limit}
                    onChangeText={(text) => {
                      setError(null)
                      setLimit(text)
                    }}
                    editable={!busy}
                    keyboardType="decimal-pad"
                    selectionColor={colors.focus}
                    cursorColor={colors.focus}
                    maxLength={10}
                    accessibilityLabel="Spending limit in US dollars"
                    style={[styles.limitInput, { color: colors.text }]}
                  />
                </View>
              )}
            </View>
          )}
        </View>

        {error && (
          <Small tone="bad" alert style={styles.error}>
            {error}
          </Small>
        )}

        {!signedIn ? (
          <Button
            primary
            size="lg"
            label="Sign in to connect"
            onPress={() => {
              draft.setWaiting(false)
              router.push('/sign-in')
            }}
            style={styles.action}
          />
        ) : linked ? (
          <View style={styles.actions}>
            <Button
              size="lg"
              label="Manage on lanatools.sh"
              trailing="↗"
              onPress={() => void Linking.openURL(DASHBOARD)}
            />
            <Button
              size="lg"
              label="Disconnect"
              onPress={() => void lanatools.disconnect()}
            />
          </View>
        ) : (
          <Button
            primary
            size="lg"
            label={busy ? 'Connecting…' : 'Connect LanaTools'}
            leading={
              busy ? (
                <ActivityIndicator size="small" color={colors.onAccent} />
              ) : undefined
            }
            disabled={busy || lanatools.status === 'loading'}
            onPress={() => void connect()}
            style={styles.action}
          />
        )}
      </KeyboardAwareScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 16 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lede: { marginTop: 8 },
  card: {
    marginTop: 18,
    borderWidth: 1,
    borderRadius: radius.frame,
    overflow: 'hidden',
  },
  family: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  check: {
    width: 20,
    height: 20,
    marginTop: 1,
    borderWidth: 1.5,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  familyText: { flex: 1, gap: 3 },
  familyTitle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  familyName: { fontFamily: fonts.mono, fontWeight: '600', fontSize: 13.5 },
  limit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  limitField: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    minWidth: 104,
    paddingLeft: 12,
    paddingRight: 6,
    borderWidth: 1,
    borderRadius: radius.pill,
  },
  limitValue: {
    fontFamily: fonts.mono,
    fontWeight: '600',
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  limitInput: {
    flex: 1,
    paddingVertical: 0,
    paddingLeft: 2,
    fontFamily: fonts.mono,
    fontWeight: '600',
    fontSize: 15,
  },
  error: { marginTop: 12 },
  action: { marginTop: 18 },
  actions: { marginTop: 18, gap: 10 },
})
