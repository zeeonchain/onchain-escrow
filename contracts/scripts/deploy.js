const hre = require('hardhat')

async function main() {
  const [deployer] = await hre.ethers.getSigners()
  console.log('Deploying Escrow with account:', deployer.address)

  const balance = await hre.ethers.provider.getBalance(deployer.address)
  console.log('Account balance:', hre.ethers.formatEther(balance), 'ETH')

  const Escrow = await hre.ethers.getContractFactory('Escrow')
  const escrow = await Escrow.deploy()
  await escrow.waitForDeployment()

  const address = await escrow.getAddress()
  const network = hre.network.name
  console.log('\nEscrow deployed to:', address)
  console.log('\nNext steps:')
  console.log('1. Verify the contract:')
  console.log(`   npx hardhat verify --network ${network} ${address}`)
  console.log('2. Copy this address into frontend/.env as VITE_CONTRACT_ADDRESS')
  console.log('3. Copy this address into the README under "Deployed Contract"')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
