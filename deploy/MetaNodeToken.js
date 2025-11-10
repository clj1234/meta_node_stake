const {upgrades,ethers} = require('hardhat');

// sepoliaAddress : 0x9dFce74DEbC4d9a1456965bb4F81f257c577Bb2d
/**
 * MetaNodeToken deployed to: 0x2140672baa3E6184247D7ac26d0Bc066172c85Ff
ℹ️ Implementation: 0x8B65bEd4239Dc59399D8cb959c90F86C8F8a4fd7
 **/
module.exports = async ({getNamedAccounts}) => {
    const { deployer } = await getNamedAccounts();
    const contractFactory = await ethers.getContractFactory("MetaNodeToken");
    const contract = await upgrades.deployProxy(
    contractFactory,
    [
      "MetaNodeToken", // 
      "MNT", // symbol
      deployer,
      ethers.parseUnits("1000000", 18), // initialSupply
    ],
    {
      initializer: "initialize",
      kind: "uups"
    }
  );
    await contract.waitForDeployment();
    contractAddress = await contract.getAddress();
    console.log("MetaNodeToken deployed to:", contractAddress);
    console.log("ℹ️ Implementation:", await upgrades.erc1967.getImplementationAddress(await contract.getAddress()));

}

module.exports.tags = ["MetaNodeToken"];