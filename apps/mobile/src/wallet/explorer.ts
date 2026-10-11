// Where the app sends people to look something up on Solana mainnet: the
// Solana Explorer. One place, so changing explorers is one edit.

const EXPLORER = 'https://explorer.solana.com'

export const explorer = {
  name: 'Solana Explorer',
  transaction: (signature: string) => `${EXPLORER}/tx/${signature}`,
  address: (address: string) => `${EXPLORER}/address/${address}`,
}
