import { useState } from 'react'
import { Pressable, StyleSheet, TextInput, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import { ArrowUpIcon } from 'phosphor-react-native/src/icons/ArrowUp'
import { useTheme } from '../theme/theme'
import { fonts, radius } from '../theme/tokens'

/**
 * The message field, pinned above the keyboard. Send is the one filled
 * control on the screen, and only once there is something to send.
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
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onSend()
  }

  return (
    <View
      style={[
        styles.field,
        {
          backgroundColor: colors.panel,
          borderColor: focused ? colors.text3 : colors.line2,
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
        multiline
        maxLength={4000}
        maxFontSizeMultiplier={1.3}
        accessibilityLabel="Message"
        style={[styles.input, { color: colors.text }]}
      />
      <Pressable
        onPress={send}
        disabled={!ready}
        accessibilityRole="button"
        accessibilityLabel="Send"
        accessibilityState={{ disabled: !ready }}
        hitSlop={4}
        style={({ pressed }) => [
          styles.send,
          {
            backgroundColor: ready ? colors.accent : colors.panel2,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <ArrowUpIcon
          size={19}
          weight="bold"
          color={ready ? colors.onAccent : colors.text3}
        />
      </Pressable>
    </View>
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
  },
})
