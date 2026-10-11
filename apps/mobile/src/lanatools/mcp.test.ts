import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseRpc } from './mcp.ts'

test('reads a JSON-RPC answer from a JSON body', () => {
  const body = JSON.stringify({ jsonrpc: '2.0', id: 2, result: { ok: true } })
  assert.deepEqual(parseRpc(body, 2)?.result, { ok: true })
})

test('reads the answer to its own id from an event stream', () => {
  const body = [
    'event: message',
    `data: ${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/progress' })}`,
    '',
    'event: message',
    `data: ${JSON.stringify({ jsonrpc: '2.0', id: 2, result: { structuredContent: { id: 'r' } } })}`,
    '',
  ].join('\n')
  assert.deepEqual(parseRpc(body, 2)?.result, {
    structuredContent: { id: 'r' },
  })
  assert.equal(parseRpc(body, 3), null)
})
