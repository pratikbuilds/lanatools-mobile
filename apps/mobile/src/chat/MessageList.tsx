import { useEffect, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { ArrowDownIcon } from 'phosphor-react-native/src/icons/ArrowDown'
import { KeyboardChatScrollView } from 'react-native-keyboard-controller'
import { useDerivedValue, useSharedValue } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { PressableScale } from '../components/PressableScale'
import { CSS_EASE_OUT, STATE_MS } from '../theme/motion'
import { useTheme } from '../theme/theme'
import { radius } from '../theme/tokens'
import { Message } from './Message'
import type { Message as MessageType } from '../agent/types'
import type Reanimated from 'react-native-reanimated'

/**
 * The thread. A message the user sends rises to the top of the screen with
 * room below it for the reply, as in ChatGPT and v0; that room shrinks as
 * the reply grows, so nothing jumps. The thread lifts with the keyboard
 * only when the latest message is in view, follows new words while the
 * user is at the end, and offers a way back down when they scroll up.
 *
 * Render one per conversation (`key` it by id): the exchange it anchors is
 * the one started while it was on screen.
 */
export function MessageList({ messages }: { messages: MessageType[] }) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const scroll = useRef<Reanimated.ScrollView>(null)
  const atEnd = useRef(true)
  // Set when the user drags the thread themselves, so it stops following.
  const dragged = useRef(false)
  const [showDown, setShowDown] = useState(false)

  // The latest exchange, from the user's message down, once the agent is
  // replying to it here. Opening an old conversation anchors nothing.
  const split = messages.findLastIndex((m) => m.role === 'user')
  const live = messages.at(-1)?.streaming === true
  const [anchor, setAnchor] = useState<string | null>(null)
  const latest = messages[split]?.id ?? null
  if (live && latest !== anchor) setAnchor(latest)
  const anchored = anchor !== null && anchor === latest

  // Room below the exchange so that it can sit at the top of the screen:
  // enough that the content reaches the anchor plus a screen. Measured from
  // the messages' own layout, never the content size, which on Android
  // includes this padding and would feed back into it.
  const viewport = useSharedValue(0)
  const anchorY = useSharedValue(0)
  const lastBottom = useSharedValue(0)
  const blankSpace = useDerivedValue(() =>
    anchored
      ? Math.max(
          0,
          anchorY.get() + viewport.get() - lastBottom.get() - PADDING_BOTTOM,
        )
      : 0,
  )

  // When a reply finishes, land on its end: its last words may have pushed
  // the end out of view after following stopped.
  const wasLive = useRef(live)
  useEffect(() => {
    if (wasLive.current && !live && !dragged.current)
      requestAnimationFrame(() =>
        scroll.current?.scrollToEnd({ animated: true }),
      )
    wasLive.current = live
  }, [live])

  // Open at the latest message; after a send, scroll it to the top.
  useEffect(() => {
    atEnd.current = true
    dragged.current = false
    requestAnimationFrame(() =>
      scroll.current?.scrollToEnd({ animated: anchor !== null }),
    )
  }, [anchor])

  return (
    <View style={styles.fill}>
      <KeyboardChatScrollView
        ref={scroll}
        offset={insets.bottom}
        blankSpace={blankSpace}
        keyboardLiftBehavior="whenAtEnd"
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        onLayout={(e) => viewport.set(e.nativeEvent.layout.height)}
        onEndVisible={(visible) => {
          atEnd.current = visible
          if (visible) dragged.current = false
          setShowDown(!visible)
        }}
        onScrollBeginDrag={() => {
          dragged.current = true
        }}
        onContentSizeChange={() => {
          // Follow the reply while it's written, even when a large batch
          // momentarily puts the end out of view, unless the user scrolled
          // away; once they're back at the end, follow again.
          if (atEnd.current || (live && !dragged.current))
            scroll.current?.scrollToEnd({ animated: true })
        }}
      >
        {messages.map((message, index) => (
          <View
            key={message.id}
            onLayout={(e) => {
              const { y, height } = e.nativeEvent.layout
              if (anchored && message.id === anchor) anchorY.set(y)
              if (index === messages.length - 1) lastBottom.set(y + height)
            }}
          >
            <Message message={message} />
          </View>
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

const PADDING_BOTTOM = 8

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: PADDING_BOTTOM,
  },
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
