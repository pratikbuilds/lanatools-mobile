import { StyleSheet, View } from 'react-native'
import { Redirect, router } from 'expo-router'
import { ListIcon } from 'phosphor-react-native/src/icons/List'
import { NotePencilIcon } from 'phosphor-react-native/src/icons/NotePencil'
import { WalletIcon } from 'phosphor-react-native/src/icons/Wallet'
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller'
import Animated, { useAnimatedStyle } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useConversations } from '../agent/store'
import { Composer } from '../chat/Composer'
import { ConversationsDrawer } from '../chat/ConversationsDrawer'
import { useDraft } from '../chat/draft'
import { EmptyState } from '../chat/EmptyState'
import { MessageList } from '../chat/MessageList'
import { AppBar, BarButton, BarIcon, BarTitle } from '../components/AppBar'
import { DrawerLayout, useDrawer } from '../components/Drawer'
import { useOnboarding } from '../onboarding/seen'
import { useSession } from '../session/session'
import { useTheme } from '../theme/theme'

export default function ChatRoute() {
  const onboarding = useOnboarding()
  if (!onboarding.seen) return <Redirect href="/onboarding" />
  return (
    <DrawerLayout drawer={<ConversationsDrawer />}>
      <Chat />
    </DrawerLayout>
  )
}

/**
 * The app opens here: a chat with the agent. Nothing asks for a wallet
 * until the user sends something, and then only in a sheet; the message
 * waits in the composer and sends once they are signed in.
 */
function Chat() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const session = useSession()
  const drawer = useDrawer()
  const store = useConversations()
  const draft = useDraft()
  const keyboard = useReanimatedKeyboardAnimation()
  const active = store.active

  const send = (text: string) => {
    if (session.status !== 'signedIn') {
      draft.setText(text)
      draft.setWaiting(true)
      router.push('/sign-in')
      return
    }
    store.send(text)
    draft.setText('')
  }

  // The composer rides the keyboard's real position, frame by frame, as a
  // transform: nothing re-lays-out while the keyboard moves.
  const dockStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: Math.min(0, keyboard.height.get() + insets.bottom) },
    ],
  }))

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <AppBar
        leading={
          <BarIcon
            icon={<ListIcon size={22} color={colors.text} />}
            label="Open conversations"
            onPress={drawer.open}
          />
        }
        title={<BarTitle>{active?.title ?? 'New chat'}</BarTitle>}
        trailing={
          <>
            {active && (
              <BarIcon
                icon={<NotePencilIcon size={21} color={colors.text} />}
                label="New chat"
                onPress={store.newChat}
              />
            )}
            {(session.status === 'signedOut' ||
              session.status === 'walletError') && (
              <BarButton
                label="Connect"
                leading={<WalletIcon size={16} color={colors.text} />}
                accessibilityHint="Sign in and connect your wallet"
                onPress={() => {
                  draft.setWaiting(false)
                  router.push('/sign-in')
                }}
              />
            )}
          </>
        }
      />
      {active ? (
        <MessageList key={active.id} messages={active.messages} />
      ) : (
        <EmptyState onPick={send} keyboard={keyboard} />
      )}
      <Animated.View
        style={[styles.dock, { paddingBottom: insets.bottom + 8 }, dockStyle]}
      >
        <Composer
          value={draft.text}
          onChange={draft.setText}
          onSend={() => send(draft.text)}
          working={store.working}
          onStop={store.stop}
          onTools={() => router.push('/tools')}
        />
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  dock: { paddingHorizontal: 16, paddingTop: 10 },
})
