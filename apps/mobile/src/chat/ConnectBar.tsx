import { StyleSheet, Text } from 'react-native'
import { router } from 'expo-router'
import { CaretRightIcon } from 'phosphor-react-native/src/icons/CaretRight'
import Animated, { FadeIn } from 'react-native-reanimated'
import { PressableScale } from '../components/PressableScale'
import { StatusDot } from '../components/StatusDot'
import { useLanaTools } from '../lanatools/link'
import { useSession } from '../session/session'
import { EASE_OUT } from '../theme/motion'
import { useTheme } from '../theme/theme'
import { fonts, radius } from '../theme/tokens'

const IN = FadeIn.duration(200).easing(EASE_OUT)

/**
 * Above the message field while a signed-in user's agent has no tools:
 * LanaTools isn't connected, or its access was revoked. It opens the
 * LanaTools page, where they connect.
 */
export function ConnectBar() {
  const { colors } = useTheme()
  const session = useSession()
  const { status } = useLanaTools()
  if (session.status !== 'signedIn') return null
  if (status !== 'unlinked' && status !== 'revoked') return null
  const revoked = status === 'revoked'

  return (
    <Animated.View entering={IN}>
      <PressableScale
        onPress={() => router.push('/tools')}
        accessibilityRole="button"
        accessibilityHint="Opens LanaTools, where you connect your agent's tools"
        style={[
          styles.bar,
          { backgroundColor: colors.panel, borderColor: colors.line },
        ]}
        pressedStyle={{ borderColor: colors.line2 }}
      >
        <StatusDot state={revoked ? 'warn' : 'idle'} />
        <Text
          style={[styles.text, { color: colors.text2 }]}
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
        >
          {revoked ? 'LanaTools access revoked' : "LanaTools isn't connected"}
        </Text>
        <Text style={[styles.action, { color: colors.text }]}>
          {revoked ? 'Reconnect' : 'Connect'}
        </Text>
        <CaretRightIcon size={12} weight="bold" color={colors.text3} />
      </PressableScale>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    marginBottom: 8,
    paddingLeft: 12,
    paddingRight: 14,
    borderWidth: 1,
    borderRadius: radius.pill,
  },
  text: { flex: 1, fontFamily: fonts.sans, fontSize: 13.5 },
  action: { fontFamily: fonts.mono, fontWeight: '600', fontSize: 12.5 },
})
