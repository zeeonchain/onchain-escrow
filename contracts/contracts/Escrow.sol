// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Escrow
/// @notice A trustless two-party escrow. A buyer locks funds naming a seller
///         and a deadline. The buyer can release funds to the seller at any
///         time, or reclaim them once the deadline has passed. There is no
///         arbiter — the contract itself is the only referee.
/// @dev Every state-changing function follows checks -> effects -> interactions
///      to prevent reentrancy, and ReentrancyGuard is layered on top as
///      defense-in-depth in case that ordering is ever broken by a future edit.
contract Escrow is ReentrancyGuard {
    enum Status {
        Active,
        Released,
        Reclaimed
    }

    struct Deal {
        uint256 id;
        address buyer;
        address seller;
        uint256 amount;
        uint256 deadline;
        Status status;
    }

    /// @dev Deal id => Deal. Ids are assigned sequentially starting at 0.
    mapping(uint256 => Deal) private deals;

    /// @dev Total number of deals ever created. Also the next id to assign.
    uint256 public dealCount;

    event DealCreated(
        uint256 indexed id,
        address indexed buyer,
        address indexed seller,
        uint256 amount,
        uint256 deadline
    );

    event DealReleased(uint256 indexed id, address indexed buyer, address indexed seller, uint256 amount);

    event DealReclaimed(uint256 indexed id, address indexed buyer, uint256 amount);

    error ZeroAmount();
    error InvalidSeller();
    error SellerCannotBeBuyer();
    error DeadlineNotInFuture();
    error DealNotFound();
    error NotBuyer();
    error DealNotActive();
    error DeadlineNotPassed();
    error TransferFailed();

    /// @notice Creates a new escrow deal. The caller becomes the buyer and
    ///         must send the exact amount to be held, as msg.value.
    /// @param seller The address that will receive funds on release.
    /// @param deadline A unix timestamp. Must be strictly in the future.
    /// @return id The id assigned to the newly created deal.
    function createDeal(address seller, uint256 deadline) external payable returns (uint256 id) {
        // ---- checks ----
        if (msg.value == 0) revert ZeroAmount();
        if (seller == address(0)) revert InvalidSeller();
        if (seller == msg.sender) revert SellerCannotBeBuyer();
        if (deadline <= block.timestamp) revert DeadlineNotInFuture();

        // ---- effects ----
        id = dealCount;
        deals[id] = Deal({
            id: id,
            buyer: msg.sender,
            seller: seller,
            amount: msg.value,
            deadline: deadline,
            status: Status.Active
        });
        dealCount += 1;

        // ---- interactions ----
        // None — funds are already held by this contract via msg.value.
        emit DealCreated(id, msg.sender, seller, msg.value, deadline);
    }

    /// @notice Releases funds to the seller. Only the buyer may call this,
    ///         and only while the deal is still Active. Can be called at
    ///         any time before or after the deadline — release is always
    ///         the buyer's prerogative once they're satisfied.
    function releaseFunds(uint256 dealId) external nonReentrant {
        // ---- checks ----
        Deal storage deal = deals[dealId];
        if (deal.buyer == address(0)) revert DealNotFound();
        if (msg.sender != deal.buyer) revert NotBuyer();
        if (deal.status != Status.Active) revert DealNotActive();

        // ---- effects ----
        deal.status = Status.Released;
        uint256 amount = deal.amount;
        address seller = deal.seller;

        // ---- interactions ----
        (bool success, ) = payable(seller).call{value: amount}("");
        if (!success) revert TransferFailed();

        emit DealReleased(dealId, deal.buyer, seller, amount);
    }

    /// @notice Returns the buyer's funds once the deadline has passed and
    ///         the deal was never released. Only the buyer may call this,
    ///         and only while the deal is still Active.
    function reclaimFunds(uint256 dealId) external nonReentrant {
        // ---- checks ----
        Deal storage deal = deals[dealId];
        if (deal.buyer == address(0)) revert DealNotFound();
        if (msg.sender != deal.buyer) revert NotBuyer();
        if (deal.status != Status.Active) revert DealNotActive();
        if (block.timestamp < deal.deadline) revert DeadlineNotPassed();

        // ---- effects ----
        deal.status = Status.Reclaimed;
        uint256 amount = deal.amount;
        address buyer = deal.buyer;

        // ---- interactions ----
        (bool success, ) = payable(buyer).call{value: amount}("");
        if (!success) revert TransferFailed();

        emit DealReclaimed(dealId, buyer, amount);
    }

    /// @notice Reads a single deal by id.
    function getDeal(uint256 dealId) external view returns (Deal memory) {
        if (deals[dealId].buyer == address(0)) revert DealNotFound();
        return deals[dealId];
    }

    /// @notice Returns every deal id where `user` is either the buyer or
    ///         the seller. O(n) over all deals — fine at hackathon/demo
    ///         scale; a production version would index this off-chain.
    function getDealsForAddress(address user) external view returns (uint256[] memory) {
        uint256 matches = 0;
        for (uint256 i = 0; i < dealCount; i++) {
            if (deals[i].buyer == user || deals[i].seller == user) {
                matches++;
            }
        }

        uint256[] memory result = new uint256[](matches);
        uint256 cursor = 0;
        for (uint256 i = 0; i < dealCount; i++) {
            if (deals[i].buyer == user || deals[i].seller == user) {
                result[cursor] = i;
                cursor++;
            }
        }
        return result;
    }
}
