const {upgrades,ethers,network} = require('hardhat');
require('dotenv').config();
// sepoliaAddress : 0x9dFce74DEbC4d9a1456965bb4F81f257c577Bb2d
module.exports = async ({getNamedAccounts}) => {
    const { deployer } = await getNamedAccounts();
    const contractFactory = await ethers.getContractFactory("MetaNodeStake");
    const blockNum = await ethers.provider.getBlockNumber();
    const contract = await upgrades.deployProxy(
    contractFactory,
    [
      config.token[network.name].tokenAddress,
      blockNum, // _startBlock
      blockNum, // _endBlock
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