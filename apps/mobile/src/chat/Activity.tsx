import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { CaretRightIcon } from 'phosphor-react-native/src/icons/CaretRight'
import Animated, {
  css,
  FadeIn,
  useReducedMotion,
} from 'react-native-reanimated'
import { LineIcon } from '../brand/SideField'
import { PressableScale } from '../components/PressableScale'
import { CSS_EASE_OUT, EASE_OUT, STATE_MS } from '../theme/motion'
import { useTheme } from '../theme/theme'
import { brand, fonts, radius } from '../theme/tokens'
import type { Provider, ReasoningPart, ToolPart } from '../agent/types'
import type { IconName } from '../brand/SideField'
import type { ReactNode } from 'react'

// What the agent did before it answered, the way Claude and Cursor show it:
// a quiet line of text, not a stack of cards. While the agent works the
// steps are open and the current one pulses; once it is done they fold to
// one line, "Used 2 tools · 0.8s", which opens again on a tap.

export type Step = ReasoningPart | ToolPart

const ICON: Record<Provider, IconName> = {
  Helius: 'database',
  Jupiter: 'coin',
  Phoenix: 'chart',
  'pay.sh': 'receipt',
  LanaTools: 'agent',
}

// Tools whose names read badly as words.
const TITLES: Record<string, string> = {
  whoami: 'Check account',
  call: 'Paid API call',
}

const PREFIX = /^(jupiter|phoenix)_/

/** `jupiter_get_prices` as a step title: "Get prices". */
export function toolTitle(name: string) {
  const title = TITLES[name] ?? name.replace(PREFIX, '').replaceAll('_', ' ')
  return title.charAt(0).toUpperCase() + title.slice(1)
}

const STEP_IN = FadeIn.duration(180).easing(EASE_OUT)

// The working step's label breathes, the one thing moving in the thread.
const BREATHE = css.keyframes({
  from: { opacity: 1 },
  to: { opacity: 0.45 },
})

function seconds(ms: number) {
  return `${(ms / 1000).toFixed(1)}s`
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

/** The folded line: what happened, how long it took, what it cost. */
function summary(steps: Step[]) {
  const tools = steps.filter((s): s is ToolPart => s.type === 'tool')
  const thought = steps.some((s) => s.type === 'reasoning')
  const failed = tools.filter((t) => t.state === 'error').length
  const used = plural(tools.length, 'tool')
  const text =
    tools.length === 0
      ? 'Thought'
      : thought
        ? `Thought, used ${used}`
        : `Used ${used}`
  const ms = steps.reduce((sum, s) => sum + (s.durationMs ?? 0), 0)
  return {
    text,
    time: ms > 0 ? seconds(ms) : null,
    failed,
    cost: tools.reduce((sum, t) => sum + (t.costUsd ?? 0), 0),
  }
}

function Pulse({ children, on }: { children: ReactNode; on: boolean }) {
  const reduced = useReducedMotion()
  return (
    <Animated.View
      style={
        on && !reduced
          ? {
              animationName: BREATHE,
              animationDuration: 900,
              animationIterationCount: 'infinite',
              animationDirection: 'alternate',
              animationTimingFunction: 'ease-in-out',
            }
          : undefined
      }
    >
      {children}
    </Animated.View>
  )
}

function Caret({ open, color }: { open: boolean; color: string }) {
  return (
    <Animated.View
      style={{
        transform: [{ rotate: open ? '90deg' : '0deg' }],
        transitionProperty: 'transform',
        transitionDuration: STATE_MS,
        transitionTimingFunction: CSS_EASE_OUT,
      }}
    >
      <CaretRightIcon size={12} weight="bold" color={color} />
    </Animated.View>
  )
}

/** Money that moved: lime, as on the dashboard. */
function Cost({ usd }: { usd: number }) {
  return (
    <View style={[styles.cost, { backgroundColor: brand.lime }]}>
      <Text style={[styles.costText, { color: brand.ink }]}>
        −${usd.toFixed(2)}
      </Text>
    </View>
  )
}

function json(value: unknown) {
  const text =
    typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  return text ?? ''
}

function Detail({ label, value }: { label: string; value: unknown }) {
  const { colors } = useTheme()
  return (
    <View style={styles.detail}>
      <Text style={[styles.detailLabel, { color: colors.text3 }]}>{label}</Text>
      <Text
        style={[
          styles.json,
          { color: colors.text2, backgroundColor: colors.panel },
        ]}
        numberOfLines={16}
        selectable
      >
        {json(value)}
      </Text>
    </View>
  )
}

/** One step on the timeline: its icon, title, and what it asked for. */
function StepRow({ step, last }: { step: Step; last: boolean }) {
  const { colors } = useTheme()
  const [open, setOpen] = useState(false)
  const running =
    step.type === 'tool' ? step.state === 'running' : step.state === 'streaming'
  const failed = step.type === 'tool' && step.state === 'error'

  const title =
    step.type === 'reasoning'
      ? running
        ? 'Thinking'
        : step.durationMs === undefined
          ? 'Thought'
          : `Thought for ${seconds(step.durationMs)}`
      : toolTitle(step.name)
  const detail =
    step.type === 'tool'
      ? [step.provider, step.summary].filter(Boolean).join(' · ')
      : null
  const openable = !running && (step.type === 'reasoning' ? !!step.text : true)

  return (
    <Animated.View entering={STEP_IN} style={styles.step}>
      <View style={styles.rail}>
        <View style={styles.railIcon}>
          {step.type === 'reasoning' ? (
            <LineIcon name="spark" size={14} color={colors.text3} />
          ) : (
            <LineIcon
              name={ICON[step.provider]}
              size={14}
              color={failed ? colors.bad : colors.text3}
            />
          )}
        </View>
        {!last && (
          <View style={[styles.railLine, { backgroundColor: colors.line }]} />
        )}
      </View>
      <View style={styles.stepBody}>
        <PressableScale
          scale={false}
          disabled={!openable}
          onPress={() => setOpen((value) => !value)}
          accessibilityRole="button"
          accessibilityLabel={`${title}${detail ? `, ${detail}` : ''}${running ? ', running' : failed ? ', failed' : ''}`}
          accessibilityState={{ expanded: open, disabled: !openable }}
          hitSlop={4}
          style={styles.stepHead}
        >
          <View style={styles.stepText}>
            <Pulse on={running}>
              <Text
                style={[styles.stepTitle, { color: colors.text }]}
                numberOfLines={1}
                maxFontSizeMultiplier={1.3}
              >
                {running ? `${title}…` : title}
              </Text>
            </Pulse>
            {(detail || failed) && (
              <Text
                style={[
                  styles.stepDetail,
                  { color: failed ? colors.bad : colors.text3 },
                ]}
                numberOfLines={1}
                maxFontSizeMultiplier={1.3}
              >
                {failed && step.type === 'tool'
                  ? (step.error ?? 'Failed')
                  : detail}
              </Text>
            )}
          </View>
          {step.type === 'tool' && step.costUsd !== undefined && !failed && (
            <Cost usd={step.costUsd} />
          )}
          {!running &&
            step.type === 'tool' &&
            step.durationMs !== undefined && (
              <Text style={[styles.time, { color: colors.text3 }]}>
                {seconds(step.durationMs)}
              </Text>
            )}
        </PressableScale>
        {open && (
          <Animated.View entering={STEP_IN}>
            {step.type === 'reasoning' ? (
              <Text
                style={[styles.thought, { color: colors.text2 }]}
                selectable
              >
                {step.text}
              </Text>
            ) : (
              <>
                <Detail label="Request" value={step.input} />
                {step.output !== undefined && (
                  <Detail label="Response" value={step.output} />
                )}
              </>
            )}
          </Animated.View>
        )}
      </View>
    </Animated.View>
  )
}

/**
 * A run of steps: open while the agent works on them, folded to one line
 * after. A tap on the line opens or folds it.
 */
export function Activity({ steps, live }: { steps: Step[]; live: boolean }) {
  const { colors } = useTheme()
  const [chosen, setChosen] = useState<boolean | null>(null)
  const open = chosen ?? live
  const done = summary(steps)

  return (
    <View style={styles.wrap}>
      {!live && (
        <PressableScale
          scale={false}
          onPress={() => setChosen(!open)}
          accessibilityRole="button"
          accessibilityLabel={`${done.text}${done.time ? `, ${done.time}` : ''}`}
          accessibilityState={{ expanded: open }}
          hitSlop={8}
          style={styles.head}
        >
          <Text
            style={[styles.headText, { color: colors.text2 }]}
            maxFontSizeMultiplier={1.3}
          >
            {done.text}
          </Text>
          {done.time && (
            <Text style={[styles.time, { color: colors.text3 }]}>
              {done.time}
            </Text>
          )}
          {done.failed > 0 && (
            <Text style={[styles.time, { color: colors.bad }]}>
              {done.failed} failed
            </Text>
          )}
          {done.cost > 0 && <Cost usd={done.cost} />}
          <Caret open={open} color={colors.text3} />
        </PressableScale>
      )}
      {open && (
        <View style={[styles.steps, live && styles.stepsLive]}>
          {steps.map((step, index) => (
            <StepRow
              key={step.type === 'tool' ? step.id : `thought-${index}`}
              step={step}
              last={index === steps.length - 1}
            />
          ))}
        </View>
      )}
    </View>
  )
}

const RAIL = 20

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    minHeight: 30,
  },
  headText: { fontFamily: fonts.sans, fontWeight: '500', fontSize: 14.5 },
  steps: { marginTop: 4 },
  stepsLive: { marginTop: 0 },
  step: { flexDirection: 'row', gap: 10 },
  rail: { width: RAIL, alignItems: 'center' },
  railIcon: {
    width: RAIL,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  railLine: { flex: 1, width: 1, marginBottom: 2 },
  stepBody: { flex: 1, paddingBottom: 6 },
  stepHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    minHeight: 28,
    paddingTop: 4,
  },
  stepText: { flex: 1, gap: 1 },
  stepTitle: { fontFamily: fonts.sans, fontWeight: '500', fontSize: 14.5 },
  stepDetail: { fontFamily: fonts.mono, fontSize: 12 },
  time: {
    fontFamily: fonts.mono,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  cost: {
    borderRadius: radius.highlight,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  costText: {
    fontFamily: fonts.mono,
    fontWeight: '600',
    fontSize: 11.5,
    fontVariant: ['tabular-nums'],
  },
  thought: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 2,
    marginBottom: 6,
  },
  detail: { marginTop: 6, gap: 4 },
  detailLabel: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.6 },
  json: {
    fontFamily: fonts.mono,
    fontSize: 11.5,
    lineHeight: 17,
    borderRadius: radius.field,
    paddingHorizontal: 10,
    paddingVertical: 8,
    overflow: 'hidden',
  },
})
