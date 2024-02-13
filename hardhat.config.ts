import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
const dotenv = require("dotenv");
dotenv.config();

if (!process.env.PRIVATE_KEY || !process.env.SKALE_ENDPOINT || !process.env.ETHERSCAN_API_KEY || !process.env.CHAIN_ID || !process.env.API_URL || !process.env.BLOCKEXPLORER_URL) {
  throw new Error("Please set your PRIVATE_KEY, SKALE_ENDPOINT, ETHERSCAN_API_KEY, CHAIN_ID, API_URL, and BLOCKEXPLORER_URL in a .env file");
}

/** @type import('hardhat/config').HardhatUserConfig */
const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    skale: {
      url: process.env.SKALE_ENDPOINT,
      accounts: [process.env.PRIVATE_KEY],
    },

  },
  etherscan: {
    apiKey: {
      skale: process.env.ETHERSCAN_API_KEY,
    },
    customChains: [
      {
        network: "skale",
        chainId: parseInt(process.env.CHAIN_ID),
        urls: {
          apiURL: process.env.API_URL,
          browserURL: process.env.BLOCKEXPLORER_URL,
        }
      }
    ]
  }
};

export default config;
