import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg'
import { SOLANA_PATH } from '../brand/marks'
import { brand } from '../theme/tokens'
import type { ReactNode } from 'react'

// The small drawings on the toolkit cards, from the landing page's wallet
// fan (lanatools/apps/web/src/components/landing/wallet-fan.tsx). They are
// brand illustrations, so they keep the landing's paper, ink and lime in
// both themes. `on` is the card being played.

export const CARD_FACE = '#fffdf8'
const MUTED = '#ddd6c6'

export type ArtProps = { on: boolean }

function Art({ children }: { children: ReactNode }) {
  return (
    <Svg width={136} height={60} viewBox="0 0 136 60">
      <G
        fill="none"
        stroke={brand.ink}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </G>
    </Svg>
  )
}

function Coin({ y }: { y: number }) {
  return (
    <>
      <Path d={`M4 ${y} v7 a24 7 0 0 0 48 0 v-7`} fill={CARD_FACE} />
      <Ellipse cx={28} cy={y} rx={24} ry={7} fill={brand.lime} />
    </>
  )
}

export function PayArt({ on }: ArtProps) {
  return (
    <Art>
      <Coin y={46} />
      <Coin y={37} />
      <Coin y={28} />
      {on && <Coin y={19} />}
      <Path d="M62 37 H86" strokeDasharray={[3, 3]} />
      <Path d="M83 33 l4 4 -4 4" />
      <Rect
        x={94}
        y={22}
        width={41}
        height={30}
        rx={5}
        fill={on ? brand.lime : CARD_FACE}
      />
      <Path d="M102 31 h14 M102 37 h25 M102 43 h18" />
    </Art>
  )
}

export function ReadArt({ on }: ArtProps) {
  return (
    <Art>
      {[0, 1, 2].map((i) => {
        const y = 3 + i * 19
        return (
          <G key={i}>
            <Rect
              x={0.75}
              y={y}
              width={134.5}
              height={15}
              rx={4}
              fill={on || i === 0 ? brand.lime : CARD_FACE}
            />
            <Rect
              x={5.5}
              y={y + 4}
              width={7}
              height={7}
              rx={2}
              stroke="none"
              fill={brand.ink}
            />
            <Path d={`M19 ${y + 7.5} H${[58, 46, 64][i]}`} />
            <Path
              d={`M${[98, 106, 92][i]} ${y + 7.5} H129`}
              strokeOpacity={0.4}
            />
          </G>
        )
      })}
    </Art>
  )
}

const R = 20
const AROUND = 2 * Math.PI * R
const SLICES = [
  { len: 0.45, offset: 0, color: brand.lime },
  { len: 0.3, offset: 0.45, color: brand.blue },
  { len: 0.25, offset: 0.75, color: MUTED },
]

export function TrackArt({ on }: ArtProps) {
  return (
    <Art>
      <G rotation={-90} origin="28, 30">
        <Circle cx={28} cy={30} r={R} strokeWidth={15} />
        {SLICES.map((slice) => {
          // Off: the slices sit a touch apart; played, they close up.
          const len = (slice.len - (on ? 0.012 : 0.04)) * AROUND
          return (
            <Circle
              key={slice.color}
              cx={28}
              cy={30}
              r={R}
              strokeWidth={12}
              stroke={slice.color}
              strokeLinecap="butt"
              strokeDasharray={[len, AROUND]}
              strokeDashoffset={-slice.offset * AROUND}
            />
          )
        })}
      </G>
      {SLICES.map((slice, i) => (
        <G key={slice.color}>
          <Rect
            x={66}
            y={9 + i * 16}
            width={9}
            height={9}
            rx={2}
            fill={slice.color}
          />
          <Path d={`M82 ${13.5 + i * 16} H${[128, 114, 121][i]}`} />
        </G>
      ))}
    </Art>
  )
}

export function SendArt({ on }: ArtProps) {
  return (
    <Art>
      <Path d="M26 30 H102" strokeDasharray={[3, 4]} />
      <Path d="M99 25 l5 5 -5 5" />
      <Circle cx={12} cy={30} r={11.25} fill={CARD_FACE} />
      <Path
        d={SOLANA_PATH}
        fill={brand.ink}
        stroke="none"
        transform="translate(6 24.8) scale(0.119)"
      />
      <Rect
        x={111}
        y={18}
        width={24}
        height={24}
        rx={6}
        fill={on ? brand.lime : MUTED}
      />
      <Path d="M118 30 l4 4 7 -8" />
      {on && (
        <Rect x={64} y={25} width={10} height={10} rx={2.5} fill={brand.lime} />
      )}
    </Art>
  )
}

const BARS = [16, 26, 20, 36, 30, 48]

export function AnalyzeArt({ on }: ArtProps) {
  return (
    <Art>
      {BARS.map((h, i) => {
        // Played, the bars stand to their full height.
        const height = on ? h : h * 0.6
        return (
          <Rect
            key={i}
            x={3 + i * 23}
            y={57 - height}
            width={16}
            height={height}
            rx={3}
            fill={i === BARS.length - 1 ? brand.blue : brand.lime}
          />
        )
      })}
      <Path d="M0 57.75 H136" />
    </Art>
  )
}
