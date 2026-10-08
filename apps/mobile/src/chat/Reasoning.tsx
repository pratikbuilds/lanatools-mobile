import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { CaretDownIcon } from 'phosphor-react-native/src/icons/CaretDown'
import Animated, { FadeIn } from 'react-native-reanimated'
import { PressableScale } from '../components/PressableScale'
import { StatusDot } from '../components/StatusDot'
import { Label } from '../components/text'
import { CSS_EASE_OUT, EASE_OUT, STATE_MS } from '../theme/motion'
import { useTheme } from '../theme/theme'
import { fonts } from '../theme/tokens'
import type { ReasoningPart } from '../agent/types'

const OPEN_IN = FadeIn.duration(180).easing(EASE_OUT)

/** The agent's plan, folded to one line once it has finished thinking. */
export function Reasoning({ part }: { part: ReasoningPart }) {
  const { colors } = useTheme()
  const [open, setOpen] = useState(false)
  const thinking = part.durationMs === undefined
  return (
    <View style={styles.wrap}>
      <PressableScale
        scale={false}
        disabled={thinking}
        onPress={() => setOpen((value) => !value)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        hitSlop={8}
        style={styles.row}
      >
        {thinking && <StatusDot state="live" />}
        <Label>
          {thinking
            ? 'Thinking…'
            : `Thought for ${((part.durationMs ?? 0) / 1000).toFixed(1)}s`}
        </Label>
        {!thinking && (
          <Animated.View
            style={{
              transform: [{ rotate: open ? '180deg' : '0deg' }],
              transitionProperty: 'transform',
              transitionDuration: STATE_MS,
              transitionTimingFunction: CSS_EASE_OUT,
            }}
          >
            <CaretDownIcon size={12} color={colors.text3} />
          </Animated.View>
        )}
      </PressableScale>
      {open && (
        <Animated.View
          entering={OPEN_IN}
          style={[styles.body, { borderLeftColor: colors.line2 }]}
        >
          <Text style={[styles.text, { color: colors.text2 }]} selectable>
            {part.text}
          </Text>
        </Animated.View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    minHeight: 28,
  },
  body: { marginTop: 6, borderLeftWidth: 2, paddingLeft: 12 },
  text: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 21 },
})
