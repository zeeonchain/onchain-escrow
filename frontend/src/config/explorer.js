const EXPLORER_BASE = 'https://sepolia.basescan.org'

export const EXPLORER_TX_URL = (hash) => `${EXPLORER_BASE}/tx/${hash}`
export const EXPLORER_ADDRESS_URL = (address) => `${EXPLORER_BASE}/address/${address}`
