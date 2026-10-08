import type { TextStyle } from 'react-native'
import { fonts } from './tokens'

// Type styles from the dashboard. Mono carries labels, numbers, buttons,
// addresses and headings; Inter Tight carries sentences.

/** `.d-label`: the small uppercase mono label of a ledger. */
export const label: TextStyle = {
  fontFamily: fonts.mono,
  fontWeight: '500',
  fontSize: 11,
  letterSpacing: 11 * 0.06,
  textTransform: 'uppercase',
}

/** Body sentences, `.dash` base: Inter Tight 14/1.5. */
export const body: TextStyle = {
  fontFamily: fonts.sans,
  fontWeight: '400',
  fontSize: 14,
  lineHeight: 21,
}

/** Help text and footnotes. */
export const small: TextStyle = {
  fontFamily: fonts.sans,
  fontWeight: '400',
  fontSize: 12.5,
  lineHeight: 18,
}

/** `.d-btn`: mono 600 13px. */
export const button: TextStyle = {
  fontFamily: fonts.mono,
  fontWeight: '600',
  fontSize: 13,
}

/** Status bar and status words: mono 500 12px. */
export const status: TextStyle = {
  fontFamily: fonts.mono,
  fontWeight: '500',
  fontSize: 12,
}
