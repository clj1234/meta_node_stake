const {upgrades,ethers,network} = require('hardhat');
const fs = require("fs");
/** 
 *  MetaNodeStake deployed to: 0x2C8dB0901c9EaD832DE6A83FA749A5a025f0Fa7f
ℹ️ Implementation: 0x6284E87751CA94c20f6D854e8758C91430A2F8f5
 */
module.exports = async ({getNamedAccounts}) => {
    const { deployer } = await getNamedAccounts();
    const contractFactory = await ethers.getContractFactory("MetaNodeStake");
    config = JSON.parse(fs.readFileSync("./config.json"));
    const blockNum = await ethers.provider.getBlockNumber();
    const contract = await upgrades.deployProxy(
    contractFactory,
    [
      config.token[network.name].tokenAddress,
      blockNum, // _startBlock
      blockNum+10000, // _endBlock
      0, // _metaNodePerBlock
    ],
    {
      initializer: "initialize",
      kind: "uups"
    }
  );
    await contract.waitForDeployment();
    contractAddress = await contract.getAddress();
    console.log("MetaNodeStake deployed to:", contractAddress);
    console.log("ℹ️ Implementation:", await upgrades.erc1967.getImplementationAddress(await contract.getAddress()));

}

module.exports.tags = ["MetaNodeStake"];