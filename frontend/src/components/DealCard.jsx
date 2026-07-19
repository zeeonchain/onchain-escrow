import { useEffect, useState } from 'react'
import { formatEther } from 'viem'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { ESCROW_ADDRESS, ESCROW_ABI, DEAL_STATUS } from '../config/contract'
import { EXPLORER_TX_URL, EXPLORER_ADDRESS_URL } from '../config/explorer'

const STATUS_STYLES = {
  Active: 'bg-status-active/15 text-status-active border-status-active/30',
  Released: 'bg-status-released/15 text-status-released border-status-released/30',
  Reclaimed: 'bg-status-reclaimed/15 text-status-reclaimed border-status-reclaimed/30',
}

function shortAddr(addr) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

export default function DealCard({ deal, onChanged }) {
  const { address } = useAccount()
  const [action, setAction] = useState(null) // 'release' | 'reclaim' | null

  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

useEffect(() => {
  if (isSuccess) {
    onChanged?.()
    const t = setTimeout(() => onChanged?.(), 1500)
    reset()
    setAction(null)
    return () => clearTimeout(t)
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [isSuccess])

  const statusLabel = DEAL_STATUS[deal.status]
  const isBuyer = address?.toLowerCase() === deal.buyer.toLowerCase()
  const deadlineDate = new Date(Number(deal.deadline) * 1000)
  const deadlinePassed = now >= deadlineDate.getTime()
  const busy = isPending || isConfirming

  function handleRelease() {
    setAction('release')
    writeContract({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: 'releaseFunds',
      args: [deal.id],
    })
  }

  function handleReclaim() {
    setAction('reclaim')
    writeContract({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: 'reclaimFunds',
      args: [deal.id],
    })
  }

  return (
    <div className="fade-in rounded-2xl border border-vault-rule bg-vault-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-sm text-ink-muted">Deal #{deal.id.toString()}</p>
          <p className="mt-1 font-display text-xl font-semibold text-ink">
            {formatEther(deal.amount)} MON
          </p>
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[statusLabel]}`}
        >
          {statusLabel}
        </span>
      </div>

      <div className="mt-4 space-y-1.5 text-sm">
        <div className="flex justify-between text-ink-muted">
          <span>Buyer</span>
          <a
            href={EXPLORER_ADDRESS_URL(deal.buyer)}
            target="_blank"
            rel="noopener noreferrer"
            className="font-display text-ink hover:text-accent"
          >
            {shortAddr(deal.buyer)}
          </a>
        </div>
        <div className="flex justify-between text-ink-muted">
          <span>Seller</span>
          <a
            href={EXPLORER_ADDRESS_URL(deal.seller)}
            target="_blank"
            rel="noopener noreferrer"
            className="font-display text-ink hover:text-accent"
          >
            {shortAddr(deal.seller)}
          </a>
        </div>
        <div className="flex justify-between text-ink-muted">
          <span>Deadline</span>
          <span className="font-display text-ink">
            {deadlineDate.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
          </span>
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-xl bg-danger/10 px-3 py-2 text-xs text-danger">
          {error.shortMessage || error.message}
        </p>
      )}

      {hash && (
        <a
          href={EXPLORER_TX_URL(hash)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block text-xs text-accent underline underline-offset-4 hover:text-accent-dim"
        >
          View transaction on Monad Explorer ↗
        </a>
      )}

      {isBuyer && statusLabel === 'Active' && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleRelease}
            disabled={busy}
            className="flex-1 rounded-xl bg-accent px-3 py-2.5 text-sm font-semibold text-vault-bg transition-colors hover:bg-accent-dim disabled:opacity-60"
          >
            {busy && action === 'release'
              ? isPending
                ? 'Confirm in wallet…'
                : 'Releasing…'
              : 'Release to seller'}
          </button>
          <button
            onClick={handleReclaim}
            disabled={busy || !deadlinePassed}
            title={!deadlinePassed ? 'Available after the deadline passes' : undefined}
            className="flex-1 rounded-xl border border-vault-rule px-3 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-danger/50 hover:text-danger disabled:opacity-40"
          >
            {busy && action === 'reclaim'
              ? isPending
                ? 'Confirm in wallet…'
                : 'Reclaiming…'
              : deadlinePassed
                ? 'Reclaim funds'
                : 'Reclaim (locked until deadline)'}
          </button>
        </div>
      )}
    </div>
  )
}
