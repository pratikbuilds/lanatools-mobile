// Calls one LanaTools MCP tool from the app, with the user's own access
// token. The agent makes the model's calls; the app makes only the ones
// that carry what the user did on the phone: fetching a transaction to sign
// and sending what they signed.
//
// MCP's streamable HTTP transport: initialize, then tools/call, each a
// POST that answers with JSON or a short server-sent event stream.

import { RESOURCE } from './oauth.ts'

const PROTOCOL = '2025-06-18'

type JsonRpcResponse = {
  id?: number
  result?: {
    content?: { type: string; text?: string }[]
    structuredContent?: unknown
    isError?: boolean
  }
  error?: { message: string }
}

/** A tool's own refusal, with LanaTools' error code when it gave one. */
export class ToolError extends Error {
  readonly code: string | null
  constructor(message: string, code: string | null) {
    super(message)
    this.code = code
  }
}

/** The JSON-RPC message answering `id`, from a JSON or SSE body. */
export function parseRpc(body: string, id: number): JsonRpcResponse | null {
  const messages: JsonRpcResponse[] = []
  const trimmed = body.trim()
  if (trimmed.startsWith('{')) messages.push(JSON.parse(trimmed))
  else
    for (const line of body.split('\n'))
      if (line.startsWith('data:')) {
        const data = line.slice(5).trim()
        if (data.startsWith('{')) messages.push(JSON.parse(data))
      }
  return messages.find((message) => message.id === id) ?? null
}

async function post(
  token: string,
  payload: object,
  session: string | null,
): Promise<{ text: string; session: string | null; status: number }> {
  const response = await fetch(RESOURCE, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      'mcp-protocol-version': PROTOCOL,
      ...(session ? { 'mcp-session-id': session } : {}),
    },
    body: JSON.stringify({ jsonrpc: '2.0', ...payload }),
  })
  return {
    text: await response.text(),
    session: response.headers.get('mcp-session-id') ?? session,
    status: response.status,
  }
}

/**
 * Calls `name` and returns its structured content. Throws `ToolError` when
 * the tool refuses, with LanaTools' code (`transaction_expired`,
 * `invalid_input`, ...), and a plain Error when LanaTools can't be reached.
 */
export async function callTool(
  token: string,
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const init = await post(
    token,
    {
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: PROTOCOL,
        capabilities: {},
        clientInfo: { name: 'LanaTools Mobile', version: '1.0.0' },
      },
    },
    null,
  )
  if (init.status === 401)
    throw new ToolError('Connect LanaTools again.', 'unauthorized')
  if (init.status >= 400 || !parseRpc(init.text, 1)?.result)
    throw new Error(`LanaTools answered ${init.status}`)
  await post(token, { method: 'notifications/initialized' }, init.session)

  const call = await post(
    token,
    { id: 2, method: 'tools/call', params: { name, arguments: args } },
    init.session,
  )
  const message = parseRpc(call.text, 2)
  if (!message) throw new Error(`LanaTools answered ${call.status}`)
  if (message.error) throw new ToolError(message.error.message, null)
  const result = message.result
  if (result?.isError) {
    const failure = (
      result.structuredContent as {
        error?: { code?: string; message?: string }
      }
    )?.error
    throw new ToolError(
      failure?.message ?? result.content?.[0]?.text ?? 'The tool failed.',
      failure?.code ?? null,
    )
  }
  return result?.structuredContent ?? null
}
