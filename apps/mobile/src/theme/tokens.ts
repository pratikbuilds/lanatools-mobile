// Ported from the LanaTools dashboard (`.dash` in
// lanatools/apps/web/src/styles.css). Keep the two in step: the app should
// read as the same product as lanatools.sh/sign-in and the dashboard.

/** Brand constants, the same in both themes. */
export const brand = {
  blue: '#0b2fb2',
  ink: '#0a1f6e',
  paper: '#f3efe6',
  lime: '#d9ff4a',
  coral: '#ff6b4a',
} as const

export type ThemeName = 'light' | 'dark'

export type Palette = {
  bg: string
  panel: string
  panel2: string
  line: string
  line2: string
  text: string
  text2: string
  text3: string
  accent: string
  onAccent: string
  /** Spending-limit ticks: the accent by day, a soft blue by night. */
  tick: string
  live: string
  liveGlow: string
  warn: string
  bad: string
  focus: string
  /** Behind sheets and dialogs. */
  scrim: string
  hatch: string
  /** Marks in the side field. */
  pat: string
  /** The few side-field marks that take the accent. */
  patAccent: string
}

export const palettes: Record<ThemeName, Palette> = {
  light: {
    bg: '#f3efe6',
    panel: '#fffdf8',
    panel2: '#ebe6da',
    line: '#d6d0c2',
    line2: '#bfb7a4',
    text: '#0a1f6e',
    text2: '#4a5480',
    text3: '#5f668c',
    accent: '#0b2fb2',
    onAccent: '#f3efe6',
    tick: '#0b2fb2',
    live: '#1d8f55',
    liveGlow: 'rgba(29, 143, 85, 0.18)',
    warn: '#9a5b00',
    bad: '#b8361a',
    focus: '#0b2fb2',
    scrim: 'rgba(5, 11, 43, 0.4)',
    hatch: '#ddd6c6',
    pat: '#d3c9b4',
    patAccent: 'rgba(11, 47, 178, 0.32)',
  },
  dark: {
    bg: '#08090c',
    panel: '#0f1115',
    panel2: '#171a21',
    line: '#23272f',
    line2: '#343a46',
    text: '#f3efe6',
    text2: '#aab1c5',
    text3: '#8a90a3',
    accent: '#f3efe6',
    onAccent: '#0a1f6e',
    tick: '#b5c1f0',
    live: '#d9ff4a',
    liveGlow: 'rgba(217, 255, 74, 0.25)',
    warn: '#f2c25c',
    bad: '#ff8a70',
    focus: '#d9ff4a',
    scrim: 'rgba(0, 0, 0, 0.55)',
    hatch: '#1b1e25',
    pat: '#262a32',
    patAccent: 'rgba(217, 255, 74, 0.3)',
  },
}

/**
 * Corner radii. Surfaces keep the dashboard's (frame, card, field); the
 * chat's controls commit to round: pill buttons and chips, a 24 composer
 * and 20 bubbles, rather than an in-between rounded rectangle.
 */
export const radius = {
  frame: 14,
  card: 10,
  inset: 9,
  button: 9,
  field: 8,
  highlight: 4,
  bubble: 20,
  composer: 24,
  pill: 999,
} as const

/**
 * Font families embedded at build time (app.json, expo-font). Weights pick
 * the static file, so styles set `fontWeight` as on the web.
 */
export const fonts = {
  mono: 'PaperMono',
  sans: 'InterTight',
} as const

/** cubic-bezier(0.23, 1, 0.32, 1), the dashboard's --ease-out. */
export const easeOut = [0.23, 1, 0.32, 1] as const
