require('@nomicfoundation/hardhat-toolbox')
require('dotenv').config()

const { ALCHEMY_BASE_SEPOLIA_URL, PRIVATE_KEY, ETHERSCAN_API_KEY } = process.env

/** @type {import('hardhat/config').HardhatUserConfig} */
module.exports = {
  solidity: {
    version: '0.8.24',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    baseSepolia: {
      url: ALCHEMY_BASE_SEPOLIA_URL || '',
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 84532,
    },
    monadTestnet: {
      url: 'https://testnet-rpc.monad.xyz/',
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 10143,
    },
  },
  etherscan: {
    apiKey: {
      baseSepolia: ETHERSCAN_API_KEY || '',
    },
    customChains: [
      {
        network: 'baseSepolia',
        chainId: 84532,
        urls: {
          apiURL: 'https://api.etherscan.io/v2/api?chainid=84532',
          browserURL: 'https://sepolia.basescan.org',
        },
      },
    ],
  },
  sourcify: {
    enabled: true,
    apiUrl: 'https://sourcify-api-monad.blockvision.org',
    browserUrl: 'https://testnet.monadexplorer.com',
  },
}