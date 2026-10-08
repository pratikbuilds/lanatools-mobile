import { Text } from 'react-native'
import { useTheme } from '../theme/theme'
import * as type from '../theme/type'
import type { ReactNode } from 'react'
import type { StyleProp, TextStyle } from 'react-native'

type Tone = 'text' | 'text2' | 'text3' | 'bad'

// Large system font sizes still apply, up to the point where the mono
// layouts, built on a ledger grid, would break.
const MAX_SCALE = 1.4

function Styled({
  base,
  tone,
  style,
  children,
  role,
}: {
  base: TextStyle
  tone: Tone
  style?: StyleProp<TextStyle> | undefined
  children: ReactNode
  role?: 'alert' | undefined
}) {
  const { colors } = useTheme()
  return (
    <Text
      style={[base, { color: colors[tone] }, style]}
      maxFontSizeMultiplier={MAX_SCALE}
      {...(role ? { accessibilityRole: role } : {})}
    >
      {children}
    </Text>
  )
}

type Props = {
  children: ReactNode
  tone?: Tone
  style?: StyleProp<TextStyle>
}

/** `.d-label`: uppercase mono, as on a ledger. */
export function Label({ children, tone = 'text3', style }: Props) {
  return (
    <Styled base={type.label} tone={tone} style={style}>
      {children}
    </Styled>
  )
}

export function Body({ children, tone = 'text2', style }: Props) {
  return (
    <Styled base={type.body} tone={tone} style={style}>
      {children}
    </Styled>
  )
}

export function Small({
  children,
  tone = 'text3',
  style,
  alert = false,
}: Props & { alert?: boolean }) {
  return (
    <Styled
      base={type.small}
      tone={tone}
      style={style}
      role={alert ? 'alert' : undefined}
    >
      {children}
    </Styled>
  )
}

/** Mono at a given size and weight, for names, figures and controls. */
export function Mono({
  children,
  tone = 'text',
  size = 13,
  weight = '500',
  style,
}: Props & { size?: number; weight?: '400' | '500' | '600' | '700' }) {
  return (
    <Styled
      base={{ ...type.status, fontSize: size, fontWeight: weight }}
      tone={tone}
      style={style}
    >
      {children}
    </Styled>
  )
}
