import { memo, useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg'
import { useTheme } from '../theme/theme'
import { SOLANA_PATH } from './marks'
import type { LayoutChangeEvent } from 'react-native'

// The dashboard's side field (lanatools/apps/web/src/components/dashboard/
// side-field.tsx): faint marks for agents, Solana transactions and reading
// data. On the web it fills the margins beside the content column; a phone
// has no margins, so here it fills whatever space the content leaves.

type Shape =
  | ['path', string]
  | ['circle', number, number, number]
  | ['rect', number, number, number, number, number]
  | ['ellipse', number, number, number, number]

// The same 24-unit line icons as the web, element for element.
const ICONS = {
  agent: [
    ['rect', 4, 8, 16, 12, 3],
    ['path', 'M12 8V4.5'],
    ['circle', 12, 3.5, 1],
    ['circle', 9, 14, 0.9],
    ['circle', 15, 14, 0.9],
  ],
  spark: [
    ['path', 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z'],
    ['path', 'M19 17v4M17 19h4'],
  ],
  block: [
    ['path', 'M12 3l8 4.5v9L12 21l-8-4.5v-9Z'],
    ['path', 'M4 7.5l8 4.5 8-4.5M12 12v9'],
  ],
  link: [
    ['path', 'M10 14a4 4 0 0 1 0-5.6l2.4-2.4a4 4 0 0 1 5.6 5.6l-1.2 1.2'],
    ['path', 'M14 10a4 4 0 0 1 0 5.6l-2.4 2.4a4 4 0 0 1-5.6-5.6l1.2-1.2'],
  ],
  transfer: [['path', 'M4 8h15l-3.5-3.5M20 16H5l3.5 3.5']],
  coin: [
    ['circle', 12, 12, 8],
    ['circle', 12, 12, 4],
  ],
  receipt: [
    ['path', 'M6 3h12v18l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5-2 1.5Z'],
    ['path', 'M9 8h6M9 12h6M9 16h3'],
  ],
  database: [
    ['ellipse', 12, 6, 7, 2.5],
    [
      'path',
      'M5 6v12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5',
    ],
  ],
  search: [
    ['circle', 11, 11, 6],
    ['path', 'M15.5 15.5L20 20'],
  ],
  doc: [
    ['path', 'M7 3h7l4 4v14H7Z'],
    ['path', 'M14 3v4h4M10 12h5M10 16h5'],
  ],
  chart: [['path', 'M4 20h16M6 16l4-5 3 3 5-7']],
  key: [
    ['circle', 8, 15, 4],
    ['path', 'M11 12l8-8M16 7l2.5 2.5'],
  ],
  shield: [
    ['path', 'M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6Z'],
    ['path', 'M9 12l2 2 4-4'],
  ],
  wallet: [
    ['rect', 3, 7, 18, 13, 2],
    ['path', 'M6 7l10-3.5 1 3.5M16 13.5h2'],
  ],
  clock: [
    ['circle', 12, 12, 8],
    ['path', 'M12 8v4l3 2'],
  ],
  sign: [
    ['path', 'M15 4l5 5-10 10H5v-5Z'],
    ['path', 'M4 21h16'],
  ],
  fee: [['path', 'M13 3L5 14h6l-1 7 8-11h-6Z']],
  api: [['path', 'M8 8l-4 4 4 4M16 8l4 4-4 4M14 5l-4 14']],
  nodes: [
    ['circle', 6, 6, 2],
    ['circle', 18, 9, 2],
    ['circle', 10, 18, 2],
    ['path', 'M8 6.6l8 1.8M7 8l2.3 8M16.4 10.4l-4.8 6.2'],
  ],
} satisfies Record<string, Shape[]>

// The USDC coin, filled rather than stroked, at 0.012 of its 2000 grid.
const USDC = [
  'M1275 1158.33c0-145.83-87.5-195.83-262.5-216.66-125-16.67-150-50-150-108.34s41.67-95.83 125-95.83c75 0 116.67 25 137.5 87.5 4.17 12.5 16.67 20.83 29.17 20.83h66.66c16.67 0 29.17-12.5 29.17-29.16v-4.17c-16.67-91.67-91.67-162.5-187.5-170.83v-100c0-16.67-12.5-29.17-33.33-33.34h-62.5c-16.67 0-29.17 12.5-33.34 33.34v95.83c-125 16.67-204.16 100-204.16 204.17 0 137.5 83.33 191.66 258.33 212.5 116.67 20.83 154.17 45.83 154.17 112.5s-58.34 112.5-137.5 112.5c-108.34 0-145.84-45.84-158.34-108.34-4.16-16.66-16.66-25-29.16-25h-70.84c-16.66 0-29.16 12.5-29.16 29.17v4.17c16.66 104.16 83.33 179.16 220.83 200v100c0 16.66 12.5 29.16 33.33 33.33h62.5c16.67 0 29.17-12.5 33.34-33.33v-100c125-20.84 208.33-108.34 208.33-220.84z',
  'M787.5 1595.83c-325-116.66-491.67-479.16-370.83-800 62.5-175 200-308.33 370.83-370.83 16.67-8.33 25-20.83 25-41.67V325c0-16.67-8.33-29.17-25-33.33-4.17 0-12.5 0-16.67 4.16-395.83 125-612.5 545.84-487.5 941.67 75 233.33 254.17 412.5 487.5 487.5 16.67 8.33 33.34 0 37.5-16.67 4.17-4.16 4.17-8.33 4.17-16.66v-58.34c0-12.5-12.5-29.16-25-37.5zM1229.17 295.83c-16.67-8.33-33.34 0-37.5 16.67-4.17 4.17-4.17 8.33-4.17 16.67v58.33c0 16.67 12.5 33.33 25 41.67 325 116.66 491.67 479.16 370.83 800-62.5 175-200 308.33-370.83 370.83-16.67 8.33-25 20.83-25 41.67V1700c0 16.67 8.33 29.17 25 33.33 4.17 0 12.5 0 16.67-4.16 395.83-125 612.5-545.84 487.5-941.67-75-237.5-258.34-416.67-487.5-491.67z',
]

type Name = keyof typeof ICONS | 'usdc' | 'sol'
// Coins and the Solana mark turn up more often than any one icon.
const NAMES: Name[] = [...(Object.keys(ICONS) as Name[]), 'sol', 'usdc', 'usdc']
// The web scatters on an 80px grid across wide margins. A phone's free space
// comes in narrow bands above and below content, so the grid is tighter.
const CELL = 62

type Mark = { x: number; y: number; s: number; name: Name; acc: boolean }

/**
 * Scatters marks over the field. Seeded, so the field looks the same on
 * every visit, and jittered with gaps, so there is no visible grid. The same
 * generator and constants as the web.
 */
function scatter(width: number, height: number, seed: number) {
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296
  const marks: Mark[] = []
  let last: Name | undefined
  for (let y = 8; y < height - 30; y += CELL) {
    for (let x = 8; x < width - 30; x += CELL) {
      if (rnd() < 0.3) continue
      let name: Name
      do name = NAMES[Math.floor(rnd() * NAMES.length)] ?? 'sol'
      while (name === last)
      last = name
      const mark = {
        x: x + rnd() * (CELL - 32),
        y: y + rnd() * (CELL - 32),
        s: name === 'usdc' ? 14 + rnd() * 4 : 20 + rnd() * 10,
        name,
        acc: rnd() < 0.12,
      }
      // Whole marks only; none is cut by the edge of the field.
      if (mark.x + mark.s < width - 6 && mark.y + mark.s < height - 6)
        marks.push(mark)
    }
  }
  // A few dashed links between near neighbours, like a small network.
  const links: [number, number, number, number][] = []
  for (const [i, p] of marks.entries()) {
    if (rnd() > 0.3) continue
    let best: Mark | undefined
    let distance = Infinity
    for (const [j, q] of marks.entries()) {
      const d = Math.hypot(q.x - p.x, q.y - p.y)
      if (j !== i && d < distance) {
        distance = d
        best = q
      }
    }
    if (best && distance < 90)
      links.push([
        p.x + p.s / 2,
        p.y + p.s / 2,
        best.x + best.s / 2,
        best.y + best.s / 2,
      ])
  }
  return { marks, links }
}

function Part({ shape }: { shape: Shape }) {
  switch (shape[0]) {
    case 'path':
      return <Path d={shape[1]} />
    case 'circle':
      return <Circle cx={shape[1]} cy={shape[2]} r={shape[3]} />
    case 'rect':
      return (
        <Rect
          x={shape[1]}
          y={shape[2]}
          width={shape[3]}
          height={shape[4]}
          rx={shape[5]}
        />
      )
    case 'ellipse':
      return <Ellipse cx={shape[1]} cy={shape[2]} rx={shape[3]} ry={shape[4]} />
  }
}

export type Box = { x: number; y: number; width: number; height: number }

// Marks keep this far from content, and reach full strength this far out:
// the phone's version of the web's fade towards the page column.
const GAP = 14
const FADE = 120

/** Distance from a point to a box; 0 inside it. */
function distance(px: number, py: number, box: Box) {
  const dx = Math.max(box.x - px, 0, px - (box.x + box.width))
  const dy = Math.max(box.y - py, 0, py - (box.y + box.height))
  return Math.hypot(dx, dy)
}

function overlaps(mark: Mark, box: Box) {
  return (
    mark.x < box.x + box.width + GAP &&
    mark.x + mark.s > box.x - GAP &&
    mark.y < box.y + box.height + GAP &&
    mark.y + mark.s > box.y - GAP
  )
}

const Field = memo(function Field({
  width,
  height,
  seed,
  avoid,
  pat,
  patAccent,
}: {
  width: number
  height: number
  seed: number
  avoid: Box[]
  pat: string
  patAccent: string
}) {
  const field = useMemo(
    () => scatter(width, height, seed),
    [width, height, seed],
  )
  // Only the space content leaves free holds marks, fading in with distance.
  const { marks, links } = useMemo(() => {
    const near = (x: number, y: number) =>
      Math.min(Infinity, ...avoid.map((box) => distance(x, y, box)))
    const marks = field.marks
      .filter((mark) => !avoid.some((box) => overlaps(mark, box)))
      .map((mark) => ({
        ...mark,
        o:
          0.12 +
          0.88 *
            Math.min(1, near(mark.x + mark.s / 2, mark.y + mark.s / 2) / FADE),
      }))
    const links = field.links
      .filter(([x1, y1, x2, y2]) =>
        [0, 0.25, 0.5, 0.75, 1].every(
          (t) => near(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t) > GAP,
        ),
      )
      .map(
        ([x1, y1, x2, y2]) =>
          `M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`,
      )
    return { marks, links }
  }, [field, avoid])
  return (
    <Svg width={width} height={height}>
      {links.map((d, index) => (
        <Path
          key={`l${index}`}
          d={d}
          fill="none"
          stroke={pat}
          strokeWidth={1}
          strokeDasharray={[1.5, 4]}
          strokeLinecap="round"
        />
      ))}
      {marks.map((mark, index) => {
        const k = mark.s / 24
        const color = mark.acc ? patAccent : pat
        if (mark.name === 'sol')
          return (
            <Path
              key={index}
              d={SOLANA_PATH}
              fill={pat}
              opacity={0.75 * mark.o}
              transform={`translate(${mark.x.toFixed(1)} ${(mark.y + 2).toFixed(1)}) scale(${((k * 20) / 88).toFixed(3)})`}
            />
          )
        if (mark.name === 'usdc')
          return (
            <G
              key={index}
              fill={color}
              opacity={mark.o}
              transform={`translate(${mark.x.toFixed(1)} ${mark.y.toFixed(1)}) scale(${(k * 0.012).toFixed(4)})`}
            >
              {USDC.map((d) => (
                <Path key={d.slice(0, 12)} d={d} />
              ))}
            </G>
          )
        return (
          <G
            key={index}
            fill="none"
            stroke={color}
            opacity={mark.o}
            strokeWidth={1.5 / k}
            strokeLinecap="round"
            strokeLinejoin="round"
            transform={`translate(${mark.x.toFixed(1)} ${mark.y.toFixed(1)}) scale(${k.toFixed(3)})`}
          >
            {ICONS[mark.name].map((shape, part) => (
              <Part key={part} shape={shape} />
            ))}
          </G>
        )
      })}
    </Svg>
  )
})

/**
 * The dashboard's background pattern, filling its parent behind content.
 * Marks stay out of the `avoid` boxes (in the field's own coordinates), so
 * the pattern only fills the space the content leaves, as on the web.
 */
export function SideField({
  seed = 11,
  avoid = [],
}: {
  seed?: number
  avoid?: Box[]
}) {
  const { colors } = useTheme()
  const [size, setSize] = useState<{ width: number; height: number }>()
  const onLayout = (event: LayoutChangeEvent) => {
    const width = Math.round(event.nativeEvent.layout.width)
    const height = Math.round(event.nativeEvent.layout.height)
    setSize((last) =>
      last?.width === width && last.height === height
        ? last
        : { width, height },
    )
  }
  return (
    <View
      style={StyleSheet.absoluteFill}
      onLayout={onLayout}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {size && (
        <Field
          width={size.width}
          height={size.height}
          seed={seed}
          avoid={avoid}
          pat={colors.pat}
          patAccent={colors.patAccent}
        />
      )}
    </View>
  )
}
