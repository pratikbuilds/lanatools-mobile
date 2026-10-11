import { StyleSheet, Text } from 'react-native'
import { useTheme } from '../theme/theme'
import { radius } from '../theme/tokens'
import * as type from '../theme/type'
import { PressableScale } from './PressableScale'
import type { ReactNode } from 'react'
import type { StyleProp, ViewStyle } from 'react-native'

/**
 * A pill: mono label, hairline border, on the panel. `primary` fills with
 * the accent (blue by day, paper by night). A press scales it and darkens
 * the border, where the web darkens it on hover.
 */
export function Button({
  label,
  onPress,
  primary = false,
  size = 'md',
  leading,
  trailing,
  disabled = false,
  accessibilityHint,
  style,
}: {
  label: string
  onPress?: () => void
  primary?: boolean
  /** md is a 44dp control; lg is the 48dp primary action. */
  size?: 'md' | 'lg'
  leading?: ReactNode
  trailing?: string
  disabled?: boolean
  accessibilityHint?: string
  style?: StyleProp<ViewStyle>
}) {
  const { colors } = useTheme()
  const fg = primary ? colors.onAccent : colors.text
  const text = [type.button, size === 'lg' && styles.lgText, { color: fg }]
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      {...(accessibilityHint ? { accessibilityHint } : {})}
      style={[
        styles.base,
        size === 'lg' ? styles.lg : styles.md,
        primary
          ? { backgroundColor: colors.accent, borderColor: colors.accent }
          : { backgroundColor: colors.panel, borderColor: colors.line2 },
        disabled && styles.disabled,
        style,
      ]}
      pressedStyle={!primary && { borderColor: colors.text3 }}
    >
      {leading}
      <Text style={text} maxFontSizeMultiplier={1.3}>
        {label}
      </Text>
      {trailing && (
        <Text style={text} maxFontSizeMultiplier={1.3}>
          {trailing}
        </Text>
      )}
    </PressableScale>
  )
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 18,
  },
  md: { minHeight: 44 },
  lg: { minHeight: 48 },
  lgText: { fontSize: 13.5 },
  disabled: { opacity: 0.5 },
})
