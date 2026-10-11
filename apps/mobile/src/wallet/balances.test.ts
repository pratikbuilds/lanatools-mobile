import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { USDC_MINT, fetchBalances, formatSol, formatUsdc } from './balances.ts'

const realFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = realFetch
})

const usdcAccount = (amount: string) => ({
  account: {
    data: { parsed: { info: { tokenAmount: { uiAmountString: amount } } } },
  },
})

test('reads SOL and every USDC account of the wallet', async () => {
  const sent: { method: string; params: unknown[] }[] = []
  globalThis.fetch = (async (_url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body)) as {
      method: string
      params: unknown[]
    }
    sent.push(body)
    const result =
      body.method === 'getBalance'
        ? { value: 19_995_000 }
        : { value: [usdcAccount('1.864'), usdcAccount('0.5')] }
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result }))
  }) as typeof fetch

  const balances = await fetchBalances('Owner1111', 'https://rpc.test')
  assert.equal(balances.sol, 0.019995)
  assert.equal(balances.usdc, 2.364)
  const tokens = sent.find((s) => s.method === 'getTokenAccountsByOwner')
  assert.deepEqual(tokens?.params[1], { mint: USDC_MINT })
})

test('an RPC error fails the read', async () => {
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({ jsonrpc: '2.0', id: 1, error: { message: 'busy' } }),
    )) as unknown as typeof fetch
  await assert.rejects(fetchBalances('Owner1111', 'https://rpc.test'), /busy/)
})

test('balances read as SOL to four places and USDC to cents', () => {
  assert.equal(formatSol(0.019995), '0.0200')
  assert.equal(formatSol(0), '0')
  assert.equal(formatSol(12.5), '12.5000')
  assert.equal(formatUsdc(1.864), '1.86')
  assert.equal(formatUsdc(1234.5), '1,234.50')
})
