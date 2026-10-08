import type { Conversation, Part, ToolPart, TransactionPart } from './types'

// Mock agent for building the UI before the Flue backend exists
// (EXPO_PUBLIC_MOCK_AGENT=1). Every figure here is made up for development;
// none of it comes from a wallet or a market.

const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

export const MOCK_ADDRESS = '7Ky2dWq4Ab9XnPc3hR5tLm8VfJ1sGz6YeDuQo2NwBa4T'

const HOLDINGS_TABLE = `| Token | Amount | Value |
| --- | ---: | ---: |
| SOL | 4.218 | $612.40 |
| USDC | 182.50 | $182.50 |
| JUP | 1,240 | $1,016.80 |
| BONK | 3.1M | $71.30 |`

const HOLDINGS_REPLY = `Your wallet holds **$1,883.00** across four tokens:

${HOLDINGS_TABLE}

JUP is your largest position at about 54% of the total. You also have 0.0021 SOL in rent across two token accounts you could close.`

const PRICES_REPLY = `Right now on Jupiter:

- **SOL** $145.18, down 1.2% over 24h
- **JUP** $0.82, up 3.4% over 24h

One SOL buys about **177 JUP** at these prices.`

const ORDER_BOOK_REPLY = `The **SOL-PERP** book on Phoenix is tight right now:

| Side | Price | Size (SOL) |
| --- | ---: | ---: |
| Ask | 145.26 | 212.4 |
| Ask | 145.22 | 88.0 |
| Bid | 145.17 | 140.6 |
| Bid | 145.12 | 302.9 |

The spread is **$0.05** (0.03%). Depth is heavier on the bid side within $0.10 of the mid.`

const WEATHER_REPLY = `I found **Open Weather Pro** in the pay.sh catalog and called it for New York. It cost $0.01 from your LanaTools wallet.

> 18°C and clear, wind 9 km/h from the west. Rain likely after 6 PM.

You have **$4.97** left of this client’s $5.00 limit.`

const SWAP_REPLY = `I prepared a swap of **0.5 SOL** for about **72.41 USDC** through Jupiter. Review it below. Nothing is sent until you sign it in the app.`

function tool(
  part: Omit<ToolPart, 'type' | 'state'> & { state?: ToolPart['state'] },
): ToolPart {
  return { type: 'tool', state: 'done', ...part }
}

function swap(state: TransactionPart['state']): TransactionPart {
  return {
    type: 'transaction',
    id: 'tx-swap',
    state,
    title: 'Swap SOL for USDC',
    network: 'Solana mainnet',
    pay: { amount: '0.5', token: 'SOL' },
    receive: { amount: '72.41', token: 'USDC' },
    feeSol: '0.000085',
    route: 'Jupiter · Meteora DLMM',
    expiresInS: 54,
  }
}

const holdingsTool = tool({
  id: 't-holdings',
  name: 'get_wallet_holdings',
  provider: 'Helius',
  summary: `owner ${MOCK_ADDRESS.slice(0, 4)}…${MOCK_ADDRESS.slice(-4)}`,
  input: { owner: MOCK_ADDRESS },
  output: { tokens: 4, nfts: 0, totalUsd: 1883.0 },
  durationMs: 820,
})

const pricesTool = tool({
  id: 't-prices',
  name: 'jupiter_get_prices',
  provider: 'Jupiter',
  summary: 'SOL, JUP',
  input: { ids: ['SOL', 'JUP'] },
  output: { SOL: 145.18, JUP: 0.82 },
  durationMs: 410,
})

const orderBookTool = tool({
  id: 't-book',
  name: 'phoenix_get_orderbook',
  provider: 'Phoenix',
  summary: 'SOL-PERP, depth 2',
  input: { market: 'SOL-PERP', depth: 2 },
  output: { bestBid: 145.17, bestAsk: 145.22 },
  durationMs: 560,
})

const catalogTool = tool({
  id: 't-catalog',
  name: 'search_catalog',
  provider: 'pay.sh',
  summary: '“weather forecast”',
  input: { query: 'weather forecast' },
  output: { results: 3, top: 'Open Weather Pro' },
  durationMs: 690,
})

const paidCallTool = tool({
  id: 't-call',
  name: 'call',
  provider: 'pay.sh',
  summary: 'GET openweather.pay.sh/v1/now',
  input: { url: 'https://openweather.pay.sh/v1/now?city=NYC', max_usd: 0.05 },
  output: { status: 200, protocol: 'x402' },
  durationMs: 1340,
  costUsd: 0.01,
})

const quoteTool = tool({
  id: 't-quote',
  name: 'jupiter_quote_swap',
  provider: 'Jupiter',
  summary: '0.5 SOL → USDC',
  input: { inputMint: 'SOL', outputMint: 'USDC', amount: 0.5 },
  output: { outAmount: 72.41, priceImpactPct: 0.01 },
  durationMs: 480,
})

const buildTool = tool({
  id: 't-build',
  name: 'jupiter_build_swap',
  provider: 'Jupiter',
  summary: 'unsigned v0 transaction',
  input: { quote: 'q_8f21', wallet: MOCK_ADDRESS },
  output: {
    transaction: '(base64, 1,180 bytes)',
    lastValidBlockHeight: 287_431_902,
  },
  durationMs: 530,
})

/** A reply the mock agent plays back: the parts, in order. */
export type Script = { title: string; parts: Part[] }

export function scriptFor(prompt: string): Script {
  const text = prompt.toLowerCase()
  if (/swap|sell|buy/.test(text))
    return {
      title: 'Swap 0.5 SOL to USDC',
      parts: [
        {
          type: 'reasoning',
          text: 'Quote the swap first, then build it for the user to sign.',
          durationMs: 900,
        },
        quoteTool,
        buildTool,
        { type: 'text', text: SWAP_REPLY },
        swap('awaiting'),
      ],
    }
  if (/wallet|holding|balance|portfolio/.test(text))
    return {
      title: 'Wallet holdings',
      parts: [holdingsTool, { type: 'text', text: HOLDINGS_REPLY }],
    }
  if (/price|trading|jup/.test(text))
    return {
      title: 'SOL and JUP prices',
      parts: [pricesTool, { type: 'text', text: PRICES_REPLY }],
    }
  if (/order ?book|perp|phoenix/.test(text))
    return {
      title: 'SOL perps order book',
      parts: [orderBookTool, { type: 'text', text: ORDER_BOOK_REPLY }],
    }
  if (/api|weather|pay/.test(text))
    return {
      title: 'Weather API on pay.sh',
      parts: [
        {
          type: 'reasoning',
          text: 'Search the pay.sh catalog, then make one paid call within the limit.',
          durationMs: 900,
        },
        catalogTool,
        paidCallTool,
        { type: 'text', text: WEATHER_REPLY },
      ],
    }
  return {
    title: prompt.length > 32 ? `${prompt.slice(0, 32).trim()}…` : prompt,
    parts: [
      {
        type: 'text',
        text: `I can read Solana wallets and transactions with **Helius**, check prices and build swaps with **Jupiter**, read **Phoenix** perps markets, and pay for APIs on **pay.sh** within your limit.\n\nTry asking for your holdings, a price, or a swap.`,
      },
    ],
  }
}

function exchange(
  id: string,
  prompt: string,
  at: number,
  parts: Part[],
): Conversation['messages'] {
  return [
    {
      id: `${id}-u`,
      role: 'user',
      createdAt: at,
      parts: [{ type: 'text', text: prompt }],
    },
    { id: `${id}-a`, role: 'assistant', createdAt: at + 4000, parts },
  ]
}

/** Earlier conversations for the drawer, newest first. */
export function seedConversations(now = Date.now()): Conversation[] {
  const swapScript = scriptFor('swap 0.5 SOL to USDC')
  return [
    {
      id: 'c-swap',
      title: 'Swap 0.5 SOL to USDC',
      updatedAt: now - 25 * MIN,
      messages: exchange(
        'c-swap',
        'Swap 0.5 SOL to USDC',
        now - 26 * MIN,
        swapScript.parts,
      ),
    },
    {
      id: 'c-holdings',
      title: 'Wallet holdings',
      updatedAt: now - 3 * HOUR,
      messages: exchange('c-holdings', 'What’s in my wallet?', now - 3 * HOUR, [
        holdingsTool,
        { type: 'text', text: HOLDINGS_REPLY },
      ]),
    },
    {
      id: 'c-weather',
      title: 'Weather API on pay.sh',
      updatedAt: now - 1 * DAY - 2 * HOUR,
      messages: exchange(
        'c-weather',
        'Find a paid weather API and check New York',
        now - 1 * DAY - 2 * HOUR,
        [catalogTool, paidCallTool, { type: 'text', text: WEATHER_REPLY }],
      ),
    },
    {
      id: 'c-book',
      title: 'SOL perps order book',
      updatedAt: now - 1 * DAY - 7 * HOUR,
      messages: exchange(
        'c-book',
        'SOL perps order book',
        now - 1 * DAY - 7 * HOUR,
        [orderBookTool, { type: 'text', text: ORDER_BOOK_REPLY }],
      ),
    },
    {
      id: 'c-prices',
      title: 'SOL and JUP prices',
      updatedAt: now - 4 * DAY,
      messages: exchange('c-prices', 'Price of SOL and JUP', now - 4 * DAY, [
        pricesTool,
        { type: 'text', text: PRICES_REPLY },
      ]),
    },
  ]
}
