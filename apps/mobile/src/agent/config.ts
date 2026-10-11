/** The Flue agent. In development it runs on the Mac, over `adb reverse`. */
export const AGENT_URL =
  process.env.EXPO_PUBLIC_AGENT_URL ?? 'http://localhost:8787'
