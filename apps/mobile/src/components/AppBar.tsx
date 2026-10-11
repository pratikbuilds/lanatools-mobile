import { StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../theme/theme'
import { fonts, radius } from '../theme/tokens'
import { PressableScale } from './PressableScale'
import type { ReactNode } from 'react'

/**
 * The top app bar: a leading action, the title, and trailing actions, on
 * the page colour with nothing under it, so the thread runs up to it.
 */
export function AppBar({
  title,
  leading,
  trailing,
}: {
  title: ReactNode
  leading?: ReactNode
  trailing?: ReactNode
}) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  return (
    <View
      style={[
        styles.bar,
        {
          paddingTop: insets.top,
          backgroundColor: colors.bg,
        },
      ]}
    >
      <View style={styles.row}>
        {leading}
        <View style={styles.title}>{title}</View>
        {trailing && <View style={styles.trailing}>{trailing}</View>}
      </View>
    </View>
  )
}

/** The bar's title text: mono, one line. */
export function BarTitle({ children }: { children: string }) {
  const { colors } = useTheme()
  return (
    <Text
      style={[styles.titleText, { color: colors.text }]}
      numberOfLines={1}
      accessibilityRole="header"
      maxFontSizeMultiplier={1.3}
    >
      {children}
    </Text>
  )
}

/** A 44dp round icon action in the bar. */
export function BarIcon({
  icon,
  label,
  onPress,
}: {
  icon: ReactNode
  label: string
  onPress: () => void
}) {
  const { colors } = useTheme()
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      style={styles.icon}
      pressedStyle={{ backgroundColor: colors.panel2 }}
    >
      {icon}
    </PressableScale>
  )
}

/** The bar's one filled action, such as Connect: an accent pill. */
export function BarButton({
  label,
  onPress,
  leading,
  accessibilityHint,
}: {
  label: string
  onPress: () => void
  leading?: ReactNode
  accessibilityHint?: string
}) {
  const { colors } = useTheme()
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      {...(accessibilityHint ? { accessibilityHint } : {})}
      hitSlop={6}
      style={[styles.button, { backgroundColor: colors.accent }]}
    >
      {leading}
      <Text
        style={[styles.buttonText, { color: colors.onAccent }]}
        maxFontSizeMultiplier={1.2}
      >
        {label}
      </Text>
    </PressableScale>
  )
}

const styles = StyleSheet.create({
  bar: {},
  row: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
  },
  title: { flex: 1, paddingHorizontal: 6 },
  titleText: {
    fontFamily: fonts.sans,
    fontWeight: '600',
    fontSize: 17,
    letterSpacing: 17 * -0.01,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingRight: 10,
  },
  icon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
  },
  buttonText: {
    fontFamily: fonts.mono,
    fontWeight: '600',
    fontSize: 12.5,
  },
})
