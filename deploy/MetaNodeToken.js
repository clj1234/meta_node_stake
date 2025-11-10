const {upgrades,ethers} = require('hardhat');

// sepoliaAddress : 0x9dFce74DEbC4d9a1456965bb4F81f257c577Bb2d
/**
 * MetaNodeToken deployed to: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
ℹ️ Implementation: 0x5FbDB2315678afecb367f032d93F642f64180aa3
 **/
module.exports = async ({getNamedAccounts}) => {
    const { deployer } = await getNamedAccounts();
    const contractFactory = await ethers.getContractFactory("MetaNodeToken");
    const contract = await upgrades.deployProxy(
    contractFactory,
    [
      "MetaNodeToken", // 
      "MNT", // symbol
      ethers.parseUnits("1000000", 18), // initialSupply
    ],
    {
      initializer: "initialize",
      // kind: "uups"
    }
  );
    await contract.waitForDeployment();
    contractAddress = await contract.getAddress();
    console.log("MetaNodeToken deployed to:", contractAddress);
    console.log("ℹ️ Implementation:", await upgrades.erc1967.getImplementationAddress(await contract.getAddress()));

}

module.exports.tags = ["MetaNodeToken"];