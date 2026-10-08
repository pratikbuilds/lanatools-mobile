import { useState } from 'react'
import { StyleSheet, TextInput } from 'react-native'
import * as Haptics from 'expo-haptics'
import { ArrowUpIcon } from 'phosphor-react-native/src/icons/ArrowUp'
import { StopIcon } from 'phosphor-react-native/src/icons/Stop'
import { WrenchIcon } from 'phosphor-react-native/src/icons/Wrench'
import Animated from 'react-native-reanimated'
import { PressableScale } from '../components/PressableScale'
import { CSS_EASE_OUT, STATE_MS } from '../theme/motion'
import { useTheme } from '../theme/theme'
import { fonts, radius } from '../theme/tokens'

/**
 * The message field. Send is the one filled control on the screen, and only
 * once there is something to send; it fills in over 150ms, quick enough for
 * something that happens with every message. While the agent works it
 * becomes Stop. The wrench opens the LanaTools tools this chat can use.
 */
export function Composer({
  value,
  onChange,
  onSend,
  working = false,
  onStop,
  onTools,
}: {
  value: string
  onChange: (text: string) => void
  onSend: () => void
  working?: boolean
  onStop?: () => void
  onTools?: () => void
}) {
  const { colors } = useTheme()
  const [focused, setFocused] = useState(false)
  const ready = value.trim().length > 0
  const filled = ready || working

  const press = () => {
    if (working) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      onStop?.()
      return
    }
    if (!ready) return
    // The commit: one haptic, in the same frame as the press.
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onSend()
  }

  return (
    <Animated.View
      style={[
        styles.field,
        {
          backgroundColor: colors.panel,
          borderColor: focused ? colors.text3 : colors.line2,
          transitionProperty: 'borderColor',
          transitionDuration: STATE_MS,
          transitionTimingFunction: CSS_EASE_OUT,
        },
      ]}
    >
      {onTools && (
        <PressableScale
          onPress={onTools}
          accessibilityRole="button"
          accessibilityLabel="Tools"
          accessibilityHint="Shows the LanaTools tools your agent can use"
          hitSlop={6}
          style={styles.tools}
          pressedStyle={{ backgroundColor: colors.panel2 }}
        >
          <WrenchIcon size={19} color={colors.text2} />
        </PressableScale>
      )}
      <TextInput
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Ask your agent"
        placeholderTextColor={colors.text3}
        selectionColor={colors.focus}
        cursorColor={colors.focus}
        selectionHandleColor={colors.focus}
        multiline
        maxLength={4000}
        maxFontSizeMultiplier={1.3}
        accessibilityLabel="Message"
        style={[styles.input, { color: colors.text }]}
      />
      <PressableScale
        onPress={press}
        disabled={!filled}
        accessibilityRole="button"
        accessibilityLabel={working ? 'Stop' : 'Send'}
        accessibilityState={{ disabled: !filled }}
        hitSlop={6}
        style={[
          styles.send,
          { backgroundColor: filled ? colors.accent : colors.panel2 },
        ]}
      >
        {working ? (
          <StopIcon size={16} weight="fill" color={colors.onAccent} />
        ) : (
          <ArrowUpIcon
            size={19}
            weight="bold"
            color={ready ? colors.onAccent : colors.text3}
          />
        )}
      </PressableScale>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    minHeight: 54,
    paddingLeft: 7,
    paddingRight: 7,
    borderWidth: 1,
    borderRadius: radius.frame,
  },
  input: {
    flex: 1,
    maxHeight: 136,
    paddingTop: 15,
    paddingBottom: 15,
    paddingHorizontal: 9,
    fontFamily: fonts.sans,
    fontSize: 16,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  tools: {
    width: 40,
    height: 40,
    marginBottom: 6,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  send: {
    width: 40,
    height: 40,
    marginBottom: 6,
    // Concentric with the field: its 14 radius less the 7 inset, which is
    // also the dashboard's button radius.
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    transitionProperty: ['transform', 'backgroundColor'],
    transitionDuration: STATE_MS,
  },
})
