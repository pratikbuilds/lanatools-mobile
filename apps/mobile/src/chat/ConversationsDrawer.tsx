import { useMemo, useState } from 'react'
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { router } from 'expo-router'
import { CaretRightIcon } from 'phosphor-react-native/src/icons/CaretRight'
import { GearSixIcon } from 'phosphor-react-native/src/icons/GearSix'
import { MagnifyingGlassIcon } from 'phosphor-react-native/src/icons/MagnifyingGlass'
import { NotePencilIcon } from 'phosphor-react-native/src/icons/NotePencil'
import { WalletIcon } from 'phosphor-react-native/src/icons/Wallet'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BrandMark } from '../brand/BrandMark'
import { SolanaMark } from '../brand/marks'
import { useConversations } from '../agent/store'
import { useDrawer } from '../components/Drawer'
import { PressableScale } from '../components/PressableScale'
import { StatusDot } from '../components/StatusDot'
import { Label, Mono, Small } from '../components/text'
import { useLanaTools } from '../lanatools/link'
import { methodLabel, shortAddress, useSession } from '../session/session'
import { useTheme } from '../theme/theme'
import { fonts, radius } from '../theme/tokens'
import { useDraft } from './draft'
import type { ConversationSummary } from '../agent/context'
import type { DotState } from '../components/StatusDot'
import type { LinkStatus } from '../lanatools/link'

const DAY = 24 * 60 * 60 * 1000

function groupOf(updatedAt: number, now: number) {
  const startOfToday = new Date(now).setHours(0, 0, 0, 0)
  if (updatedAt >= startOfToday) return 'Today'
  if (updatedAt >= startOfToday - DAY) return 'Yesterday'
  if (updatedAt >= startOfToday - 7 * DAY) return 'Previous 7 days'
  return 'Older'
}

/**
 * The drawer: a new chat, search, past conversations grouped by when they
 * last moved, and the account at the foot, where a wallet lives in an app.
 */
export function ConversationsDrawer() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const drawer = useDrawer()
  const store = useConversations()
  const session = useSession()
  const lanatools = useLanaTools()
  const draft = useDraft()
  const [query, setQuery] = useState('')
  // Groups are by calendar day; the drawer's mount time is close enough.
  const [now] = useState(() => Date.now())

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const found = store.conversations
      .filter((c) => !q || c.title.toLowerCase().includes(q))
      .sort((a, b) => b.updatedAt - a.updatedAt)
    const out = new Map<string, ConversationSummary[]>()
    for (const c of found) {
      const group = groupOf(c.updatedAt, now)
      out.set(group, [...(out.get(group) ?? []), c])
    }
    return [...out]
  }, [now, query, store.conversations])

  const go = (action: () => void) => {
    action()
    drawer.close()
  }

  return (
    <View
      style={[
        styles.drawer,
        { paddingTop: insets.top + 8, backgroundColor: colors.panel },
      ]}
    >
      <View style={styles.brand}>
        <BrandMark size={22} color={colors.text} />
        <Text style={[styles.wordmark, { color: colors.text }]}>
          lanatools
          <Text style={[styles.sh, { color: colors.text3 }]}>.sh</Text>
        </Text>
      </View>

      <View style={styles.top}>
        <View
          style={[
            styles.search,
            { backgroundColor: colors.bg, borderColor: colors.line },
          ]}
        >
          <MagnifyingGlassIcon size={16} color={colors.text3} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search chats"
            placeholderTextColor={colors.text3}
            selectionColor={colors.focus}
            cursorColor={colors.focus}
            returnKeyType="search"
            accessibilityLabel="Search chats"
            style={[styles.searchInput, { color: colors.text }]}
          />
        </View>
        <PressableScale
          onPress={() => go(store.newChat)}
          accessibilityRole="button"
          accessibilityLabel="New chat"
          hitSlop={4}
          style={[
            styles.newChat,
            { backgroundColor: colors.accent, borderColor: colors.accent },
          ]}
        >
          <NotePencilIcon size={18} color={colors.onAccent} />
        </PressableScale>
      </View>

      <ScrollView
        style={styles.fill}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {session.status !== 'signedIn' ? (
          <View style={styles.empty}>
            <Label>No chats yet</Label>
            <Small>
              Connect a wallet and your conversations with your agent show up
              here.
            </Small>
          </View>
        ) : (
          groups.length === 0 && (
            <Small style={styles.empty}>No chats match “{query.trim()}”.</Small>
          )
        )}
        {session.status === 'signedIn' &&
          groups.map(([group, items]) => (
            <View key={group} style={styles.group}>
              <Label style={styles.groupLabel}>{group}</Label>
              {items.map((c) => {
                const active = store.active?.id === c.id
                return (
                  <PressableScale
                    key={c.id}
                    scale={false}
                    onPress={() => go(() => store.open(c.id))}
                    onLongPress={() =>
                      Alert.alert(c.title, undefined, [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: () => store.remove(c.id),
                        },
                      ])
                    }
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityHint="Opens the chat. Long press to delete it."
                    style={[
                      styles.row,
                      active && { backgroundColor: colors.panel2 },
                    ]}
                    pressedStyle={{ backgroundColor: colors.panel2 }}
                  >
                    <Text
                      style={[
                        styles.rowText,
                        { color: active ? colors.text : colors.text2 },
                      ]}
                      numberOfLines={1}
                      maxFontSizeMultiplier={1.3}
                    >
                      {c.title}
                    </Text>
                  </PressableScale>
                )
              })}
            </View>
          ))}
      </ScrollView>

      {session.status === 'signedIn' && (
        <PressableScale
          scale={false}
          onPress={() => go(() => router.push('/tools'))}
          accessibilityRole="button"
          accessibilityLabel={`LanaTools, ${LINK_WORDS[lanatools.status]}`}
          style={[styles.link, { borderTopColor: colors.line }]}
          pressedStyle={{ backgroundColor: colors.panel2 }}
        >
          <StatusDot state={LINK_DOT[lanatools.status]} />
          <Mono size={13} weight="600" style={styles.linkName}>
            LanaTools
          </Mono>
          <Small>{LINK_WORDS[lanatools.status]}</Small>
          <CaretRightIcon size={12} weight="bold" color={colors.text3} />
        </PressableScale>
      )}

      <View
        style={[
          styles.foot,
          { borderTopColor: colors.line, paddingBottom: insets.bottom + 10 },
        ]}
      >
        {session.address && session.method ? (
          <View style={styles.account}>
            <View style={[styles.avatar, { backgroundColor: colors.text }]}>
              <SolanaMark size={13} color={colors.panel} />
            </View>
            <View style={styles.accountText}>
              <Mono size={13} weight="600">
                {shortAddress(session.address)}
              </Mono>
              <Small>{methodLabel(session.method)}</Small>
            </View>
          </View>
        ) : (
          <PressableScale
            onPress={() =>
              go(() => {
                draft.setWaiting(false)
                router.push('/sign-in')
              })
            }
            accessibilityRole="button"
            style={[
              styles.connect,
              { borderColor: colors.line2, backgroundColor: colors.panel },
            ]}
            pressedStyle={{ borderColor: colors.text3 }}
          >
            <WalletIcon size={16} color={colors.text} />
            <Mono size={12.5} weight="600">
              Connect wallet
            </Mono>
          </PressableScale>
        )}
        <PressableScale
          onPress={() => go(() => router.push('/settings'))}
          accessibilityRole="button"
          accessibilityLabel="Settings"
          hitSlop={6}
          style={styles.gear}
          pressedStyle={{ backgroundColor: colors.panel2 }}
        >
          <GearSixIcon size={20} color={colors.text2} />
        </PressableScale>
      </View>
    </View>
  )
}

const LINK_WORDS: Record<LinkStatus, string> = {
  loading: 'Checking…',
  unlinked: 'Not connected',
  linked: 'Connected',
  revoked: 'Revoked',
}

const LINK_DOT: Record<LinkStatus, DotState> = {
  loading: 'idle',
  unlinked: 'idle',
  linked: 'live',
  revoked: 'warn',
}

const styles = StyleSheet.create({
  drawer: { flex: 1 },
  fill: { flex: 1 },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 48,
    paddingHorizontal: 16,
  },
  wordmark: {
    fontFamily: fonts.mono,
    fontWeight: '700',
    fontSize: 17,
    letterSpacing: 17 * -0.025,
  },
  sh: { fontWeight: '500' },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: radius.field,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 16,
    paddingVertical: 0,
  },
  newChat: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.button,
  },
  list: { paddingHorizontal: 8, paddingBottom: 16 },
  empty: { paddingHorizontal: 8, paddingTop: 12, gap: 6 },
  group: { marginTop: 10 },
  groupLabel: { paddingHorizontal: 8, marginBottom: 4 },
  row: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRadius: radius.field,
  },
  rowText: { fontFamily: fonts.sans, fontSize: 15 },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  linkName: { flex: 1 },
  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  account: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountText: { gap: 1 },
  connect: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderWidth: 1,
    borderRadius: radius.button,
  },
  gear: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.button,
  },
})
