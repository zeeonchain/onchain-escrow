import { useAccount, useReadContract, useReadContracts } from 'wagmi'
import { ESCROW_ADDRESS, ESCROW_ABI } from '../config/contract'

export function useEscrowDeals() {
  const { address, isConnected } = useAccount()

  const {
    data: dealIds,
    isLoading: idsLoading,
    refetch: refetchIds,
  } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: ESCROW_ABI,
    functionName: 'getDealsForAddress',
    args: [address],
    query: { enabled: isConnected && !!address, refetchInterval: 4000 },
  })

  const dealContracts =
    dealIds?.map((id) => ({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: 'getDeal',
      args: [id],
    })) ?? []

  const {
    data: dealResults,
    isLoading: dealsLoading,
    refetch: refetchDeals,
  } = useReadContracts({
    contracts: dealContracts,
    query: { enabled: dealContracts.length > 0, refetchInterval: 4000 },
  })

  const deals =
    dealResults
      ?.map((r) => r.result)
      .filter(Boolean)
      .map((d) => ({
        id: d.id,
        buyer: d.buyer,
        seller: d.seller,
        amount: d.amount,
        deadline: d.deadline,
        status: d.status,
      }))
      // Newest first
      .sort((a, b) => Number(b.id) - Number(a.id)) ?? []

  function refetch() {
    refetchIds()
    refetchDeals()
  }

  return {
    deals,
    isLoading: idsLoading || (dealContracts.length > 0 && dealsLoading),
    refetch,
  }
}
