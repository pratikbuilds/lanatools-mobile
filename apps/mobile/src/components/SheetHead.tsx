import { StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { XIcon } from 'phosphor-react-native/src/icons/X'
import { BrandMark } from '../brand/BrandMark'
import { useTheme } from '../theme/theme'
import { PressableScale } from './PressableScale'
import { Hatch } from './surfaces'
import { fonts } from '../theme/tokens'
import { Mono } from './text'
import type { ReactNode } from 'react'

/** A form sheet's content: the panel, padded clear of the nav bar. */
export function SheetScreen({
  context,
  children,
}: {
  context?: string
  children: ReactNode
}) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  return (
    <View
      style={{
        backgroundColor: colors.panel,
        paddingBottom: insets.bottom + 16,
      }}
    >
      <SheetHead {...(context ? { context } : {})} />
      <View style={styles.body}>{children}</View>
    </View>
  )
}

/** A sheet's heading: the sign-in card's mono title. */
export function SheetTitle({ children }: { children: string }) {
  const { colors } = useTheme()
  return (
    <Text
      style={[styles.title, { color: colors.text }]}
      accessibilityRole="header"
      maxFontSizeMultiplier={1.3}
    >
      {children}
    </Text>
  )
}

/**
 * The top of every sheet: a drawn grabber (Android's form sheet has none),
 * then the consent card's hatched band with the mark, a context word, and
 * a close button.
 */
export function SheetHead({ context }: { context?: string }) {
  const { colors } = useTheme()
  return (
    <>
      <View style={[styles.grabber, { backgroundColor: colors.line2 }]} />
      <View style={[styles.head, { borderColor: colors.line }]}>
        <Hatch />
        <BrandMark size={18} color={colors.text} />
        <Mono size={13} weight="700">
          lanatools.sh
        </Mono>
        {context && (
          <Mono size={13} weight="500" tone="text3">
            · {context}
          </Mono>
        )}
        <PressableScale
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={10}
          style={styles.close}
          pressedStyle={{ backgroundColor: colors.panel2 }}
        >
          <XIcon size={18} color={colors.text2} />
        </PressableScale>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 20, paddingTop: 20 },
  title: {
    marginTop: 10,
    fontFamily: fonts.mono,
    fontWeight: '600',
    fontSize: 22,
    lineHeight: 27,
    letterSpacing: 22 * -0.04,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    marginTop: 10,
    marginBottom: 10,
    borderRadius: 2,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 46,
    paddingLeft: 20,
    paddingRight: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  close: {
    marginLeft: 'auto',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
