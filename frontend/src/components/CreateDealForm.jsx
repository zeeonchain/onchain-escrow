import { useState, useEffect } from 'react'
import { parseEther, isAddress } from 'viem'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { ESCROW_ADDRESS, ESCROW_ABI } from '../config/contract'
import { EXPLORER_TX_URL } from '../config/explorer'

export default function CreateDealForm({ onCreated }) {
  const [seller, setSeller] = useState('')
  const [amount, setAmount] = useState('')
  const [deadlineLocal, setDeadlineLocal] = useState('')
  const [formError, setFormError] = useState('')

  const { writeContract, data: hash, isPending, error: writeError, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

useEffect(() => {
  if (isSuccess) {
    setSeller('')
    setAmount('')
    setDeadlineLocal('')
    onCreated?.()
    const t = setTimeout(() => onCreated?.(), 1500)
    reset()
    return () => clearTimeout(t)
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [isSuccess])

  function handleSubmit(e) {
    e.preventDefault()
    setFormError('')

    if (!isAddress(seller)) {
      setFormError('Enter a valid seller wallet address.')
      return
    }
    if (!amount || Number(amount) <= 0) {
      setFormError('Enter an amount greater than zero.')
      return
    }
    if (!deadlineLocal) {
      setFormError('Pick a deadline.')
      return
    }
    const deadlineTs = Math.floor(new Date(deadlineLocal).getTime() / 1000)
    if (deadlineTs <= Math.floor(Date.now() / 1000)) {
      setFormError('Deadline must be in the future.')
      return
    }

    writeContract({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: 'createDeal',
      args: [seller, BigInt(deadlineTs)],
      value: parseEther(amount),
    })
  }

  const busy = isPending || isConfirming

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-vault-rule bg-vault-card p-6"
    >
      <h2 className="font-display text-base font-semibold text-ink">New deal</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Lock funds for a seller. You can release early, or reclaim once the deadline passes.
      </p>

      <div className="mt-5 flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-muted">Seller address</label>
          <input
            type="text"
            value={seller}
            onChange={(e) => setSeller(e.target.value)}
            placeholder="0x..."
            className="w-full rounded-xl border border-vault-rule bg-vault-bg px-3.5 py-2.5 font-display text-sm text-ink outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/15"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-muted">Amount (ETH)</label>
          <input
            type="number"
            step="any"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.05"
            className="w-full rounded-xl border border-vault-rule bg-vault-bg px-3.5 py-2.5 font-display text-sm text-ink outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/15"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-muted">Deadline</label>
          <input
            type="datetime-local"
            value={deadlineLocal}
            onChange={(e) => setDeadlineLocal(e.target.value)}
            className="w-full rounded-xl border border-vault-rule bg-vault-bg px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/15 [color-scheme:dark]"
          />
        </div>

        {(formError || writeError) && (
          <p className="rounded-xl bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
            {formError || writeError?.shortMessage || writeError?.message}
          </p>
        )}

        {hash && (
          <a
            href={EXPLORER_TX_URL(hash)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-accent underline underline-offset-4 hover:text-accent-dim"
          >
            View transaction on Basescan ↗
          </a>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-1 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-vault-bg transition-colors hover:bg-accent-dim disabled:opacity-60"
        >
          {isPending ? 'Confirm in wallet…' : isConfirming ? 'Locking funds…' : 'Create deal'}
        </button>
      </div>
    </form>
  )
}
