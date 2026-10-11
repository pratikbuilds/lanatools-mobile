import { memo, useMemo } from 'react'
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { gfmTableFromMarkdown } from 'mdast-util-gfm-table'
import { gfmTable } from 'micromark-extension-gfm-table'
import Animated, { FadeIn } from 'react-native-reanimated'
import remend from 'remend'
import { EASE_OUT } from '../theme/motion'
import { useTheme } from '../theme/theme'
import { fonts, radius } from '../theme/tokens'
import * as type from '../theme/type'
import type { Palette } from '../theme/tokens'
import type {
  PhrasingContent,
  Root,
  RootContent,
  Table,
  TableCell,
} from 'mdast'
import type { ReactNode } from 'react'
import type { TextStyle } from 'react-native'

// The agent's replies, rendered in the brand's type: sentences in Inter
// Tight, figures and code in Paper Mono, tables as a light ledger.

const OPTIONS = {
  extensions: [gfmTable()],
  mdastExtensions: [gfmTableFromMarkdown()],
}

/** `$` is a price far more often than maths in these replies. */
const REMEND = {
  linkMode: 'text-only',
  inlineKatex: false,
  katex: false,
} as const

// A block that arrives mid-stream fades in; words within the last block
// simply appear, as text does when typed.
const BLOCK_IN = FadeIn.duration(220).easing(EASE_OUT)

/** A cell that is a figure: amounts, prices, percentages. */
const FIGURE = /^[\s$€£+\-−~≈]*[\d.,]+\s*[%A-Za-z]{0,4}$/

function plain(nodes: PhrasingContent[]): string {
  return nodes
    .map((node) =>
      'value' in node
        ? node.value
        : 'children' in node
          ? plain(node.children as PhrasingContent[])
          : '',
    )
    .join('')
}

function Inline({
  nodes,
  colors,
  base,
}: {
  nodes: PhrasingContent[]
  colors: Palette
  base?: TextStyle
}): ReactNode {
  return nodes.map((node, index) => {
    switch (node.type) {
      case 'text':
        return node.value
      case 'strong':
        return (
          <Text key={index} style={styles.strong}>
            <Inline nodes={node.children} colors={colors} />
          </Text>
        )
      case 'emphasis':
        return (
          <Text key={index} style={styles.em}>
            <Inline nodes={node.children} colors={colors} />
          </Text>
        )
      case 'inlineCode':
        return (
          <Text
            key={index}
            style={[
              styles.inlineCode,
              { backgroundColor: colors.panel2, color: colors.text },
            ]}
          >
            {` ${node.value} `}
          </Text>
        )
      case 'link':
        return (
          <Text
            key={index}
            style={[styles.link, { color: colors.accent }]}
            onPress={() => void Linking.openURL(node.url)}
            accessibilityRole="link"
          >
            <Inline nodes={node.children} colors={colors} base={base} />
          </Text>
        )
      case 'break':
        return '\n'
      default:
        return 'children' in node ? (
          <Inline
            key={index}
            nodes={node.children as PhrasingContent[]}
            colors={colors}
          />
        ) : null
    }
  })
}

function Ledger({ node, colors }: { node: Table; colors: Palette }) {
  const [head, ...rows] = node.children
  const align = node.align ?? []
  const cell = (c: TableCell, column: number, header: boolean) => {
    const text = plain(c.children)
    const figure = !header && FIGURE.test(text)
    const right = align[column] === 'right' || figure
    return (
      <View
        key={column}
        style={[styles.cell, right && styles.cellRight]}
        accessibilityRole={header ? 'header' : undefined}
      >
        <Text
          style={
            header
              ? [type.label, { color: colors.text3 }]
              : figure
                ? [styles.figure, { color: colors.text }]
                : [styles.cellText, { color: colors.text }]
          }
          maxFontSizeMultiplier={1.3}
        >
          {header ? text : <Inline nodes={c.children} colors={colors} />}
        </Text>
      </View>
    )
  }
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.block}
      contentContainerStyle={styles.ledgerScroll}
    >
      <View
        style={[
          styles.ledger,
          { borderColor: colors.line, backgroundColor: colors.panel },
        ]}
      >
        {head && (
          <View
            style={[
              styles.row,
              styles.headRow,
              { borderBottomColor: colors.line },
            ]}
          >
            {head.children.map((c, i) => cell(c, i, true))}
          </View>
        )}
        {rows.map((row, r) => (
          <View
            key={r}
            style={[
              styles.row,
              r > 0 && { borderTopWidth: 1, borderTopColor: colors.line },
            ]}
          >
            {row.children.map((c, i) => cell(c, i, false))}
          </View>
        ))}
      </View>
    </ScrollView>
  )
}

function Block({
  node,
  colors,
}: {
  node: RootContent
  colors: Palette
}): ReactNode {
  switch (node.type) {
    case 'paragraph':
      return (
        <Text
          style={[styles.paragraph, styles.block, { color: colors.text }]}
          selectable
        >
          <Inline nodes={node.children} colors={colors} />
        </Text>
      )
    case 'heading':
      return (
        <Text
          style={[
            styles.heading,
            styles.block,
            { color: colors.text, fontSize: node.depth <= 2 ? 17 : 15 },
          ]}
          accessibilityRole="header"
        >
          <Inline nodes={node.children} colors={colors} />
        </Text>
      )
    case 'list':
      return (
        <View style={[styles.block, styles.list]}>
          {node.children.map((item, index) => (
            <View key={index} style={styles.item}>
              <Text style={[styles.marker, { color: colors.text3 }]}>
                {node.ordered ? `${(node.start ?? 1) + index}.` : '•'}
              </Text>
              <View style={styles.itemBody}>
                {item.children.map((child, c) =>
                  child.type === 'paragraph' ? (
                    <Text
                      key={c}
                      style={[styles.paragraph, { color: colors.text }]}
                      selectable
                    >
                      <Inline nodes={child.children} colors={colors} />
                    </Text>
                  ) : (
                    <Block key={c} node={child} colors={colors} />
                  ),
                )}
              </View>
            </View>
          ))}
        </View>
      )
    case 'blockquote':
      return (
        <View
          style={[
            styles.block,
            styles.quote,
            { borderLeftColor: colors.line2 },
          ]}
        >
          {node.children.map((child, index) =>
            child.type === 'paragraph' ? (
              <Text
                key={index}
                style={[styles.paragraph, { color: colors.text2 }]}
                selectable
              >
                <Inline nodes={child.children} colors={colors} />
              </Text>
            ) : (
              <Block key={index} node={child} colors={colors} />
            ),
          )}
        </View>
      )
    case 'code':
      return (
        <View
          style={[
            styles.block,
            styles.well,
            { backgroundColor: colors.bg, borderColor: colors.line },
          ]}
        >
          {node.lang && (
            <Text style={[type.label, styles.lang, { color: colors.text3 }]}>
              {node.lang}
            </Text>
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Text style={[styles.code, { color: colors.text }]} selectable>
              {node.value}
            </Text>
          </ScrollView>
        </View>
      )
    case 'table':
      return <Ledger node={node} colors={colors} />
    case 'thematicBreak':
      return (
        <View
          style={[styles.block, styles.rule, { backgroundColor: colors.line }]}
        />
      )
    default:
      return null
  }
}

/**
 * One top-level block. It re-renders only when its own source changes, so
 * while a reply streams in, the finished blocks above the last one stay put.
 */
const MemoBlock = memo(
  function MemoBlock({
    node,
    colors,
    fade,
  }: {
    node: RootContent
    source: string
    colors: Palette
    fade: boolean
  }) {
    return (
      <Animated.View entering={fade ? BLOCK_IN : undefined}>
        <Block node={node} colors={colors} />
      </Animated.View>
    )
  },
  (a, b) => a.source === b.source && a.colors === b.colors,
)

/**
 * Markdown from the agent. While `streaming`, unfinished syntax is closed
 * (`**bo` reads as bold, not as asterisks) and each new block fades in.
 */
export const Markdown = memo(function Markdown({
  children,
  streaming = false,
}: {
  children: string
  streaming?: boolean
}) {
  const { colors } = useTheme()
  const source = streaming ? remend(children, REMEND) : children
  const blocks = useMemo(() => {
    const tree: Root = fromMarkdown(source, OPTIONS)
    return tree.children.map((node) => ({
      node,
      source: source.slice(
        node.position?.start.offset,
        node.position?.end.offset,
      ),
    }))
  }, [source])
  return (
    <View>
      {blocks.map((block, index) => (
        <MemoBlock
          key={index}
          node={block.node}
          source={block.source}
          colors={colors}
          fade={streaming}
        />
      ))}
    </View>
  )
})

const styles = StyleSheet.create({
  block: { marginBottom: 12 },
  paragraph: {
    fontFamily: fonts.sans,
    fontSize: 16,
    lineHeight: 24,
  },
  strong: { fontWeight: '600' },
  em: { fontStyle: 'italic' },
  inlineCode: { fontFamily: fonts.mono, fontSize: 14 },
  link: { textDecorationLine: 'underline' },
  heading: {
    fontFamily: fonts.mono,
    fontWeight: '600',
    letterSpacing: -0.3,
    marginTop: 4,
  },
  list: { gap: 6 },
  item: { flexDirection: 'row' },
  marker: {
    width: 22,
    fontFamily: fonts.mono,
    fontSize: 14,
    lineHeight: 24,
  },
  itemBody: { flex: 1 },
  quote: { borderLeftWidth: 2, paddingLeft: 12 },
  well: {
    borderWidth: 1,
    borderRadius: radius.field,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  lang: { marginBottom: 6 },
  code: { fontFamily: fonts.mono, fontSize: 13, lineHeight: 20 },
  rule: { height: 1 },
  ledgerScroll: { flexGrow: 1 },
  ledger: {
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: radius.frame,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row' },
  headRow: { borderBottomWidth: 1, paddingTop: 2 },
  // Equal flex columns, so every row's cells line up.
  cell: {
    flex: 1,
    minWidth: 84,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  cellRight: { alignItems: 'flex-end' },
  cellText: {
    fontFamily: fonts.sans,
    fontWeight: '500',
    fontSize: 14.5,
    lineHeight: 20,
  },
  figure: {
    fontFamily: fonts.mono,
    fontWeight: '500',
    fontSize: 13.5,
    lineHeight: 20,
    fontVariant: ['tabular-nums'],
  },
})
