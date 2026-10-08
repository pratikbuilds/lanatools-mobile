import { memo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import * as Haptics from 'expo-haptics'
import { CheckIcon } from 'phosphor-react-native/src/icons/Check'
import { CopyIcon } from 'phosphor-react-native/src/icons/Copy'
import Animated, { FadeIn } from 'react-native-reanimated'
import { BrandMark } from '../brand/BrandMark'
import { PressableScale } from '../components/PressableScale'
import { Label } from '../components/text'
import { EASE_OUT } from '../theme/motion'
import { useTheme } from '../theme/theme'
import { fonts, radius } from '../theme/tokens'
import { Markdown } from './Markdown'
import { Reasoning } from './Reasoning'
import { ToolCall } from './ToolCall'
import { TransactionCard } from './TransactionCard'
import type { Message as MessageType } from '../agent/types'

// Messages arrive by fading in; nothing slides, because a thread gains a
// message many times a day.
const ARRIVE = FadeIn.duration(200).easing(EASE_OUT)

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
  return (
    <Animated.View entering={ARRIVE} style={styles.assistant}>
      {message.parts.length === 0 && message.streaming && <Working />}
      {message.parts.map((part, index) => {
        switch (part.type) {
          case 'reasoning':
            return <Reasoning key={index} part={part} />
          case 'tool':
            return <ToolCall key={part.id} part={part} />
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
              <Markdown key={index}>{part.text}</Markdown>
            ) : null
        }
      })}
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
    marginBottom: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.frame,
    borderBottomRightRadius: 4,
  },
  userText: { fontFamily: fonts.sans, fontSize: 16, lineHeight: 23 },
  assistant: { marginBottom: 16 },
  working: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 32,
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
