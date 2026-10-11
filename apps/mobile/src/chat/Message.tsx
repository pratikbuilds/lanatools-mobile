import { memo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import * as Haptics from 'expo-haptics'
import { CheckIcon } from 'phosphor-react-native/src/icons/Check'
import { CopyIcon } from 'phosphor-react-native/src/icons/Copy'
import Animated, { FadeIn } from 'react-native-reanimated'
import { BrandMark } from '../brand/BrandMark'
import { PressableScale } from '../components/PressableScale'
import { StatusDot } from '../components/StatusDot'
import { Label } from '../components/text'
import { EASE_OUT } from '../theme/motion'
import { useTheme } from '../theme/theme'
import { fonts, radius } from '../theme/tokens'
import { Activity } from './Activity'
import { Markdown } from './Markdown'
import { TransactionCard } from './TransactionCard'
import type { Step } from './Activity'
import type { Message as MessageType, Part } from '../agent/types'

// Messages arrive by fading in; nothing slides, because a thread gains a
// message many times a day.
const ARRIVE = FadeIn.duration(200).easing(EASE_OUT)

type Segment =
  | { kind: 'steps'; steps: Step[]; at: number }
  | { kind: 'part'; part: Exclude<Part, Step>; at: number }

/**
 * The parts in order, with each run of thinking and tool calls as one.
 * Transactions to sign come last, after the words that introduce them:
 * they are what the reply asks the user to do.
 */
function segment(parts: Part[]): Segment[] {
  const out: Segment[] = []
  const transactions: Segment[] = []
  parts.forEach((part, at) => {
    const last = out.at(-1)
    if (part.type === 'transaction')
      transactions.push({ kind: 'part', part, at })
    else if (part.type === 'reasoning' || part.type === 'tool') {
      if (last?.kind === 'steps') last.steps.push(part)
      else out.push({ kind: 'steps', steps: [part], at })
    } else out.push({ kind: 'part', part, at })
  })
  return [...out, ...transactions]
}

function textOf(message: MessageType) {
  return message.parts
    .flatMap((part) => (part.type === 'text' ? [part.text] : []))
    .join('\n\n')
}

/** What the user sent: a right-aligned bubble on the panel tone. */
function UserMessage({ message }: { message: MessageType }) {
  const { colors } = useTheme()
  return (
    <Animated.View
      entering={ARRIVE}
      style={[styles.user, { backgroundColor: colors.panel2 }]}
    >
      <Text
        style={[styles.userText, { color: colors.text }]}
        selectable
        maxFontSizeMultiplier={1.4}
      >
        {textOf(message)}
      </Text>
    </Animated.View>
  )
}

/** Before the first part arrives: the mark, its caret blinking, at work. */
function Working() {
  const { colors } = useTheme()
  return (
    <View
      style={styles.working}
      accessible
      accessibilityLabel="Your agent is working"
    >
      <BrandMark size={20} color={colors.text} animate />
      <Label>Working…</Label>
    </View>
  )
}

/** Why the turn ended early: coral, the colour of a refusal. */
function Failure({ text }: { text: string }) {
  const { colors } = useTheme()
  return (
    <View style={styles.failure} accessibilityRole="alert">
      <StatusDot state="bad" />
      <Text style={[styles.failureText, { color: colors.bad }]}>{text}</Text>
    </View>
  )
}

function CopyButton({ text }: { text: string }) {
  const { colors } = useTheme()
  const [copied, setCopied] = useState(false)
  return (
    <PressableScale
      onPress={() => {
        void Clipboard.setStringAsync(text)
        void Haptics.selectionAsync()
        setCopied(true)
        setTimeout(() => setCopied(false), 1400)
      }}
      accessibilityRole="button"
      accessibilityLabel={copied ? 'Copied' : 'Copy reply'}
      hitSlop={10}
      style={styles.action}
    >
      {copied ? (
        <CheckIcon size={16} color={colors.live} />
      ) : (
        <CopyIcon size={16} color={colors.text3} />
      )}
    </PressableScale>
  )
}

/** The agent's turn: its thinking, tool calls, words and transactions. */
function AssistantMessage({ message }: { message: MessageType }) {
  const text = textOf(message)
  const segments = segment(message.parts)
  const writing = segments.findLastIndex(
    (seg) => !(seg.kind === 'part' && seg.part.type === 'transaction'),
  )
  return (
    <Animated.View entering={ARRIVE} style={styles.assistant}>
      {message.parts.length === 0 && message.streaming && <Working />}
      {segments.map((seg, index) => {
        // The segment still being written: the last one before any cards.
        const last = index === writing
        if (seg.kind === 'steps')
          return (
            <Activity
              key={`steps-${seg.at}`}
              steps={seg.steps}
              live={message.streaming === true && last}
            />
          )
        const part = seg.part
        switch (part.type) {
          case 'transaction':
            return (
              <TransactionCard
                key={part.id}
                part={part}
                messageId={message.id}
              />
            )
          case 'text':
            return part.text ? (
              <Markdown
                key={seg.at}
                streaming={message.streaming === true && last}
              >
                {part.text}
              </Markdown>
            ) : null
        }
      })}
      {message.stopped && <Label>Stopped</Label>}
      {message.error && <Failure text={message.error} />}
      {!message.streaming && text.length > 0 && (
        <View style={styles.actions}>
          <CopyButton text={text} />
        </View>
      )}
    </Animated.View>
  )
}

export const Message = memo(function Message({
  message,
}: {
  message: MessageType
}) {
  return message.role === 'user' ? (
    <UserMessage message={message} />
  ) : (
    <AssistantMessage message={message} />
  )
})

const styles = StyleSheet.create({
  user: {
    alignSelf: 'flex-end',
    maxWidth: '84%',
    marginTop: 8,
    marginBottom: 22,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: radius.bubble,
  },
  userText: { fontFamily: fonts.sans, fontSize: 16, lineHeight: 23 },
  assistant: { marginBottom: 16 },
  working: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 32,
  },
  failure: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
    marginBottom: 6,
  },
  failureText: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 20,
  },
  actions: { flexDirection: 'row', marginTop: -4 },
  action: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.field,
  },
})
