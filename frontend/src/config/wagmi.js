import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { monadTestnet } from 'wagmi/chains'
import { http } from 'viem'

const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID

if (!walletConnectProjectId) {
  throw new Error(
    'Missing VITE_WALLETCONNECT_PROJECT_ID. Copy .env.example to .env and fill it in.'
  )
}

export const wagmiConfig = getDefaultConfig({
  appName: 'Onchain Escrow',
  projectId: walletConnectProjectId,
  chains: [monadTestnet],
  transports: {
    [monadTestnet.id]: http('https://testnet-rpc.monad.xyz'),
  },
  ssr: false,
})