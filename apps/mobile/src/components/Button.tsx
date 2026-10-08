import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../theme/theme'
import { radius } from '../theme/tokens'
import * as type from '../theme/type'
import type { ReactNode } from 'react'
import type { StyleProp, ViewStyle } from 'react-native'

/**
 * `.d-btn`: mono, hairline-bordered, on the panel. `primary` fills with the
 * accent (blue by day, paper by night). Pressing shows what hover shows on
 * the web: a darker border, or a slightly lighter fill.
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
  /** md is the dashboard's 34px control (40px touch); lg is the 48px CTA. */
  size?: 'md' | 'lg'
  leading?: ReactNode
  trailing?: string
  disabled?: boolean
  accessibilityHint?: string
  style?: StyleProp<ViewStyle>
}) {
  const { colors } = useTheme()
  const fg = primary ? colors.onAccent : colors.text
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      {...(accessibilityHint ? { accessibilityHint } : {})}
      style={({ pressed }) => [
        styles.base,
        size === 'lg' ? styles.lg : styles.md,
        primary
          ? {
              backgroundColor: colors.accent,
              borderColor: colors.accent,
              opacity: pressed ? 0.9 : 1,
            }
          : {
              backgroundColor: pressed ? colors.bg : colors.panel,
              borderColor: pressed ? colors.text3 : colors.line2,
            },
        disabled && styles.disabled,
        style,
      ]}
    >
      {leading}
      <Text
        style={[type.button, size === 'lg' && styles.lgText, { color: fg }]}
        maxFontSizeMultiplier={1.3}
      >
        {label}
      </Text>
      {trailing && (
        <View style={styles.trailing}>
          <Text
            style={[type.button, size === 'lg' && styles.lgText, { color: fg }]}
            maxFontSizeMultiplier={1.3}
          >
            {trailing}
          </Text>
        </View>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: radius.button,
    paddingHorizontal: 14,
  },
  md: { minHeight: 40 },
  lg: { minHeight: 48 },
  lgText: { fontSize: 13.5 },
  trailing: { marginLeft: -2 },
  disabled: { opacity: 0.5 },
})
