import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { CaretDownIcon } from 'phosphor-react-native/src/icons/CaretDown'
import Animated, { FadeIn } from 'react-native-reanimated'
import { LineIcon } from '../brand/SideField'
import { PressableScale } from '../components/PressableScale'
import { StatusDot } from '../components/StatusDot'
import { Hatch } from '../components/surfaces'
import { Label } from '../components/text'
import { CSS_EASE_OUT, EASE_OUT, STATE_MS } from '../theme/motion'
import { useTheme } from '../theme/theme'
import { brand, fonts, radius } from '../theme/tokens'
import type { Provider, ToolPart } from '../agent/types'
import type { IconName } from '../brand/SideField'

const ICON: Record<Provider, IconName> = {
  Helius: 'database',
  Jupiter: 'coin',
  Phoenix: 'chart',
  'pay.sh': 'receipt',
}

const DETAIL_IN = FadeIn.duration(180).easing(EASE_OUT)

function seconds(ms: number) {
  return `${(ms / 1000).toFixed(1)}s`
}

function json(value: unknown) {
  return JSON.stringify(value, null, 2)
}

/**
 * One LanaTools tool call, as the dashboard would log it: the provider's
 * icon in a hatched tile, the tool's name in mono, what it asked for, and
 * its state. A paid call shows what it cost in lime, the colour of money
 * that moved. Tap to see the input and output.
 */
export function ToolCall({ part }: { part: ToolPart }) {
  const { colors } = useTheme()
  const [open, setOpen] = useState(false)
  const running = part.state === 'running'
  const failed = part.state === 'error'

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.panel, borderColor: colors.line },
      ]}
    >
      <PressableScale
        scale={false}
        disabled={running}
        onPress={() => setOpen((value) => !value)}
        accessibilityRole="button"
        accessibilityLabel={`${part.name}, ${part.provider}, ${running ? 'running' : failed ? 'failed' : 'done'}`}
        accessibilityState={{ expanded: open, disabled: running }}
        style={styles.head}
        pressedStyle={{ backgroundColor: colors.panel2 }}
      >
        <View
          style={[
            styles.tile,
            { backgroundColor: colors.panel2, borderColor: colors.line },
          ]}
        >
          <Hatch />
          <LineIcon name={ICON[part.provider]} size={16} color={colors.text} />
        </View>
        <View style={styles.title}>
          <Text
            style={[styles.name, { color: colors.text }]}
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
          >
            {part.name}
          </Text>
          <Text
            style={[styles.summary, { color: colors.text3 }]}
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
          >
            {part.provider} · {part.summary}
          </Text>
        </View>
        {part.costUsd !== undefined && !running && !failed && (
          <View style={[styles.cost, { backgroundColor: brand.lime }]}>
            <Text style={[styles.costText, { color: brand.ink }]}>
              −${part.costUsd.toFixed(2)}
            </Text>
          </View>
        )}
        <View style={styles.state}>
          {running ? (
            <StatusDot state="live" />
          ) : failed ? (
            <Text style={[styles.meta, { color: colors.bad }]}>
              {part.error ?? 'Failed'}
            </Text>
          ) : (
            <>
              {part.durationMs !== undefined && (
                <Text style={[styles.meta, { color: colors.text3 }]}>
                  {seconds(part.durationMs)}
                </Text>
              )}
              <Animated.View
                style={{
                  transform: [{ rotate: open ? '180deg' : '0deg' }],
                  transitionProperty: 'transform',
                  transitionDuration: STATE_MS,
                  transitionTimingFunction: CSS_EASE_OUT,
                }}
              >
                <CaretDownIcon size={14} color={colors.text3} />
              </Animated.View>
            </>
          )}
        </View>
      </PressableScale>
      {open && !running && (
        <Animated.View
          entering={DETAIL_IN}
          style={[styles.detail, { borderTopColor: colors.line }]}
        >
          <Label>Input</Label>
          <Text
            style={[
              styles.json,
              { color: colors.text2, backgroundColor: colors.bg },
            ]}
            selectable
          >
            {json(part.input)}
          </Text>
          {part.output !== undefined && (
            <>
              <Label style={styles.outputLabel}>Output</Label>
              <Text
                style={[
                  styles.json,
                  { color: colors.text2, backgroundColor: colors.bg },
                ]}
                selectable
              >
                {json(part.output)}
              </Text>
            </>
          )}
        </Animated.View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.card,
    overflow: 'hidden',
    marginBottom: 8,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 54,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  tile: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.field,
    overflow: 'hidden',
  },
  title: { flex: 1, gap: 2 },
  name: { fontFamily: fonts.mono, fontWeight: '600', fontSize: 13 },
  summary: { fontFamily: fonts.sans, fontSize: 12.5 },
  cost: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  costText: {
    fontFamily: fonts.mono,
    fontWeight: '600',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  state: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: { fontFamily: fonts.mono, fontSize: 11.5 },
  detail: { borderTopWidth: 1, padding: 12, gap: 6 },
  outputLabel: { marginTop: 6 },
  json: {
    fontFamily: fonts.mono,
    fontSize: 12,
    lineHeight: 18,
    borderRadius: radius.field,
    padding: 10,
    overflow: 'hidden',
  },
})
