import { cubicBezier, Easing } from 'react-native-reanimated'

// Motion values for the whole app. The curve is the dashboard's (styles.css
// --ease-out); durations and springs follow the rule that
// UI motion stays under 300ms and anything a finger moved settles on a
// spring that carries its velocity.

/** Entering, exiting, press feedback. */
export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1)

/** The same curve for Reanimated CSS transitions and animations. */
export const CSS_EASE_OUT = cubicBezier(0.23, 1, 0.32, 1)

/** Press feedback: near-imperceptible, because it happens all day. */
export const PRESS_MS = 120
/** A small state change: a control enabling, a border on focus. */
export const STATE_MS = 150
