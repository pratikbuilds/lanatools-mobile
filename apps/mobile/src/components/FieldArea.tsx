import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import Animated from 'react-native-reanimated'
import { SideField } from '../brand/SideField'
import type { Box } from '../brand/SideField'
import type { ComponentProps, ReactNode } from 'react'
import type { LayoutChangeEvent, StyleProp, ViewStyle } from 'react-native'

type Report = (key: string, box: Box | null) => void
const ReportContext = createContext<Report | null>(null)

function useBoxes() {
  const [boxes, setBoxes] = useState<Record<string, Box>>({})
  const report = useCallback<Report>((key, box) => {
    setBoxes((last) => {
      const prev = last[key]
      if (
        box &&
        prev &&
        prev.x === box.x &&
        prev.y === box.y &&
        prev.width === box.width &&
        prev.height === box.height
      )
        return last
      const next = { ...last }
      if (box) next[key] = box
      else delete next[key]
      return next
    })
  }, [])
  const avoid = useMemo(() => Object.values(boxes), [boxes])
  return { avoid, report }
}

/**
 * An area on the side-field pattern. The pattern keeps out of every `Clear`
 * block inside it, so it only fills the space the content leaves, as it does
 * beside the column on the web. `scroll` makes it a scroll view whose pattern
 * moves with the content.
 */
export function FieldArea({
  children,
  scroll = false,
  style,
  fieldStyle,
}: {
  children: ReactNode
  scroll?: boolean
  style?: StyleProp<ViewStyle>
  /** An animated style for the pattern layer, such as a fade. */
  fieldStyle?: ComponentProps<typeof Animated.View>['style']
}) {
  const { avoid, report } = useBoxes()
  const body = (
    <>
      <Animated.View
        style={[StyleSheet.absoluteFill, fieldStyle]}
        pointerEvents="none"
      >
        <SideField avoid={avoid} />
      </Animated.View>
      <ReportContext value={report}>{children}</ReportContext>
    </>
  )
  if (!scroll) return <View style={[styles.fill, style]}>{body}</View>
  return (
    <ScrollView
      contentContainerStyle={[styles.content, style]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {body}
    </ScrollView>
  )
}

/**
 * A block the pattern keeps clear of. It must be a direct child of
 * `FieldArea`, so its layout is in the field's coordinates.
 */
export function Clear({
  id,
  children,
  style,
}: {
  id: string
  children: ReactNode
  style?: StyleProp<ViewStyle>
}) {
  const report = use(ReportContext)
  useEffect(() => () => report?.(id, null), [id, report])
  const onLayout = (event: LayoutChangeEvent) => {
    const { x, y, width, height } = event.nativeEvent.layout
    report?.(id, { x, y, width, height })
  }
  return (
    <View style={style} onLayout={onLayout}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flexGrow: 1 },
})
