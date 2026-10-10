// The LanaTools production Privy app and this app's Android client. Both
// are public identifiers, not secrets.
export const PRIVY_APP_ID = process.env.EXPO_PUBLIC_PRIVY_APP_ID || null
export const PRIVY_CLIENT_ID = process.env.EXPO_PUBLIC_PRIVY_CLIENT_ID || null

/** Plays back a mock agent instead of the Flue agent. */
export const MOCK_AGENT = process.env.EXPO_PUBLIC_MOCK_AGENT === '1'

/** Without Privy IDs, signs in to a mock wallet so the whole flow can be used. */
export const MOCK_WALLET = process.env.EXPO_PUBLIC_MOCK_WALLET === '1'

/** What a wallet app shows when this app asks it to connect or sign. */
export const APP_IDENTITY = {
  name: 'LanaTools',
  uri: 'https://lanatools.sh',
  icon: 'favicon.svg',
}

// The Sign In With Solana message the wallet is asked to sign: it names
// lanatools.sh, the same account as the web dashboard.
export const SIWS_DOMAIN = 'lanatools.sh'
export const SIWS_URI = 'https://lanatools.sh'
