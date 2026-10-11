import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ToolError } from './mcp.ts'
import { RetryError, checkStatus, signAndSend } from './transactions.ts'
import type { CallTool } from './transactions.ts'
import type { Signer } from '../session/context'

const WALLET = 'Wallet1111111111111111111111111111111111111'

const ready = (extra: object = {}) => ({
  status: 'ready',
  signature: null,
  transaction: { transaction: 'AQID', account: WALLET, ...extra },
})

function signer(overrides: Partial<Signer> = {}): Signer & { signed: number } {
  const state = { signed: 0 }
  return Object.assign(state, {
    address: WALLET,
    kind: 'wallet' as const,
    signTransaction: async (bytes: Uint8Array) => {
      state.signed += 1
      return bytes
    },
    signMessage: async () => new Uint8Array(64).fill(1),
    ...overrides,
  })
}

/** Answers each tool in turn and records the calls. */
function lanatools(...answers: ((args: Record<string, unknown>) => unknown)[]) {
  const calls: { name: string; args: Record<string, unknown> }[] = []
  const call: CallTool = async (name, args) => {
    calls.push({ name, args })
    const answer = answers.shift()
    if (!answer) throw new Error(`Unexpected ${name}`)
    return answer(args)
  }
  return { call, calls }
}

test('a ready transaction is signed and sent', async () => {
  const { call, calls } = lanatools(
    () => ready(),
    () => ({ status: 'confirmed', signature: 'Sig1' }),
  )
  const outcome = await signAndSend(call, 'req', signer())
  assert.deepEqual(outcome, { state: 'sent', signature: 'Sig1' })
  assert.deepEqual(calls[1], {
    name: 'send_transaction',
    args: { id: 'req', transaction: 'AQID' },
  })
})

test('one already sent is not signed again', async () => {
  const wallet = signer()
  const { call } = lanatools(() => ({ status: 'confirmed', signature: 'Sig1' }))
  assert.deepEqual(await signAndSend(call, 'req', wallet), {
    state: 'sent',
    signature: 'Sig1',
  })
  assert.equal(wallet.signed, 0)
})

test('one prepared for another wallet fails without signing', async () => {
  const wallet = signer({
    address: 'Other111111111111111111111111111111111111',
  })
  const { call } = lanatools(() => ready())
  const outcome = await signAndSend(call, 'req', wallet)
  assert.equal(outcome.state, 'failed')
  assert.equal(wallet.signed, 0)
})

test('a cancel in the wallet can be retried and sends nothing', async () => {
  const { call, calls } = lanatools(() => ready())
  const wallet = signer({
    signTransaction: async () => {
      throw new Error('User rejected the request')
    },
  })
  await assert.rejects(signAndSend(call, 'req', wallet), RetryError)
  assert.equal(calls.length, 1)
})

test('signed but unconfirmed is pending, never "nothing sent"', async () => {
  const { call } = lanatools(
    () => ready(),
    () => ({ status: 'unknown', signature: null }),
  )
  assert.deepEqual(await signAndSend(call, 'req', signer()), {
    state: 'pending',
    signature: null,
  })
})

test('losing LanaTools after signing is pending too', async () => {
  const { call } = lanatools(
    () => ready(),
    () => {
      throw new Error('Network request failed')
    },
  )
  assert.equal((await signAndSend(call, 'req', signer())).state, 'pending')
})

test('an expired blockhash at send fails: LanaTools never relays it', async () => {
  const { call } = lanatools(
    () => ready(),
    () => {
      throw new ToolError('Blockhash expired', 'transaction_expired')
    },
  )
  assert.equal((await signAndSend(call, 'req', signer())).state, 'failed')
})

test('Phoenix activation also signs its login message', async () => {
  const { call, calls } = lanatools(
    () => ready({ messageToSign: 'Phoenix login' }),
    () => ({ status: 'submitting', signature: 'Sig2' }),
  )
  await signAndSend(call, 'req', signer())
  assert.equal(typeof calls[1]?.args.messageSignature, 'string')
})

test("status tells a pending transaction's fate", async () => {
  const landed = lanatools(() => ({ status: 'confirmed', signature: 'Sig1' }))
  assert.deepEqual(await checkStatus(landed.call, 'req'), {
    state: 'sent',
    signature: 'Sig1',
  })
  const expired = lanatools(() => ({ status: 'expired', signature: null }))
  assert.equal((await checkStatus(expired.call, 'req'))?.state, 'failed')
  const waiting = lanatools(() => ({ status: 'preparing', signature: null }))
  await assert.rejects(checkStatus(waiting.call, 'req'), RetryError)
})
