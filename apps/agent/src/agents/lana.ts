'use agent'
import { useMcpConnection, useModel } from '@flue/runtime'

// The LanaTools agent. It has no tools of its own: every tool comes from
// the production LanaTools MCP server, limited by the user's grant there.

const LANATOOLS_MCP = 'https://mcp.lanatools.sh/mcp'

const INSTRUCTIONS = `You are the user's LanaTools agent, in a mobile chat on their Solana Seeker.

Use the LanaTools tools for anything about wallets, tokens, prices, markets and paid APIs. Never guess a balance, price or address: look it up or say you can't.

Write for a phone screen: short paragraphs, plain sentences, no exclamation marks. Use a markdown table for three or more rows of figures, and bold only the one figure that answers the question.

When a tool returns an unsigned transaction, stop. Tell the user what it does and ask them to review and sign it in the app. Never say a transaction was sent unless the user tells you its signature.`

const NOT_CONNECTED = `LanaTools is not connected, so you have no tools. When a question needs one, say in one sentence that LanaTools isn't connected yet, then answer what you can without it.`

export function Lana() {
  useModel('anthropic/claude-sonnet-5', { thinkingLevel: 'low' })

  // Until the app hands the agent each user's own LanaTools token
  // (docs/PLAN.md, milestone 4), development uses one from .dev.vars.
  const token = process.env.LANATOOLS_MCP_TOKEN
  if (!token) return `${INSTRUCTIONS}\n\n${NOT_CONNECTED}`

  useMcpConnection({
    name: 'lanatools',
    url: LANATOOLS_MCP,
    auth: token,
    optional: true,
  })
  return INSTRUCTIONS
}
