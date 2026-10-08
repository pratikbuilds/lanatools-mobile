import { useState } from 'react'
import { StyleSheet, TextInput } from 'react-native'
import * as Haptics from 'expo-haptics'
import { ArrowUpIcon } from 'phosphor-react-native/src/icons/ArrowUp'
import Animated from 'react-native-reanimated'
import { PressableScale } from '../components/PressableScale'
import { CSS_EASE_OUT, STATE_MS } from '../theme/motion'
import { useTheme } from '../theme/theme'
import { fonts, radius } from '../theme/tokens'

/**
 * The message field. Send is the one filled control on the screen, and only
 * once there is something to send; it fills in over 150ms, quick enough for
 * something that happens with every message.
 */
export function Composer({
  value,
  onChange,
  onSend,
}: {
  value: string
  onChange: (text: string) => void
  onSend: () => void
}) {
  const { colors } = useTheme()
  const [focused, setFocused] = useState(false)
  const ready = value.trim().length > 0

  const send = () => {
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
        onPress={send}
        disabled={!ready}
        accessibilityRole="button"
        accessibilityLabel="Send"
        accessibilityState={{ disabled: !ready }}
        hitSlop={6}
        style={[
          styles.send,
          { backgroundColor: ready ? colors.accent : colors.panel2 },
        ]}
      >
        <ArrowUpIcon
          size={19}
          weight="bold"
          color={ready ? colors.onAccent : colors.text3}
        />
      </PressableScale>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    minHeight: 54,
    paddingLeft: 16,
    paddingRight: 7,
    borderWidth: 1,
    borderRadius: radius.frame + 4,
  },
  input: {
    flex: 1,
    maxHeight: 136,
    paddingTop: 15,
    paddingBottom: 15,
    paddingRight: 8,
    fontFamily: fonts.sans,
    fontSize: 16,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  send: {
    width: 40,
    height: 40,
    marginBottom: 6,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    transitionProperty: ['transform', 'backgroundColor'],
    transitionDuration: STATE_MS,
  },
})
