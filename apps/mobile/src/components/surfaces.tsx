import { StyleSheet, View } from 'react-native'
import Svg, { Defs, Pattern, Rect } from 'react-native-svg'
import { useTheme } from '../theme/theme'

/**
 * The dashboard's diagonal hatching, `repeating-linear-gradient(135deg,
 * hatch 0 1px, transparent 1px 7px)`, filling its parent.
 */
export function Hatch({ color }: { color?: string }) {
  const { colors, name } = useTheme()
  const id = `hatch-${name}`
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern
            id={id}
            width={7}
            height={7}
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <Rect width={1} height={7} fill={color ?? colors.hatch} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  )
}
