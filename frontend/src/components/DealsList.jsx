import DealCard from './DealCard'

export default function DealsList({ deals, isLoading, onChanged }) {
  if (isLoading) {
    return <p className="mt-6 text-sm text-ink-muted">Loading your deals…</p>
  }

  if (deals.length === 0) {
    return (
      <div className="mt-2 rounded-2xl border border-vault-rule bg-vault-card px-6 py-14 text-center">
        <p className="font-display text-lg font-semibold text-ink">No deals yet</p>
        <p className="mt-1.5 text-sm text-ink-muted">
          Create one above, or ask a buyer to name your address as the seller.
        </p>
      </div>
    )
  }

  return (
    <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
      {deals.map((deal) => (
        <DealCard key={deal.id.toString()} deal={deal} onChanged={onChanged} />
      ))}
    </div>
  )
}
