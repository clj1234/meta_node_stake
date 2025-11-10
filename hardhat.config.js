require("@nomicfoundation/hardhat-toolbox");
require("hardhat-deploy");
require("dotenv").config();
require("solidity-coverage");
require("@openzeppelin/hardhat-upgrades");
const { PRIVATE_KEY, SEPOLIA_RPC_URL } = process.env;
/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  networks: {
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: [PRIVATE_KEY],
      timeout: 1000000,
    },
  },
  namedAccounts: {
    deployer: {
      default: 0, // here this will by default take the first account as deployer
      owner:0,
      deployer2 : 1,
    },
  },
};
