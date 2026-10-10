// Globals that Privy (TextEncoder, crypto.getRandomValues, Buffer) and
// @solana/kit under Mobile Wallet Adapter (crypto.subtle Ed25519) expect.
// The same set as perp-ai's polyfill.js. Imported first, from index.ts.
import 'fast-text-encoding'
import 'react-native-get-random-values'
import '@ethersproject/shims'
import { Buffer } from 'buffer'
import { install } from 'react-native-quick-crypto'

install()
globalThis.Buffer = Buffer
