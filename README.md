# Onchain Escrow

A classmate of mine mentioned this a few times between classes — she'd pay someone upfront for a small task or some digital work, and then just... hope. No way to know if they'd actually deliver until it was too late to do anything about it if they didn't.

It got me thinking about why that has to be an all-or-nothing thing. Either you pay upfront and trust blindly, or you don't pay and probably lose the deal. There's no in-between where you can commit the money but still hold some leverage.

Onchain Escrow lets a buyer lock funds for a specific person with a deadline, instead of sending them directly. The buyer can release the funds once they're confident the other side delivered, or reclaim them if the deadline passes with nothing done. There is no arbiter, no admin key, and no way for anyone but the buyer to move the funds. The contract is the only referee.

**Live app:** https://onchain-escrow-six.vercel.app
**Demo video:** _add your 3-minute demo link here_
**Deployed contract (Monad Testnet):** `0x347a6E644e26C44003C848D564EB3ad75cde7DC0` — [view on Monad Explorer](https://testnet.monadexplorer.com/contracts/full_match/10143/0x347a6E644e26C44003C848D564EB3ad75cde7DC0/)

---

## How it works

1. **Buyer creates a deal** — names a seller address, sets a deadline, and sends MON. The contract holds the funds.
2. **Buyer releases funds** — at any point, whenever they're satisfied the seller delivered. Funds move straight to the seller.
3. **Buyer reclaims funds** — only if the deadline has passed and the deal was never released. Funds return to the buyer.

Every deal is permanently one of three states: `Active`, `Released`, or `Reclaimed`. Once a deal leaves `Active`, it's settled forever — neither function can touch it again.

## Architecture

contracts/   Solidity contract, Hardhat project, full test suite
frontend/    React + Vite + Tailwind, wagmi + viem + RainbowKit

The contract is deliberately minimal: one struct, one mapping, three state-changing functions, three events. No proxy, no upgradeability, no admin — there's nothing to make trustless if the deployer can still pull a lever.

## Security

Every function that moves money follows **checks → effects → interactions**:
state is validated, then updated, then (only after that) an external call is made. This is the standard defense against reentrancy — by the time any external contract could call back in, this contract's own bookkeeping already reflects the new state, so a second entry finds nothing left to exploit. `ReentrancyGuard` from OpenZeppelin is layered on top of that as a second line of defense, not a replacement for it.

**Attacks tried before shipping, and what happens:**

| Attack | Result |
|---|---|
| Release funds from a wallet that isn't the buyer | Reverts with `NotBuyer` |
| Release the same deal twice | Reverts with `DealNotActive` (status is no longer `Active` after the first release) |
| Reclaim before the deadline | Reverts with `DeadlineNotPassed` |
| Create a deal with zero funds | Reverts with `ZeroAmount` — a deal with nothing at stake isn't a deal, so it's rejected outright rather than silently allowed |
| Reclaim the same deal twice | Reverts with `DealNotActive` |
| Release or reclaim a deal that was already settled | Reverts with `DealNotActive` in both directions, regardless of which function settled it first |
| Buyer names themselves as the seller | Reverts with `SellerCannotBeBuyer` |
| Buyer names the zero address as the seller | Reverts with `InvalidSeller` |
| Deadline set in the past or right now | Reverts with `DeadlineNotInFuture` |

These are all covered by automated tests in `contracts/test/Escrow.test.js` — run `npm test` inside `contracts/` to see them pass.

**Known limitation:** if a seller is a contract that deliberately reverts on receiving MON, `releaseFunds` will revert too, and the funds stay locked until the deadline (at which point the buyer can reclaim). This is a deliberate trade-off of the "no arbiter" design — there's no way to force a payment through, and no admin who could override it either.

## Audit

Before shipping, I went through the contract the way a reviewer would — checking every function against the standard categories: reentrancy, access control, integer issues, griefing, timestamp manipulation, and fund-accounting correctness.

**Reentrancy** — Clean. Every fund-moving function follows checks → effects → interactions (state is finalized *before* the external call), with `ReentrancyGuard` layered on top as an independent second lock. This also covers cross-function reentrancy: OpenZeppelin's guard uses one shared lock across every guarded function, so a malicious seller's fallback can't re-enter a *different* deal's `reclaimFunds` mid-transfer either — not just the same function.

**Access control** — Clean. Every state-changing function checks `msg.sender` against the correct role before touching state. No function is missing a guard.

**Fund accounting** — Clean. The contract never holds MON it doesn't have a record of. It also has no `receive()` or `fallback()`, so a direct MON transfer to the contract (outside of `createDeal`) simply reverts — no stray, untracked funds can ever get stuck.

**Two informational findings** (neither is exploitable, both worth naming rather than glossing over):

1. **`getDealsForAddress` is O(n)** over every deal ever created. Fine at hackathon/demo scale; a production version would index this off-chain instead, since a very large deal count could eventually make this read slow. This is a scalability limitation, not a fund-safety one.
2. **Deadlines rely on `block.timestamp`**, which miners/sequencers can nudge by a few seconds. Standard, accepted behavior for deadlines measured in minutes/hours/days — it would only matter for something needing sub-second precision, which this isn't.

No critical, high, or medium severity findings.

## Tech stack

| Layer | Choice |
|---|---|
| Contract | Solidity + Hardhat |
| Chain | Monad Testnet |
| Frontend | React + Vite + Tailwind CSS |
| Chain connection | wagmi + viem + RainbowKit |
| RPC | Monad public RPC |
| Deployment | Vercel (frontend), Sourcify via Monad Explorer (contract verification) |

## Running it locally

### 1. Contracts

```bash
cd contracts
npm install
cp .env.example .env
# fill in PRIVATE_KEY
npm test
```

To deploy and verify on Monad Testnet:
```bash
npm run deploy:monadTestnet
# copy the printed address, then:
npm run verify:monadTestnet -- <deployed-address>
```

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env
# fill in VITE_WALLETCONNECT_PROJECT_ID, VITE_CONTRACT_ADDRESS
npm run dev
```

Open the local URL, connect a wallet on Monad Testnet (get free testnet MON from the [Monad faucet](https://faucet.monad.xyz/)), and create a deal.

## Environment variables

See `.env.example` in both `contracts/` and `frontend/` for the full list. Nothing sensitive is hardcoded anywhere in the source — every address, key, and RPC URL is read from environment variables at runtime or build time.