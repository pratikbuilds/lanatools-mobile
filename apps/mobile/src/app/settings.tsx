import { useState } from 'react'
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import * as Clipboard from 'expo-clipboard'
import * as Haptics from 'expo-haptics'
import { ArrowLeftIcon } from 'phosphor-react-native/src/icons/ArrowLeft'
import { CheckIcon } from 'phosphor-react-native/src/icons/Check'
import { CopyIcon } from 'phosphor-react-native/src/icons/Copy'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useConversations } from '../agent/store'
import { useDraft } from '../chat/draft'
import { AppBar, BarIcon, BarTitle } from '../components/AppBar'
import { Button } from '../components/Button'
import { Row, Section, Ticks, Value } from '../components/Ledger'
import { PressableScale } from '../components/PressableScale'
import { StatusDot } from '../components/StatusDot'
import { Mono } from '../components/text'
import {
  MOCK_AGENT,
  methodLabel,
  shortAddress,
  useSession,
} from '../session/session'
import { useTheme } from '../theme/theme'
import { fonts, radius } from '../theme/tokens'
import type { Preference } from '../theme/theme'

const APPEARANCE: { value: Preference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

/** `.d-seg`: one pressed choice in a tray. */
function Segmented({
  value,
  onChange,
}: {
  value: Preference
  onChange: (value: Preference) => void
}) {
  const { colors } = useTheme()
  return (
    <View
      style={[
        styles.seg,
        { borderColor: colors.line, backgroundColor: colors.panel },
      ]}
      accessibilityRole="radiogroup"
    >
      {APPEARANCE.map((option) => {
        const on = option.value === value
        return (
          <PressableScale
            key={option.value}
            scale={false}
            onPress={() => {
              if (on) return
              void Haptics.selectionAsync()
              onChange(option.value)
            }}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            style={[
              styles.segItem,
              on && {
                backgroundColor: colors.panel2,
                borderColor: colors.line2,
              },
            ]}
          >
            <Text
              style={[
                styles.segText,
                { color: on ? colors.text : colors.text3 },
              ]}
            >
              {option.label}
            </Text>
          </PressableScale>
        )
      })}
    </View>
  )
}

function CopyAddress({ address }: { address: string }) {
  const { colors } = useTheme()
  const [copied, setCopied] = useState(false)
  return (
    <PressableScale
      onPress={() => {
        void Clipboard.setStringAsync(address)
        void Haptics.selectionAsync()
        setCopied(true)
        setTimeout(() => setCopied(false), 1400)
      }}
      accessibilityRole="button"
      accessibilityLabel={copied ? 'Address copied' : 'Copy wallet address'}
      hitSlop={8}
      style={styles.copy}
      pressedStyle={{ backgroundColor: colors.panel2 }}
    >
      <Mono size={13} weight="600">
        {shortAddress(address)}
      </Mono>
      {copied ? (
        <CheckIcon size={15} color={colors.live} />
      ) : (
        <CopyIcon size={15} color={colors.text3} />
      )}
    </PressableScale>
  )
}

export default function Settings() {
  const { colors, preference, setPreference } = useTheme()
  const insets = useSafeAreaInsets()
  const session = useSession()
  const draft = useDraft()
  const store = useConversations()
  const signedIn = session.status === 'signedIn'
  const linked = MOCK_AGENT && signedIn

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
        title={<BarTitle>Settings</BarTitle>}
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24 },
        ]}
      >
        <Section label="Account">
          {session.address && session.method ? (
            <>
              <Row name="Wallet" detail="Your LanaTools embedded wallet" first>
                <CopyAddress address={session.address} />
              </Row>
              <Row name="Signed in with">
                <Value>{methodLabel(session.method)}</Value>
              </Row>
            </>
          ) : (
            <Row
              name="Not signed in"
              detail="Connect a wallet to chat with your agent."
              first
            >
              <Button
                label="Connect"
                onPress={() => {
                  draft.setWaiting(false)
                  router.push('/sign-in')
                }}
              />
            </Row>
          )}
        </Section>

        <Section label="LanaTools">
          <Row name="Status" first>
            <View style={styles.status}>
              <StatusDot state={linked ? 'live' : 'idle'} />
              <Value>{linked ? 'Connected' : 'Not connected'}</Value>
            </View>
          </Row>
          <Row name="Client" detail="How lanatools.sh lists this app">
            <Value>LanaTools Mobile</Value>
          </Row>
          {linked && (
            <View style={[styles.limit, { borderTopColor: colors.line }]}>
              <View style={styles.limitHead}>
                <Text style={[styles.limitName, { color: colors.text }]}>
                  Spending limit
                </Text>
                <Value>$0.03 of $5.00</Value>
              </View>
              <Ticks spent={0.03} limit={5} />
            </View>
          )}
          <PressableScale
            scale={false}
            onPress={() =>
              void Linking.openURL('https://lanatools.sh/dashboard')
            }
            accessibilityRole="link"
            style={[styles.link, { borderTopColor: colors.line }]}
            pressedStyle={{ backgroundColor: colors.panel2 }}
          >
            <Text style={[styles.linkText, { color: colors.accent }]}>
              Manage on lanatools.sh
            </Text>
            <Text style={[styles.linkText, { color: colors.accent }]}>↗</Text>
          </PressableScale>
        </Section>

        <Section label="Appearance">
          <Row name="Theme" first>
            <Segmented value={preference} onChange={setPreference} />
          </Row>
        </Section>

        <Section label="About">
          <Row name="Network" first>
            <Value>Solana mainnet</Value>
          </Row>
          <Row name="MCP server">
            <Value>mcp.lanatools.sh</Value>
          </Row>
          <Row name="Version">
            <Value>0.1.0</Value>
          </Row>
          <PressableScale
            scale={false}
            onPress={() => router.push('/onboarding')}
            accessibilityRole="button"
            style={[styles.link, { borderTopColor: colors.line }]}
            pressedStyle={{ backgroundColor: colors.panel2 }}
          >
            <Text style={[styles.linkText, { color: colors.accent }]}>
              Show the introduction
            </Text>
            <Text style={[styles.linkText, { color: colors.accent }]}>→</Text>
          </PressableScale>
        </Section>

        {signedIn && (
          <PressableScale
            onPress={() => {
              void session.signOut()
              store.newChat()
              router.back()
            }}
            accessibilityRole="button"
            style={[
              styles.signOut,
              { borderColor: colors.line2, backgroundColor: colors.panel },
            ]}
            pressedStyle={{ borderColor: colors.bad }}
          >
            <Text style={[styles.signOutText, { color: colors.bad }]}>
              Sign out
            </Text>
          </PressableScale>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  copy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: radius.field,
  },
  limit: { borderTopWidth: 1, padding: 14, gap: 10 },
  limitHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  limitName: { fontFamily: fonts.sans, fontWeight: '500', fontSize: 15 },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: 14,
    borderTopWidth: 1,
  },
  linkText: { fontFamily: fonts.mono, fontWeight: '600', fontSize: 13 },
  seg: {
    flexDirection: 'row',
    padding: 3,
    borderWidth: 1,
    borderRadius: radius.button,
  },
  segItem: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  segText: { fontFamily: fonts.mono, fontWeight: '500', fontSize: 12 },
  signOut: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderWidth: 1,
    borderRadius: radius.button,
  },
  signOutText: { fontFamily: fonts.mono, fontWeight: '600', fontSize: 13 },
})
