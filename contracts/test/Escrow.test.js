const { expect } = require('chai')
const { ethers } = require('hardhat')
const { time } = require('@nomicfoundation/hardhat-network-helpers')

describe('Escrow', function () {
  async function deployFixture() {
    const [buyer, seller, stranger] = await ethers.getSigners()
    const Escrow = await ethers.getContractFactory('Escrow')
    const escrow = await Escrow.deploy()
    await escrow.waitForDeployment()

    const oneDay = 24 * 60 * 60
    const deadline = (await time.latest()) + oneDay
    const amount = ethers.parseEther('1')

    return { escrow, buyer, seller, stranger, deadline, amount }
  }

  describe('createDeal', function () {
    it('creates a deal and locks the funds in the contract', async function () {
      const { escrow, buyer, seller, deadline, amount } = await deployFixture()

      await expect(escrow.connect(buyer).createDeal(seller.address, deadline, { value: amount }))
        .to.emit(escrow, 'DealCreated')
        .withArgs(0, buyer.address, seller.address, amount, deadline)

      expect(await ethers.provider.getBalance(await escrow.getAddress())).to.equal(amount)

      const deal = await escrow.getDeal(0)
      expect(deal.buyer).to.equal(buyer.address)
      expect(deal.seller).to.equal(seller.address)
      expect(deal.amount).to.equal(amount)
      expect(deal.status).to.equal(0) // Active
    })

    it('rejects a deal with zero funds', async function () {
      const { escrow, buyer, seller, deadline } = await deployFixture()
      await expect(
        escrow.connect(buyer).createDeal(seller.address, deadline, { value: 0 })
      ).to.be.revertedWithCustomError(escrow, 'ZeroAmount')
    })

    it('rejects a zero-address seller', async function () {
      const { escrow, buyer, deadline, amount } = await deployFixture()
      await expect(
        escrow.connect(buyer).createDeal(ethers.ZeroAddress, deadline, { value: amount })
      ).to.be.revertedWithCustomError(escrow, 'InvalidSeller')
    })

    it('rejects the buyer naming themselves as seller', async function () {
      const { escrow, buyer, deadline, amount } = await deployFixture()
      await expect(
        escrow.connect(buyer).createDeal(buyer.address, deadline, { value: amount })
      ).to.be.revertedWithCustomError(escrow, 'SellerCannotBeBuyer')
    })

    it('rejects a deadline that is not in the future', async function () {
      const { escrow, buyer, seller, amount } = await deployFixture()
      const pastDeadline = (await time.latest()) - 1
      await expect(
        escrow.connect(buyer).createDeal(seller.address, pastDeadline, { value: amount })
      ).to.be.revertedWithCustomError(escrow, 'DeadlineNotInFuture')
    })
  })

  describe('releaseFunds', function () {
    it('lets the buyer release funds to the seller', async function () {
      const { escrow, buyer, seller, deadline, amount } = await deployFixture()
      await escrow.connect(buyer).createDeal(seller.address, deadline, { value: amount })

      const before = await ethers.provider.getBalance(seller.address)
      await expect(escrow.connect(buyer).releaseFunds(0))
        .to.emit(escrow, 'DealReleased')
        .withArgs(0, buyer.address, seller.address, amount)
      const after = await ethers.provider.getBalance(seller.address)

      expect(after - before).to.equal(amount)
      expect((await escrow.getDeal(0)).status).to.equal(1) // Released
    })

    // --- ATTACK: release from a wallet that is not the buyer ---
    it('blocks release from a wallet that is not the buyer', async function () {
      const { escrow, buyer, seller, stranger, deadline, amount } = await deployFixture()
      await escrow.connect(buyer).createDeal(seller.address, deadline, { value: amount })

      await expect(escrow.connect(stranger).releaseFunds(0)).to.be.revertedWithCustomError(
        escrow,
        'NotBuyer'
      )
      // The seller themself is also not the buyer, and must not be able to self-release.
      await expect(escrow.connect(seller).releaseFunds(0)).to.be.revertedWithCustomError(
        escrow,
        'NotBuyer'
      )
    })

    // --- ATTACK: release the same deal twice ---
    it('blocks releasing the same deal twice', async function () {
      const { escrow, buyer, seller, deadline, amount } = await deployFixture()
      await escrow.connect(buyer).createDeal(seller.address, deadline, { value: amount })
      await escrow.connect(buyer).releaseFunds(0)

      await expect(escrow.connect(buyer).releaseFunds(0)).to.be.revertedWithCustomError(
        escrow,
        'DealNotActive'
      )
    })

    it('blocks releasing a deal that was already reclaimed', async function () {
      const { escrow, buyer, seller, deadline, amount } = await deployFixture()
      await escrow.connect(buyer).createDeal(seller.address, deadline, { value: amount })
      await time.increaseTo(deadline + 1)
      await escrow.connect(buyer).reclaimFunds(0)

      await expect(escrow.connect(buyer).releaseFunds(0)).to.be.revertedWithCustomError(
        escrow,
        'DealNotActive'
      )
    })

    it('reverts on a deal id that was never created', async function () {
      const { escrow, buyer } = await deployFixture()
      await expect(escrow.connect(buyer).releaseFunds(999)).to.be.revertedWithCustomError(
        escrow,
        'DealNotFound'
      )
    })
  })

  describe('reclaimFunds', function () {
    // --- ATTACK: reclaim before the deadline ---
    it('blocks reclaiming before the deadline has passed', async function () {
      const { escrow, buyer, seller, deadline, amount } = await deployFixture()
      await escrow.connect(buyer).createDeal(seller.address, deadline, { value: amount })

      await expect(escrow.connect(buyer).reclaimFunds(0)).to.be.revertedWithCustomError(
        escrow,
        'DeadlineNotPassed'
      )
    })

    it('lets the buyer reclaim funds once the deadline has passed', async function () {
      const { escrow, buyer, seller, deadline, amount } = await deployFixture()
      await escrow.connect(buyer).createDeal(seller.address, deadline, { value: amount })
      await time.increaseTo(deadline + 1)

      const before = await ethers.provider.getBalance(buyer.address)
      const tx = await escrow.connect(buyer).reclaimFunds(0)
      const receipt = await tx.wait()
      const gasCost = receipt.gasUsed * receipt.gasPrice
      const after = await ethers.provider.getBalance(buyer.address)

      expect(after - before + gasCost).to.equal(amount)
      expect((await escrow.getDeal(0)).status).to.equal(2) // Reclaimed
    })

    it('blocks reclaiming from a wallet that is not the buyer', async function () {
      const { escrow, buyer, seller, stranger, deadline, amount } = await deployFixture()
      await escrow.connect(buyer).createDeal(seller.address, deadline, { value: amount })
      await time.increaseTo(deadline + 1)

      await expect(escrow.connect(stranger).reclaimFunds(0)).to.be.revertedWithCustomError(
        escrow,
        'NotBuyer'
      )
    })

    it('blocks reclaiming a deal that was already released', async function () {
      const { escrow, buyer, seller, deadline, amount } = await deployFixture()
      await escrow.connect(buyer).createDeal(seller.address, deadline, { value: amount })
      await escrow.connect(buyer).releaseFunds(0)
      await time.increaseTo(deadline + 1)

      await expect(escrow.connect(buyer).reclaimFunds(0)).to.be.revertedWithCustomError(
        escrow,
        'DealNotActive'
      )
    })

    it('blocks reclaiming the same deal twice', async function () {
      const { escrow, buyer, seller, deadline, amount } = await deployFixture()
      await escrow.connect(buyer).createDeal(seller.address, deadline, { value: amount })
      await time.increaseTo(deadline + 1)
      await escrow.connect(buyer).reclaimFunds(0)

      await expect(escrow.connect(buyer).reclaimFunds(0)).to.be.revertedWithCustomError(
        escrow,
        'DealNotActive'
      )
    })
  })

  describe('getDealsForAddress', function () {
    it('returns every deal where the address is buyer or seller', async function () {
      const { escrow, buyer, seller, stranger, deadline, amount } = await deployFixture()

      await escrow.connect(buyer).createDeal(seller.address, deadline, { value: amount }) // id 0
      await escrow.connect(seller).createDeal(stranger.address, deadline, { value: amount }) // id 1, seller is buyer here
      await escrow.connect(stranger).createDeal(buyer.address, deadline, { value: amount }) // id 2

      const sellerDeals = await escrow.getDealsForAddress(seller.address)
      // seller appears as seller in deal 0, and as buyer in deal 1
      expect(sellerDeals.map(Number)).to.deep.equal([0, 1])

      const buyerDeals = await escrow.getDealsForAddress(buyer.address)
      // buyer appears as buyer in deal 0, and as seller in deal 2
      expect(buyerDeals.map(Number)).to.deep.equal([0, 2])
    })
  })
})
