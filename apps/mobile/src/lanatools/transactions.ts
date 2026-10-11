import {
  getBase58Decoder,
  getBase64Decoder,
  getBase64Encoder,
} from '@solana/kit'
import { isNoWallet, isUserCancel } from '../session/wallet.ts'
import { ToolError } from './mcp.ts'
import type { Signer } from '../session/context'

// A transaction LanaTools prepared for this phone ("local" delivery), from
// review to settled. The wallet signs and never broadcasts: LanaTools checks
// the bytes are the ones it built, relays them and confirms.
//
// Everything about how a request can end lives here, so callers only ever
// record an Outcome or show a RetryError.

/** What became of a prepared transaction. */
export type Outcome =
  /** LanaTools relayed it. */
  | { state: 'sent'; signature: string }
  /**
   * Signed and handed to LanaTools, but not confirmed: it may still land.
   * Never prepare it again without checking its status first.
   */
  | { state: 'pending'; signature: string | null }
  /** The user said no; nothing was signed. */
  | { state: 'declined' }
  /** Nothing went out, and this request can't go out any more. */
  | { state: 'failed'; error: string }

/** Something the user can fix and try again; nothing was sent. */
export class RetryError extends Error {}

/** Calls one LanaTools tool with the user's access token. */
export type CallTool = (
  name: string,
  args: Record<string, unknown>,
) => Promise<unknown>

/** The parts of LanaTools' TransactionResult this module reads. */
type Result = {
  status: string
  signature: string | null
  transaction?: { transaction: string; account: string; messageToSign?: string }
}

const EXPIRED = 'This transaction expired. Ask your agent to prepare it again.'

/**
 * A request's outcome from LanaTools' status, or null while it still waits
 * for a signature. Throws RetryError while LanaTools can't say yet.
 */
export function settled(result: Result): Outcome | null {
  switch (result.status) {
    case 'ready':
      return null
    case 'submitting':
    case 'confirmed':
      return result.signature
        ? { state: 'sent', signature: result.signature }
        : { state: 'pending', signature: null }
    case 'unknown':
      return { state: 'pending', signature: result.signature }
    case 'failed':
      return { state: 'failed', error: 'The transaction failed on Solana.' }
    case 'expired':
    case 'transaction_expired':
    case 'closed':
      return { state: 'failed', error: EXPIRED }
    default:
      // open, preparing, unavailable: LanaTools isn't done with it yet.
      throw new RetryError(
        'LanaTools is still preparing this transaction. Try again in a moment.',
      )
  }
}

/** The request's outcome now, or null if it still waits to be signed. */
export async function checkStatus(call: CallTool, id: string) {
  return settled((await call('get_transaction_status', { id })) as Result)
}

/**
 * Fetches the request's current transaction (rebuilt by LanaTools if its
 * blockhash ran out), signs it with `signer`, and hands it to LanaTools.
 * Resolves with the Outcome to record; rejects with RetryError when the
 * user can fix the problem and try again.
 */
export async function signAndSend(
  call: CallTool,
  id: string,
  signer: Signer,
): Promise<Outcome> {
  const current = (await call('get_transaction_status', { id })) as Result
  const already = settled(current)
  if (already) return already
  const prepared = current.transaction
  if (!prepared) throw new RetryError('LanaTools sent nothing to sign yet.')
  if (prepared.account !== signer.address)
    return {
      state: 'failed',
      error: `This was prepared for ${short(prepared.account)}, not the wallet you're signed in with.`,
    }

  let signed: Uint8Array
  let messageSignature: string | undefined
  try {
    signed = await signer.signTransaction(
      new Uint8Array(getBase64Encoder().encode(prepared.transaction)),
    )
    // Phoenix activation also needs the wallet to sign a login message.
    if (prepared.messageToSign)
      messageSignature = getBase58Decoder().decode(
        await signer.signMessage(
          new TextEncoder().encode(prepared.messageToSign),
        ),
      )
  } catch (error) {
    console.warn('Signing failed', id, error)
    throw new RetryError(
      isUserCancel(error)
        ? 'You cancelled in your wallet. Nothing was sent.'
        : isNoWallet(error)
          ? 'No wallet app on this phone answered. Open it and try again.'
          : `Your wallet couldn't sign: ${message(error)}`,
    )
  }

  // From here the signed bytes exist, so an unclear answer is "pending",
  // never "nothing was sent".
  try {
    const sent = (await call('send_transaction', {
      id,
      transaction: getBase64Decoder().decode(signed),
      ...(messageSignature ? { messageSignature } : {}),
    })) as Result
    if (sent.status !== 'confirmed')
      console.warn('send_transaction answered', id, sent.status, sent)
    return settled(sent) ?? { state: 'pending', signature: sent.signature }
  } catch (error) {
    console.warn('send_transaction failed', id, error)
    if (error instanceof ToolError && error.code === 'transaction_expired')
      return { state: 'failed', error: EXPIRED }
    if (error instanceof ToolError && error.code === 'invalid_input')
      return { state: 'failed', error: error.message }
    return { state: 'pending', signature: null }
  }
}

function message(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function short(address: string) {
  return `${address.slice(0, 4)}…${address.slice(-4)}`
}
