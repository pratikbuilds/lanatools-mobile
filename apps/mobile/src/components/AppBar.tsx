import { StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../theme/theme'
import { fonts, radius } from '../theme/tokens'
import { PressableScale } from './PressableScale'
import type { ReactNode } from 'react'

/**
 * The top app bar: a leading action, the title, and trailing actions. It
 * sits on the page colour with the dashboard's hairline beneath it.
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
          borderBottomColor: colors.line,
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

/** A 44dp icon action in the bar. */
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

/** A compact outlined action for the app bar, such as Connect. */
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
      style={[
        styles.button,
        { borderColor: colors.line2, backgroundColor: colors.panel },
      ]}
      pressedStyle={{ borderColor: colors.text3 }}
    >
      {leading}
      <Text
        style={[styles.buttonText, { color: colors.text }]}
        maxFontSizeMultiplier={1.2}
      >
        {label}
      </Text>
    </PressableScale>
  )
}

const styles = StyleSheet.create({
  bar: { borderBottomWidth: 1 },
  row: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
  },
  title: { flex: 1, paddingHorizontal: 6 },
  titleText: {
    fontFamily: fonts.mono,
    fontWeight: '600',
    fontSize: 15,
    letterSpacing: 15 * -0.02,
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
    borderRadius: radius.button,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    height: 38,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 999,
  },
  buttonText: {
    fontFamily: fonts.mono,
    fontWeight: '600',
    fontSize: 12.5,
  },
})
