import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  isNoWallet,
  isUserCancel,
  signInMethodFrom,
  solanaStatusFrom,
  walletStateFrom,
  externalWalletFrom,
} from './wallet.ts'

const user = {
  id: 'did:privy:abc',
  linked_accounts: [{ type: 'google_oauth', verified_at: 1 }],
}
const base = {
  isReady: true,
  user,
  embeddedAddress: null,
  solanaStatus: null,
  privyError: null,
  createError: null,
}

test('loading until Privy is ready', () => {
  assert.deepEqual(walletStateFrom({ ...base, isReady: false }), {
    status: 'loading',
  })
})

test('signed out without a user', () => {
  assert.deepEqual(walletStateFrom({ ...base, user: null }), {
    status: 'signedOut',
  })
})

test('signed in only once the embedded wallet exists', () => {
  assert.deepEqual(
    walletStateFrom({ ...base, solanaStatus: 'creating' }).status,
    'loading',
  )
  assert.deepEqual(
    walletStateFrom({ ...base, solanaStatus: 'not-created' }).status,
    'loading',
  )
  assert.deepEqual(
    walletStateFrom({
      ...base,
      embeddedAddress: 'Emb3dd3d',
      solanaStatus: 'connected',
    }),
    {
      status: 'signedIn',
      userId: 'did:privy:abc',
      address: 'Emb3dd3d',
      method: 'google',
    },
  )
})

test('a failed wallet creation is an error the user can retry', () => {
  assert.deepEqual(
    walletStateFrom({ ...base, createError: 'Network request failed' }),
    {
      status: 'walletError',
      message: 'Network request failed',
      action: 'create',
    },
  )
  assert.equal(
    walletStateFrom({ ...base, solanaStatus: 'error' }).status,
    'walletError',
  )
})

test('a wallet that needs recovery asks to recover', () => {
  const state = walletStateFrom({ ...base, solanaStatus: 'needs-recovery' })
  assert.equal(state.status === 'walletError' && state.action, 'recover')
})

test('the latest verified login names the sign-in method', () => {
  assert.equal(
    signInMethodFrom([
      { type: 'google_oauth', latest_verified_at: 10 },
      { type: 'wallet', wallet_client_type: 'phantom', latest_verified_at: 20 },
    ]),
    'wallet',
  )
  assert.equal(
    signInMethodFrom([
      { type: 'wallet', wallet_client_type: 'solflare', verified_at: 5 },
      { type: 'google_oauth', verified_at: 9 },
    ]),
    'google',
  )
})

test('a wallet signed in over MWA counts without a client type', () => {
  assert.equal(
    signInMethodFrom([
      { type: 'google_oauth', verified_at: 1 },
      { type: 'wallet', verified_at: 2 },
    ]),
    'wallet',
  )
})

test('the embedded wallet is not a sign-in method', () => {
  assert.equal(
    signInMethodFrom([
      { type: 'google_oauth', verified_at: 1 },
      { type: 'wallet', wallet_client_type: 'privy', verified_at: 99 },
      { type: 'wallet', connector_type: 'embedded', verified_at: 98 },
    ]),
    'google',
  )
})

test('unknown Privy wallet statuses are ignored', () => {
  assert.equal(solanaStatusFrom('connected'), 'connected')
  assert.equal(solanaStatusFrom('something-new'), null)
})

test('cancels are told apart from failures', () => {
  assert.equal(isUserCancel(new Error('User cancelled login')), true)
  assert.equal(isUserCancel(new Error('authorization request declined')), true)
  assert.equal(isUserCancel(new Error('Network request failed')), false)
})

test('a phone without an MWA wallet is recognised', () => {
  const error = Object.assign(
    new Error(
      'Found no installed wallet that supports the mobile wallet protocol.',
    ),
    { code: 'ERROR_WALLET_NOT_FOUND' },
  )
  assert.equal(isNoWallet(error), true)
  assert.equal(isUserCancel(error), false)
  assert.equal(isNoWallet(new Error('Network request failed')), false)
})

test('the wallet a user signed in with signs their transactions', () => {
  assert.equal(
    externalWalletFrom([
      { type: 'google_oauth', verified_at: 1 },
      {
        type: 'wallet',
        address: 'Embedded1',
        wallet_client_type: 'privy',
        verified_at: 4,
      },
      {
        type: 'wallet',
        address: 'Phantom1',
        chain_type: 'solana',
        verified_at: 1,
      },
      {
        type: 'wallet',
        address: 'Solflare1',
        chain_type: 'solana',
        latest_verified_at: 2,
      },
    ]),
    'Solflare1',
  )
})

test('a Google user has no external wallet to sign with', () => {
  assert.equal(
    externalWalletFrom([
      { type: 'google_oauth', verified_at: 1 },
      { type: 'wallet', address: 'Embedded1', connector_type: 'embedded' },
    ]),
    null,
  )
})

test('a Google sign-in signs with the embedded wallet, even with a wallet linked', () => {
  assert.equal(
    externalWalletFrom([
      {
        type: 'wallet',
        address: 'Phantom1',
        chain_type: 'solana',
        verified_at: 1,
      },
      { type: 'google_oauth', latest_verified_at: 5 },
    ]),
    null,
  )
})
