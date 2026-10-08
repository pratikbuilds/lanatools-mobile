import { useEffect, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { ArrowDownIcon } from 'phosphor-react-native/src/icons/ArrowDown'
import { KeyboardChatScrollView } from 'react-native-keyboard-controller'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { PressableScale } from '../components/PressableScale'
import { CSS_EASE_OUT, STATE_MS } from '../theme/motion'
import { useTheme } from '../theme/theme'
import { radius } from '../theme/tokens'
import { Message } from './Message'
import type { Message as MessageType } from '../agent/types'
import type Reanimated from 'react-native-reanimated'

/**
 * The thread. It lifts with the keyboard only when the latest message is in
 * view, follows new words while the user is at the end, and offers a way
 * back down when they have scrolled up to read.
 */
export function MessageList({
  conversationId,
  messages,
}: {
  conversationId: string
  messages: MessageType[]
}) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const scroll = useRef<Reanimated.ScrollView>(null)
  const atEnd = useRef(true)
  const [showDown, setShowDown] = useState(false)

  // A different conversation opens at its latest message.
  useEffect(() => {
    atEnd.current = true
    requestAnimationFrame(() =>
      scroll.current?.scrollToEnd({ animated: false }),
    )
  }, [conversationId])

  return (
    <View style={styles.fill}>
      <KeyboardChatScrollView
        ref={scroll}
        offset={insets.bottom}
        keyboardLiftBehavior="whenAtEnd"
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        onEndVisible={(visible) => {
          atEnd.current = visible
          setShowDown(!visible)
        }}
        onContentSizeChange={() => {
          if (atEnd.current) scroll.current?.scrollToEnd({ animated: true })
        }}
      >
        {messages.map((message) => (
          <Message key={message.id} message={message} />
        ))}
      </KeyboardChatScrollView>
      <PressableScale
        onPress={() => scroll.current?.scrollToEnd({ animated: true })}
        accessibilityRole="button"
        accessibilityLabel="Scroll to the latest message"
        disabled={!showDown}
        pointerEvents={showDown ? 'auto' : 'none'}
        hitSlop={8}
        style={[
          styles.down,
          {
            backgroundColor: colors.panel,
            borderColor: colors.line2,
            opacity: showDown ? 1 : 0,
            transform: [{ scale: showDown ? 1 : 0.9 }],
            transitionProperty: ['opacity', 'transform'],
            transitionDuration: STATE_MS,
            transitionTimingFunction: CSS_EASE_OUT,
          },
        ]}
      >
        <ArrowDownIcon size={16} color={colors.text} />
      </PressableScale>
    </View>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  down: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 10,
    width: 36,
    height: 36,
    borderRadius: radius.button * 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
