// Privy and Mobile Wallet Adapter need these globals before any of their
// modules load, so they come ahead of Expo Router's own entry.
import './src/polyfill'
import 'expo-router/entry'
