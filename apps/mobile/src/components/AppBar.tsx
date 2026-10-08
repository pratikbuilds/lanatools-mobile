import { StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BrandMark } from '../brand/BrandMark'
import { useTheme } from '../theme/theme'
import { fonts } from '../theme/tokens'
import { PressableScale } from './PressableScale'
import type { ReactNode } from 'react'

/**
 * The top app bar: the mark and a title on the left, one action on the
 * right. It sits on the page colour and draws its hairline only once content
 * scrolls beneath it.
 */
export function AppBar({
  title,
  right,
  raised = false,
  animateMark = false,
}: {
  title: string
  right?: ReactNode
  raised?: boolean
  animateMark?: boolean
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
          borderBottomColor: raised ? colors.line : 'transparent',
        },
      ]}
    >
      <View style={styles.row}>
        <BrandMark size={24} color={colors.text} animate={animateMark} />
        <Text
          style={[styles.title, { color: colors.text }]}
          numberOfLines={1}
          accessibilityRole="header"
          maxFontSizeMultiplier={1.3}
        >
          {title}
        </Text>
        {right && <View style={styles.right}>{right}</View>}
      </View>
    </View>
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
    gap: 10,
    paddingLeft: 16,
    paddingRight: 12,
  },
  title: {
    flexShrink: 1,
    fontFamily: fonts.mono,
    fontWeight: '600',
    fontSize: 15,
    letterSpacing: 15 * -0.02,
  },
  right: { marginLeft: 'auto' },
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
