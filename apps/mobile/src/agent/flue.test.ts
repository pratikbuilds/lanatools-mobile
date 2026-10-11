/// <reference types="node" />
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { providerOf, summarize, toThread, transactionFrom } from './flue.ts'
import type { FlueConversationMessage } from '@flue/react'

const user = (id: string, text: string): FlueConversationMessage => ({
  id,
  role: 'user',
  purpose: 'user',
  display: 'visible',
  parts: [{ type: 'text', text, state: 'done' }],
})

const reply = (
  id: string,
  parts: FlueConversationMessage['parts'],
): FlueConversationMessage => ({
  id,
  role: 'assistant',
  purpose: 'assistant',
  display: 'visible',
  parts,
})

describe('toThread', () => {
  it('maps text, reasoning and LanaTools calls', () => {
    const thread = toThread(
      [
        user('u1', 'What do I hold?'),
        reply('a1', [
          { type: 'reasoning', text: 'Look it up.', state: 'done' },
          {
            type: 'dynamic-tool',
            toolName: 'mcp__lanatools__get_wallet_holdings',
            toolCallId: 't1',
            state: 'output-available',
            input: { owner: '7Ky2dWq4Ab9XnPc3hR5tLm8VfJ1sGz6YeDuQo2NwBa4T' },
            output: { totalUsd: 12 },
            durationMs: 820,
          },
          { type: 'text', text: 'You hold **$12**.', state: 'done' },
        ]),
      ],
      'idle',
    )
    assert.equal(thread.length, 2)
    assert.deepEqual(thread[1]?.parts, [
      { type: 'reasoning', text: 'Look it up.', state: 'done' },
      {
        type: 'tool',
        id: 't1',
        name: 'get_wallet_holdings',
        provider: 'Helius',
        state: 'done',
        summary: 'owner 7Ky2…Ba4T',
        input: { owner: '7Ky2dWq4Ab9XnPc3hR5tLm8VfJ1sGz6YeDuQo2NwBa4T' },
        output: { totalUsd: 12 },
        error: undefined,
        durationMs: 820,
      },
      { type: 'text', text: 'You hold **$12**.' },
    ])
    assert.equal(thread[1]?.streaming, undefined)
  })

  it('stands in for the reply until its first part arrives', () => {
    const thread = toThread([user('u1', 'Hi')], 'submitted')
    assert.equal(thread.length, 2)
    assert.deepEqual(
      {
        role: thread[1]?.role,
        parts: thread[1]?.parts,
        streaming: thread[1]?.streaming,
      },
      { role: 'assistant', parts: [], streaming: true },
    )
  })

  it('marks the latest reply as streaming while the agent works', () => {
    const thread = toThread(
      [
        user('u1', 'Hi'),
        reply('a1', [{ type: 'text', text: 'He', state: 'streaming' }]),
      ],
      'streaming',
    )
    assert.equal(thread.length, 2)
    assert.equal(thread[1]?.streaming, true)
  })

  it('folds a settlement into the reply above it', () => {
    const settlement = (
      outcome: 'failed' | 'aborted',
    ): FlueConversationMessage => ({
      id: `s-${outcome}`,
      role: 'system',
      purpose: 'advisory',
      display: 'diagnostic',
      settlement: { outcome },
      parts: [],
    })
    const stopped = toThread(
      [
        user('u1', 'Hi'),
        reply('a1', [{ type: 'text', text: 'He', state: 'done' }]),
        settlement('aborted'),
      ],
      'idle',
    )
    assert.equal(stopped.length, 2)
    assert.equal(stopped[1]?.stopped, true)

    const failed = toThread([user('u1', 'Hi'), settlement('failed')], 'error')
    assert.equal(failed.length, 2)
    assert.match(failed[1]?.error ?? '', /ran into a problem/)
  })

  it('says so when a send never reached the agent', () => {
    const thread = toThread([user('u1', 'Hi')], 'error')
    assert.match(thread[1]?.error ?? '', /Couldn't reach your agent/)
  })

  it('hides runtime messages', () => {
    const thread = toThread(
      [
        user('u1', 'Hi'),
        {
          ...user('x', 'internal'),
          role: 'system',
          purpose: 'dispatch',
          display: 'hidden',
        },
      ],
      'idle',
    )
    assert.equal(thread.length, 1)
  })
})

describe('providerOf', () => {
  it('names the tool family', () => {
    assert.equal(providerOf('jupiter_quote_swap'), 'Jupiter')
    assert.equal(providerOf('phoenix_get_orderbook'), 'Phoenix')
    assert.equal(providerOf('get_transactions'), 'Helius')
    assert.equal(providerOf('search_catalog'), 'pay.sh')
    assert.equal(providerOf('whoami'), 'LanaTools')
  })
})

describe('summarize', () => {
  it('keeps the first two plain values on one line', () => {
    assert.equal(
      summarize({
        inputMint: 'So11111111111111111111111111111111111111112',
        amount: 5,
        filters: {},
        slippageBps: 50,
      }),
      'inputMint So11…1112 · amount 5',
    )
    assert.equal(summarize(undefined), '')
  })
})

describe('transactionFrom', () => {
  const result = {
    id: 'req-1',
    tool: 'jupiter_swap',
    network: 'mainnet',
    delivery: 'local',
    status: 'ready',
    review: {
      title: 'Swap SOL for USDC',
      description: 'Swap 0.01 SOL through Jupiter.',
      actionLabel: 'Swap',
      fields: [{ label: 'You pay', value: '0.01 SOL' }],
    },
    transaction: { transaction: 'AQAB', account: 'Wallet111' },
    signature: null,
    receipt: null,
    expiresAt: 1_900_000_000_000,
  }

  it('reads a local transaction ready to sign', () => {
    const part = transactionFrom(
      `Structured content:\n${JSON.stringify(result)}`,
    )
    assert.deepEqual(part, {
      type: 'transaction',
      id: 'req-1',
      tool: 'jupiter_swap',
      state: 'awaiting',
      review: result.review,
      wallet: 'Wallet111',
      expiresAt: 1_900_000_000_000,
    })
  })

  it('ignores the text Flue adds after the structured content', () => {
    const output = `Structured content:\n${JSON.stringify(result, null, 2)}\n\nContent:\n${JSON.stringify(result)} {"more": "}"}`
    assert.equal(transactionFrom(output)?.id, 'req-1')
  })

  it('reads structured content from an object output', () => {
    assert.equal(transactionFrom({ structuredContent: result })?.id, 'req-1')
  })

  it('reads a bare JSON result too', () => {
    assert.equal(transactionFrom(JSON.stringify(result))?.id, 'req-1')
  })

  it('ignores links, embedded sends and errors', () => {
    const link = { ...result, delivery: 'link', transaction: undefined }
    assert.equal(transactionFrom(JSON.stringify(link)), null)
    const sent = { ...result, status: 'confirmed' }
    assert.equal(transactionFrom(JSON.stringify(sent)), null)
    assert.equal(transactionFrom('Tool error: insufficient_scope'), null)
  })

  const call = (toolName: string, output: unknown) =>
    toThread(
      [
        reply('a1', [
          {
            type: 'dynamic-tool',
            toolName: `mcp__lanatools__${toolName}`,
            toolCallId: 't1',
            state: 'output-available',
            input: {},
            output,
          },
        ]),
      ],
      'idle',
    )[0]?.parts.map((part) => part.type)

  it('makes a card only for tools that prepare a transaction', () => {
    const output = `Structured content:\n${JSON.stringify(result)}`
    assert.deepEqual(call('jupiter_swap', output), ['tool', 'transaction'])
    assert.deepEqual(call('get_transaction_status', output), ['tool'])
    assert.deepEqual(call('call', output), ['tool'])
  })
})
