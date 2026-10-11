// The embedded wallet's SOL and USDC, read straight from Solana mainnet
// over JSON-RPC. Pure apart from fetch, so tests stub it.

/** Public mainnet by default; a keyed RPC is a secret and stays out of here. */
export const RPC_URL =
  process.env.EXPO_PUBLIC_SOLANA_RPC_URL ??
  'https://api.mainnet-beta.solana.com'

export const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'

const LAMPORTS_PER_SOL = 1_000_000_000

export type Balances = { sol: number; usdc: number }

type RpcResponse<T> = { result?: T; error?: { message: string } }

async function rpc<T>(method: string, params: unknown[], url = RPC_URL) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })
  const body = (await response.json()) as RpcResponse<T>
  if (!response.ok || body.error || body.result === undefined)
    throw new Error(body.error?.message ?? `RPC answered ${response.status}`)
  return body.result
}

type TokenAccounts = {
  value: {
    account: {
      data: { parsed: { info: { tokenAmount: { uiAmountString: string } } } }
    }
  }[]
}

export async function fetchBalances(
  owner: string,
  url = RPC_URL,
): Promise<Balances> {
  const [lamports, usdc] = await Promise.all([
    rpc<{ value: number }>(
      'getBalance',
      [owner, { commitment: 'confirmed' }],
      url,
    ),
    rpc<TokenAccounts>(
      'getTokenAccountsByOwner',
      [
        owner,
        { mint: USDC_MINT },
        { encoding: 'jsonParsed', commitment: 'confirmed' },
      ],
      url,
    ),
  ])
  return {
    sol: lamports.value / LAMPORTS_PER_SOL,
    // A wallet can hold USDC in more than one account.
    usdc: usdc.value.reduce(
      (sum, each) =>
        sum + Number(each.account.data.parsed.info.tokenAmount.uiAmountString),
      0,
    ),
  }
}

/** `0.0200` SOL: four decimals, so a little SOL still reads as some. */
export function formatSol(sol: number) {
  return sol.toLocaleString('en-US', {
    minimumFractionDigits: sol === 0 ? 0 : 4,
    maximumFractionDigits: 4,
  })
}

/** `1.86` USDC, as dollars and cents. */
export function formatUsdc(usdc: number) {
  return usdc.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
