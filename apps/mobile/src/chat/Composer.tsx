import { useState } from 'react'
import { StyleSheet, TextInput } from 'react-native'
import * as Haptics from 'expo-haptics'
import { ArrowUpIcon } from 'phosphor-react-native/src/icons/ArrowUp'
import { StopIcon } from 'phosphor-react-native/src/icons/Stop'
import Animated from 'react-native-reanimated'
import { PressableScale } from '../components/PressableScale'
import { CSS_EASE_OUT, STATE_MS } from '../theme/motion'
import { useTheme } from '../theme/theme'
import { fonts, radius } from '../theme/tokens'

/**
 * The message field: one round row, the words and Send. Send is the one
 * filled control on the screen, and only once there is something to send;
 * while the agent works it becomes Stop. The field grows with the words
 * and Send stays on the last line.
 */
export function Composer({
  value,
  onChange,
  onSend,
  working = false,
  onStop,
}: {
  value: string
  onChange: (text: string) => void
  onSend: () => void
  working?: boolean
  onStop?: () => void
}) {
  const { colors, name } = useTheme()
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
          borderColor: focused ? colors.line2 : colors.line,
          boxShadow: name === 'light' ? LIFT : undefined,
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
        onPress={press}
        disabled={!filled}
        accessibilityRole="button"
        accessibilityLabel={working ? 'Stop' : 'Send'}
        accessibilityState={{ disabled: !filled }}
        hitSlop={8}
        style={[
          styles.send,
          { backgroundColor: filled ? colors.accent : colors.panel2 },
        ]}
      >
        {working ? (
          <StopIcon size={14} weight="fill" color={colors.onAccent} />
        ) : (
          <ArrowUpIcon
            size={18}
            weight="bold"
            color={ready ? colors.onAccent : colors.text3}
          />
        )}
      </PressableScale>
    </Animated.View>
  )
}

// A soft lift off the paper by day; at night the border carries it.
const LIFT = '0 6px 24px -8px rgba(10, 31, 110, 0.18)'

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 1,
    borderRadius: radius.composer,
    paddingLeft: 8,
    paddingRight: 6,
  },
  input: {
    flex: 1,
    minHeight: 52,
    maxHeight: 148,
    paddingTop: 15,
    paddingBottom: 15,
    paddingHorizontal: 10,
    fontFamily: fonts.sans,
    fontSize: 16,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  send: {
    width: 40,
    height: 40,
    marginBottom: 6,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    transitionProperty: ['transform', 'backgroundColor'],
    transitionDuration: STATE_MS,
  },
})
