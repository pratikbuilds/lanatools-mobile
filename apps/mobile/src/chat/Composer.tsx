import { useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import { ArrowUpIcon } from 'phosphor-react-native/src/icons/ArrowUp'
import { StopIcon } from 'phosphor-react-native/src/icons/Stop'
import Animated from 'react-native-reanimated'
import { LineIcon } from '../brand/SideField'
import { PressableScale } from '../components/PressableScale'
import { StatusDot } from '../components/StatusDot'
import { CSS_EASE_OUT, STATE_MS } from '../theme/motion'
import { useTheme } from '../theme/theme'
import { fonts, radius } from '../theme/tokens'

/**
 * The message field: the words on top, and a toolbar under them with the
 * LanaTools chip on the left and Send on the right. Send is the one filled
 * control on the screen, and only once there is something to send; while
 * the agent works it becomes Stop.
 */
export function Composer({
  value,
  onChange,
  onSend,
  working = false,
  onStop,
  onTools,
  toolsLive = false,
}: {
  value: string
  onChange: (text: string) => void
  onSend: () => void
  working?: boolean
  onStop?: () => void
  onTools?: () => void
  /** LanaTools answers this chat's tool calls. */
  toolsLive?: boolean
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
      <View style={styles.toolbar}>
        {onTools ? (
          <PressableScale
            onPress={onTools}
            accessibilityRole="button"
            accessibilityLabel={`LanaTools, ${toolsLive ? 'connected' : 'not connected'}`}
            accessibilityHint="Shows the tools your agent can use"
            hitSlop={6}
            style={[styles.chip, { borderColor: colors.line }]}
            pressedStyle={{ backgroundColor: colors.panel2 }}
          >
            {toolsLive ? (
              <StatusDot state="live" />
            ) : (
              <LineIcon name="nodes" size={14} color={colors.text3} />
            )}
            <Text
              style={[styles.chipText, { color: colors.text2 }]}
              maxFontSizeMultiplier={1.2}
            >
              LanaTools
            </Text>
          </PressableScale>
        ) : (
          <View />
        )}
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
      </View>
    </Animated.View>
  )
}

// A soft lift off the paper by day; at night the border carries it.
const LIFT = '0 6px 24px -8px rgba(10, 31, 110, 0.18)'

const styles = StyleSheet.create({
  field: {
    borderWidth: 1,
    borderRadius: radius.composer,
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  input: {
    minHeight: 48,
    maxHeight: 148,
    paddingTop: 14,
    paddingBottom: 6,
    paddingHorizontal: 10,
    fontFamily: fonts.sans,
    fontSize: 16,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingLeft: 10,
    paddingRight: 12,
    borderWidth: 1,
    borderRadius: radius.pill,
  },
  chipText: { fontFamily: fonts.mono, fontWeight: '500', fontSize: 12.5 },
  send: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    transitionProperty: ['transform', 'backgroundColor'],
    transitionDuration: STATE_MS,
  },
})
