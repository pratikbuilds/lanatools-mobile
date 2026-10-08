import { StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { WalletIcon } from 'phosphor-react-native/src/icons/Wallet'
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller'
import Animated, { useAnimatedStyle } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Composer } from '../chat/Composer'
import { useDraft } from '../chat/draft'
import { EmptyState } from '../chat/EmptyState'
import { AppBar, BarButton } from '../components/AppBar'
import { useSession } from '../session/session'
import { useTheme } from '../theme/theme'

/**
 * The app opens here: a chat with the agent. Nothing asks for a wallet
 * until the user sends something, and then only in a sheet; the message
 * waits in the composer.
 */
export default function Chat() {
  const { colors, name } = useTheme()
  const insets = useSafeAreaInsets()
  const session = useSession()
  const draft = useDraft()
  const keyboard = useReanimatedKeyboardAnimation()

  const send = (text: string) => {
    if (session.status !== 'signedIn') {
      draft.setText(text)
      draft.setWaiting(true)
      router.push('/sign-in')
      return
    }
    // Sending to the agent arrives with the Flue backend (milestone 3).
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
      <StatusBar style={name === 'dark' ? 'light' : 'dark'} />
      <AppBar
        title="New chat"
        right={
          session.status === 'signedIn' ? null : (
            <BarButton
              label="Connect"
              leading={<WalletIcon size={16} color={colors.text} />}
              accessibilityHint="Sign in and connect your wallet"
              onPress={() => {
                draft.setWaiting(false)
                router.push('/sign-in')
              }}
            />
          )
        }
      />
      <EmptyState onPick={send} keyboard={keyboard} />
      <Animated.View
        style={[styles.dock, { paddingBottom: insets.bottom + 8 }, dockStyle]}
      >
        <Composer
          value={draft.text}
          onChange={draft.setText}
          onSend={() => send(draft.text)}
        />
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  dock: { paddingHorizontal: 12, paddingTop: 6 },
})
