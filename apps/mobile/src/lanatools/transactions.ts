import {
  getBase58Decoder,
  getBase64Decoder,
  getBase64Encoder,
} from '@solana/kit'
import { callTool } from './mcp.ts'
import type { Signer } from '../session/context'

// Signing a transaction LanaTools prepared for this phone ("local"
// delivery), then handing it back to LanaTools to send. The wallet signs
// and never broadcasts: LanaTools checks the bytes are unchanged, relays
// them and confirms.

type Prepared = {
  transaction: string
  account: string
  messageToSign?: string
}

type Result = {
  id: string
  status: string
  signature: string | null
  transaction?: Prepared
}

/** Already on its way or settled: nothing to sign. */
const SENT = new Set(['submitting', 'confirmed', 'unknown'])

/** Why this transaction can't be signed, in words for the user. */
export class SignError extends Error {}

export type Sent = { status: string; signature: string }

/**
 * Fetches the request's current transaction (rebuilt by LanaTools if its
 * blockhash ran out), signs it with `signer`, and sends it. Resolves with
 * the signature; rejects with `SignError` when it can't be signed here,
 * and with the wallet's own error when the user declines in it.
 */
export async function signAndSend(
  token: string,
  id: string,
  signer: Signer,
): Promise<Sent> {
  const current = (await callTool(token, 'get_transaction_status', {
    id,
  })) as Result
  if (SENT.has(current.status) && current.signature)
    return { status: current.status, signature: current.signature }
  const prepared = current.transaction
  if (current.status !== 'ready' || !prepared)
    throw new SignError(
      current.status === 'expired' || current.status === 'transaction_expired'
        ? 'This transaction expired. Ask your agent to prepare it again.'
        : `This transaction can't be signed now (${current.status}).`,
    )
  if (prepared.account !== signer.address)
    throw new SignError(
      `This transaction is for ${short(prepared.account)}, not the wallet you signed in with.`,
    )

  const signed = await signer.signTransaction(
    new Uint8Array(getBase64Encoder().encode(prepared.transaction)),
  )
  // Phoenix activation also needs the wallet to sign a login message.
  const messageSignature = prepared.messageToSign
    ? getBase58Decoder().decode(
        await signer.signMessage(
          new TextEncoder().encode(prepared.messageToSign),
        ),
      )
    : undefined

  const sent = (await callTool(token, 'send_transaction', {
    id,
    transaction: getBase64Decoder().decode(signed),
    ...(messageSignature ? { messageSignature } : {}),
  })) as Result
  if (!sent.signature)
    throw new SignError(`LanaTools did not send it (${sent.status}).`)
  return { status: sent.status, signature: sent.signature }
}

function short(address: string) {
  return `${address.slice(0, 4)}…${address.slice(-4)}`
}
