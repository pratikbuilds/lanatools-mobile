import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { WalletIcon } from 'phosphor-react-native/src/icons/Wallet'
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller'
import Animated, { useAnimatedStyle } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Composer } from '../chat/Composer'
import { EmptyState } from '../chat/EmptyState'
import { SignInSheet } from '../chat/SignInSheet'
import { AppBar, BarButton } from '../components/AppBar'
import { useSession } from '../session/session'
import { useTheme } from '../theme/theme'

/**
 * The app opens here: a chat with the agent. Nothing asks for a wallet
 * until the user sends something, and then only in a sheet that keeps
 * their message.
 */
export default function Chat() {
  const { colors, name } = useTheme()
  const session = useSession()
  const [draft, setDraft] = useState('')
  const [signingIn, setSigningIn] = useState(false)
  const [waiting, setWaiting] = useState(false)

  const send = (text: string) => {
    if (session.status !== 'signedIn') {
      setDraft(text)
      setWaiting(true)
      setSigningIn(true)
      return
    }
    // Sending to the agent arrives with the Flue backend (milestone 3).
  }

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
                setWaiting(false)
                setSigningIn(true)
              }}
            />
          )
        }
      />
      <EmptyState onPick={send} />
      <View style={styles.composer}>
        <Composer
          value={draft}
          onChange={setDraft}
          onSend={() => send(draft)}
        />
      </View>
      <KeyboardSpace />
      <SignInSheet
        open={signingIn}
        waiting={waiting && draft.trim().length > 0}
        onClose={() => setSigningIn(false)}
      />
    </View>
  )
}

/**
 * Space under the composer: the keyboard's height while it is open, the
 * navigation bar's otherwise, so the composer rides the keyboard.
 */
function KeyboardSpace() {
  const insets = useSafeAreaInsets()
  const { height } = useReanimatedKeyboardAnimation()
  const style = useAnimatedStyle(() => ({
    height: Math.max(insets.bottom + 8, -height.value + 8),
  }))
  return <Animated.View style={style} />
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  composer: { paddingHorizontal: 12, paddingTop: 6 },
})
