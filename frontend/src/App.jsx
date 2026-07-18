import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import CreateDealForm from './components/CreateDealForm'
import DealsList from './components/DealsList'
import { useEscrowDeals } from './hooks/useEscrowDeals'

export default function App() {
  const { isConnected } = useAccount()
  const { deals, isLoading, refetch } = useEscrowDeals()

  return (
    <div className="min-h-screen px-4 py-10 font-body sm:px-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent font-display text-base font-semibold text-vault-bg">
              E
            </div>
            <div>
              <h1 className="font-display text-xl font-semibold leading-tight text-ink">Escrow</h1>
              <p className="text-xs text-ink-muted">Monad Testnet</p>
            </div>
          </div>
          <ConnectButton />
        </header>

        {!isConnected ? (
          <div className="rounded-2xl border border-vault-rule bg-vault-card px-6 py-16 text-center">
            <p className="font-display text-lg font-semibold text-ink">Connect your wallet</p>
            <p className="mt-1.5 text-sm text-ink-muted">
              Connect to create a deal or manage deals you're already part of.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            <CreateDealForm onCreated={refetch} />

            <div>
              <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-ink-muted">
                Your deals
              </h2>
              <DealsList deals={deals} isLoading={isLoading} onChanged={refetch} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
