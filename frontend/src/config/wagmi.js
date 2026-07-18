import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { baseSepolia } from 'wagmi/chains'
import { http } from 'viem'

const alchemyKey = import.meta.env.VITE_ALCHEMY_API_KEY
const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID

if (!alchemyKey || !walletConnectProjectId) {
  throw new Error(
    'Missing VITE_ALCHEMY_API_KEY or VITE_WALLETCONNECT_PROJECT_ID. Copy .env.example to .env and fill both in.'
  )
}

const alchemyRpcUrl = `https://base-sepolia.g.alchemy.com/v2/${alchemyKey}`

export const wagmiConfig = getDefaultConfig({
  appName: 'Onchain Escrow',
  projectId: walletConnectProjectId,
  chains: [baseSepolia],
  transports: {
    [baseSepolia.id]: http(alchemyRpcUrl),
  },
  ssr: false,
})
