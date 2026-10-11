'use agent'
import { useMcpConnection, useModel } from '@flue/runtime'
import { ownerOf } from '../auth.ts'
import { tokens } from '../store.ts'
import type { AgentProps } from '@flue/runtime'

// The LanaTools agent. It has no tools of its own: every tool comes from
// the production LanaTools MCP server, limited by the user's grant there.
// The user's app hands the agent their access token with each message.

const LANATOOLS_MCP = 'https://mcp.lanatools.sh/mcp'

const INSTRUCTIONS = `You are the user's LanaTools agent, in a mobile chat on their Android phone.

Use the LanaTools tools for anything about wallets, tokens, prices, markets and paid APIs. Never guess a balance, price or address: look it up or say you can't.

If you have no LanaTools tools, LanaTools isn't connected. When a question needs one, say in one sentence that the user can connect LanaTools from the tools button under the message field, then answer what you can without it.

Write for a phone screen: short paragraphs, plain sentences, no exclamation marks. Use a markdown table for three or more rows of figures, and bold only the one figure that answers the question.

When a tool returns an unsigned transaction, stop. Tell the user what it does and ask them to review and sign it in the app. Never say a transaction was sent unless the user tells you its signature.`

export function Lana({ id }: AgentProps) {
  useModel('anthropic/claude-sonnet-5', { thinkingLevel: 'low' })

  // The conversation id starts with its owner's hash (auth.ts), so this
  // agent only ever reads its own user's token.
  const owner = ownerOf(id)
  useMcpConnection({
    name: 'lanatools',
    url: LANATOOLS_MCP,
    optional: true,
    auth: async () => {
      const token = owner && (await tokens().get(owner))
      if (!token) throw new Error('LanaTools is not connected')
      return token
    },
  })
  return INSTRUCTIONS
}
