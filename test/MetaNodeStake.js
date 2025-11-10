const {
  time,
  loadFixture,
  mine,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { upgrades, ethers } = require("hardhat");
const { get } = require("http");

describe("MetaNodeStake", function () {
  async function deployMetaNodeTokenFixture() {
    const [owner] = await ethers.getSigners();
    const MetaNodeTokenFactory = await ethers.getContractFactory(
      "MetaNodeToken",
      owner
    );
    const metaNodeToken = await upgrades.deployProxy(
      MetaNodeTokenFactory,
      [
        "MetaNodeToken", //
        "MNT", // symbol
        owner.address,
        ethers.parseUnits("10000000", 18), // initialSupply
      ],
      {
        initializer: "initialize",
        kind: "uups",
      }
    );
    metaNodeToken.waitForDeployment();
    return { metaNodeToken, owner };
  }
  async function deployMetaNodeStakeFixture() {
    const [owner] = await ethers.getSigners();
    const blockNum = await ethers.provider.getBlockNumber();
    const metaNodeStakeFactory = await ethers.getContractFactory(
      "MetaNodeStake",
      owner
    );
    const contract = await upgrades.deployProxy(
      metaNodeStakeFactory,
      [
        "0x0000000000000000000000000000000000000000",
        0, // _startBlock
        100000, // _endBlock
        100000, // _metaNodePerBlock
      ],
      {
        initializer: "initialize",
        kind: "uups",
      }
    );
    const metaNodeStake = await contract.waitForDeployment();
    return { metaNodeStake, owner };
  }

  async function getMetaNodeStakeAndTokenFromFixture() {
    const { metaNodeToken } = await loadFixture(deployMetaNodeTokenFixture);
    const metaNodeTokenAddress = await metaNodeToken.getAddress();
    const { metaNodeStake , owner} = await loadFixture(deployMetaNodeStakeFixture);
    // const contract = metaNodeStake.connect(owner);
    await metaNodeStake.setMetaNodeToken(metaNodeTokenAddress);
    // expect(await contract.metaNodeToken()).to.equal(metaNodeTokenAddress);
    return { metaNodeToken, metaNodeStake , owner };
  }

  describe("Deployment", function () {
    it("Deployment MetaNodeToken And MetaNodeStake", async function () {
      const { metaNodeToken, metaNodeStake , owner } = await getMetaNodeStakeAndTokenFromFixture();
      console.log("owner:", owner.address);
      // metaNodeStake.connect(owner);
      //   expect(await metaNodeToken.totalSupply()).to.equal(
      //     ethers.parseUnits("1000000", 18)
      //   );
      //   expect(await metaNodeStake.feePercent()).to.equal(1);
      //   expect(await metaNodeStake.owner()).to.equal(owner.address);
    });
  });
  describe("MetaNodeStake tranction", function () {
    it("MetaNodeToken tranction", async function () {
      const { metaNodeToken, owner } = await loadFixture(
        deployMetaNodeTokenFixture
      );
      metaNodeToken.connect(owner);
      const [_, deployer2] = await ethers.getSigners();
      const amount = ethers.parseUnits("1000", 18);
      await metaNodeToken.transfer(deployer2, amount);
      expect(await metaNodeToken.balanceOf(deployer2)).to.equal(amount);
    });
  });
  describe("MetaNodeStake ", function () {
    beforeEach(async function () {
      const {metaNodeToken, metaNodeStake ,owner} = await getMetaNodeStakeAndTokenFromFixture();
      const {deployer2}=ethers.getSigners();
      this.metaNodeToken = metaNodeToken;
      this.metaNodeStake = metaNodeStake;
      this.owner = owner;
      await metaNodeStake.addPool(
        ethers.ZeroAddress,
        100,
        ethers.parseUnits("10", 18),
        100,
        1
      );
      await metaNodeStake.addPool(
        metaNodeToken.getAddress(),
        200,
        ethers.parseUnits("20", 18),
        100,
        1
      );
      const pool0 = await metaNodeStake.poolInfo(0);
      const pool1 = await metaNodeStake.poolInfo(1);
      expect(pool0.stTokenAddress).to.equal(ethers.ZeroAddress);
      expect(pool1.stTokenAddress).to.equal(
        await metaNodeToken.getAddress()
      );
      const ownerTokenConnect = metaNodeToken.connect(owner);
      await ownerTokenConnect.transfer(metaNodeStake.getAddress(), ethers.parseUnits("5000000",18));
      expect(await metaNodeToken.balanceOf(await metaNodeStake.getAddress())).to.equal(ethers.parseUnits("5000000",18));
    });
    it("addPool", async function () {
      // const { metaNodeToken, metaNodeStake ,owner} = await getMetaNodeStakeAndTokenFromFixture();
      // metaNodeStake.connect(owner);
      // await metaNodeStake.setTotalPoolWeight(1000);
      // await metaNodeStake.addPool(
      //   metaNodeToken.getAddress(),
      //   200,
      //   ethers.parseUnits("20", 18),
      //   200
      // );
      // const pool0 = await metaNodeStake.poolInfo(0);
    });
    it("stakeToken", async function () {
      // const { metaNodeStake ,owner} = await getMetaNodeStakeAndTokenFromFixture();
      const poolInfoLength = await this.metaNodeStake.getPoolInfoLength();
      // console.log("poolInfo length:", (await poolInfo).length);
      expect(poolInfoLength).to.equal(2);
      const [_,deployer2]=await ethers.getSigners();
      const deployer2Instance = await this.metaNodeStake.connect(deployer2);
      await deployer2Instance.updatePool(0);
      // 质押ETH      
      await deployer2Instance.stakeToken(0, ethers.parseUnits("100",18),{value:ethers.parseUnits("100",18)});
      expect((await deployer2Instance.userInfo(0,deployer2.address)).amount).to.equal(ethers.parseUnits("100",18));
      await mine(100);
      deployer2Instance.updatePool(0);
      // 移除质押的ETH
      await deployer2Instance.unstakeToken(0, ethers.parseUnits("50",18));
      expect((await deployer2Instance.userInfo(0,deployer2.address)).amount).to.equal(ethers.parseUnits("50",18));
      const poolInfo0 = await deployer2Instance.poolInfo(0);
      console.log("poolInfo0:", poolInfo0);
      // 查询待领取奖励
      blockNum = await ethers.provider.getBlockNumber();
      await deployer2Instance.getMultiplier(0,blockNum);
      // console.log("metaNodePerBlock",await this.metaNodeStake.metaNodePerBlock());
      rewards = await deployer2Instance.getPendingRewardsByBlock(0,blockNum,deployer2.address);
      console.log("pending rewards after 100 blocks:", rewards);
    });
    it("测试完整流程", async function () {
      // const { metaNodeStake ,owner} = await getMetaNodeStakeAndTokenFromFixture();
      const poolInfoLength = await this.metaNodeStake.getPoolInfoLength();
      // console.log("poolInfo length:", (await poolInfo).length);
      expect(poolInfoLength).to.equal(2);
      const [_,deployer2]=await ethers.getSigners();
      const deployer2Instance = await this.metaNodeStake.connect(deployer2);
      await deployer2Instance.updatePool(0);
      // 质押ETH      
      await deployer2Instance.stakeToken(0, ethers.parseUnits("5000",18),{value:ethers.parseUnits("5000",18)});
      expect((await deployer2Instance.userInfo(0,deployer2.address)).amount).to.equal(ethers.parseUnits("5000",18));
      deployer2Balance = await ethers.provider.getBalance(deployer2.address)
      console.log("deployer2Balance：",deployer2Balance);
      await mine(100);
      await deployer2Instance.updatePool(0);
      // 移除质押的ETH
      await deployer2Instance.unstakeToken(0, ethers.parseUnits("2000",18));
      await mine(100);
      await deployer2Instance.unstakeToken(0, ethers.parseUnits("2000",18));
      expect((await deployer2Instance.userInfo(0,deployer2.address)).amount).to.equal(ethers.parseUnits("1000",18));
      await mine(100);
      // const {owner} = await ethers.getSigners();
      // 管理员审核移除质押请求
      const ownerInstance = await this.metaNodeStake.connect(this.owner)
      await ownerInstance.withDraw(0,deployer2.address);
      newDeployer2Balance = await ethers.provider.getBalance(deployer2.address)
      console.log("newDeployer2Balance：",newDeployer2Balance);
      expect(newDeployer2Balance).to.be.above(deployer2Balance);
      // 质押MetaNodeToken
      const metaNodeTokenOwnerInstance = await this.metaNodeToken.connect(this.owner);
      const tokenBalance = await metaNodeTokenOwnerInstance.balanceOf(this.owner);
      console.log("tokenBalance:",tokenBalance);
      await ownerInstance.stakeToken(1, tokenBalance);
      expect((await ownerInstance.userInfo(1,this.owner.address)).amount).to.equal(tokenBalance);
      // 
    });
  // 高覆盖率测试用例
  it("should achieve high coverage with comprehensive tests", async function () {
    const [_, user1, user2, user3] = await ethers.getSigners();
    
    // 测试1: 管理员功能
    console.log("=== Testing Admin Functions ===");
    
    // 设置每个区块奖励
    await this.metaNodeStake.connect(this.owner).setMetaNodePerBlock(ethers.parseUnits("2", 18));
    expect(await this.metaNodeStake.metaNodePerBlock()).to.equal(ethers.parseUnits("2", 18));
    
    // 设置资金池权重
    await this.metaNodeStake.connect(this.owner).setPoolWeight(0, 150, false);
    const pool0 = await this.metaNodeStake.poolInfo(0);
    expect(pool0.poolWeight).to.equal(150);
    
    // 设置开始和结束区块
    const currentBlock = await ethers.provider.getBlockNumber();
    await this.metaNodeStake.connect(this.owner).setStartBlock(currentBlock + 10);
    await this.metaNodeStake.connect(this.owner).setEndBlock(currentBlock + 1000);
    
    // 测试2: 多用户质押场景
    console.log("=== Testing Multi-User Staking ===");
    
    // 用户1质押原生币
    await mine(20); // 推进区块到开始区块之后
    const user1Instance = this.metaNodeStake.connect(user1);
    await user1Instance.stakeToken(0, ethers.parseUnits("100", 18), { 
      value: ethers.parseUnits("100", 18) 
    });
    
    // 用户2质押ERC20代币
    await this.metaNodeToken.connect(this.owner).transfer(user2.address, ethers.parseUnits("1000", 18));
    await this.metaNodeToken.connect(user2).approve(this.metaNodeStake.getAddress(), ethers.parseUnits("1000", 18));
    // 12_0000_0000_0000_0000_0000n
    const user2Instance = this.metaNodeStake.connect(user2);
    await user2Instance.stakeToken(1, ethers.parseUnits("200", 18));
    
    // 验证质押信息
    const user1Info = await this.metaNodeStake.userInfo(0, user1.address);
    const user2Info = await this.metaNodeStake.userInfo(1, user2.address);
    expect(user1Info.amount).to.equal(ethers.parseUnits("100", 18));
    expect(user2Info.amount).to.equal(ethers.parseUnits("200", 18));
    
    // 测试3: 奖励计算和领取
    console.log("=== Testing Reward Calculation and Claiming ===");
    
    // 推进区块产生奖励
    await mine(50);
    
    // 更新资金池
    await this.metaNodeStake.updatePool(0);
    await this.metaNodeStake.updatePool(1);
    
    // 检查待领取奖励
    const currentBlockNum = await ethers.provider.getBlockNumber();
    const user1Pending = await this.metaNodeStake.getPendingRewardsByBlock(0, currentBlockNum, user1.address);
    const user2Pending = await this.metaNodeStake.getPendingRewardsByBlock(1, currentBlockNum, user2.address);

    console.log("User1 pending rewards:", user1Pending.toString());
    console.log("User2 pending rewards:", user2Pending.toString());
    
    expect(user1Pending).to.be.gt(0);
    expect(user2Pending).to.be.gt(0);
    
    // 47999999999999999900
    // 4000000000000000000
    // 59428571428571428400
    // 用户1领取奖励
    const user1BalanceBefore = await this.metaNodeToken.balanceOf(user1.address);
    await user1Instance.cliam(0);
    const user1BalanceAfter = await this.metaNodeToken.balanceOf(user1.address);
    expect(user1BalanceAfter).to.be.gt(user1BalanceBefore);
    
    // 测试4: 解质押功能
    console.log("=== Testing Unstaking ===");
    
    // 用户1部分解质押
    await user1Instance.unstakeToken(0, ethers.parseUnits("30", 18));
    const user1InfoAfterUnstake = await this.metaNodeStake.userInfo(0, user1.address);
    expect(user1InfoAfterUnstake.amount).to.equal(ethers.parseUnits("70", 18)); // 100 - 30
    
    // 检查解质押请求
    // expect(user1InfoAfterUnstake.unstakeRequests.length).to.equal(1);
    
    // 测试5: 提取解锁代币
    console.log("=== Testing Withdrawal ===");
    
    // 推进区块超过锁定期
    await mine(150);
    
    const user1EthBalanceBefore = await ethers.provider.getBalance(user1.address);
    await this.metaNodeStake.connect(this.owner).withDraw(0, user1.address);
    const user1EthBalanceAfter = await ethers.provider.getBalance(user1.address);
    
    // ETH余额应该增加
    expect(user1EthBalanceAfter).to.be.gt(user1EthBalanceBefore);
    
    // 测试6: 批量更新所有资金池
    console.log("=== Testing Batch Pool Update ===");
    
    await this.metaNodeStake.updatePoolAll();
    
    // 验证所有池都已更新
    const pool0AfterUpdate = await this.metaNodeStake.poolInfo(0);
    const pool1AfterUpdate = await this.metaNodeStake.poolInfo(1);
    expect(pool0AfterUpdate.lastRewardBlock).to.equal(await ethers.provider.getBlockNumber());
    expect(pool1AfterUpdate.lastRewardBlock).to.equal(await ethers.provider.getBlockNumber());
    
    // 测试7: getMultiplier 边界情况
    console.log("=== Testing getMultiplier Edge Cases ===");
    
    const startBlock = await this.metaNodeStake.startBlock();
    const endBlock = await this.metaNodeStake.endBlock();
    
    // 情况1: _to <= endBlock
    // const multiplier1 = await this.metaNodeStake.getMultiplier(startBlock, startBlock + 50);
    // expect(multiplier1).to.equal(ethers.parseUnits("2", 18).mul(50));
    
    // // 情况2: _from >= endBlock
    // const multiplier2 = await this.metaNodeStake.getMultiplier(endBlock + 10, endBlock + 50);
    // expect(multiplier2).to.equal(0);
    
    // // 情况3: _from < endBlock < _to
    // const multiplier3 = await this.metaNodeStake.getMultiplier(endBlock - 20, endBlock + 50);
    // expect(multiplier3).to.equal(ethers.parseUnits("2", 18).mul(20));
    
    // 测试8: 错误处理和边界情况
    console.log("=== Testing Error Handling ===");
    
    // 测试不存在的资金池
    await expect(
      this.metaNodeStake.getPendingRewardsByBlock(999, currentBlockNum, user1.address)
    ).to.be.revertedWith("MetaNodeStake: pool not exists");
    
    // 测试质押数量不足最小要求
    await expect(
      user1Instance.stakeToken(0, ethers.parseUnits("5", 18), { value: ethers.parseUnits("5", 18) })
    ).to.be.revertedWith("MetaNodeStake: amount less than minDepositAmount");
    
    // 测试解质押数量超过质押数量
    await expect(
      user1Instance.unstakeToken(0, ethers.parseUnits("1000", 18))
    ).to.be.revertedWith("MetaNodeStake: insufficient staked amount");
    
    // 测试没有奖励时领取
    await expect(
      this.metaNodeStake.connect(user3).cliam(0)
    ).to.be.revertedWith("MetaNodeStake: no rewards to claim");
    
    // 测试9: 多次解质押和提取
    console.log("=== Testing Multiple Unstake and Withdraw ===");
    
    // 用户2多次解质押
    await user2Instance.unstakeToken(1, ethers.parseUnits("50", 18));
    await user2Instance.unstakeToken(1, ethers.parseUnits("30", 18));
    
    // const user2InfoMultiple = await this.metaNodeStake.userInfo(1, user2.address);
    // console.log(user2InfoMultiple);
    // expect(user2InfoMultiple.unstakeRequests.length).to.equal(2);
    
    // 推进区块超过锁定期
    await mine(150);
    
    // 提取所有解锁的代币
    const user2TokenBalanceBefore = await this.metaNodeToken.balanceOf(user2.address);
    console.log("user2TokenBalanceBefore:",user2TokenBalanceBefore);
    await this.metaNodeStake.connect(this.owner).withDraw(1, user2.address);
    const user2TokenBalanceAfter = await this.metaNodeToken.balanceOf(user2.address);
    //  80000000000000000000
    //  80000000000000000000
    // 应该收到 50 + 30 = 80 个代币
    console.log("user2TokenBalanceAfter:",user2TokenBalanceAfter);
    expect(user2TokenBalanceAfter - user2TokenBalanceBefore).to.equal(ethers.parseUnits("80", 18));
    
    // 测试10: 更新池权重时批量更新
    console.log("=== Testing Pool Weight Update with Batch Update ===");
    
    await this.metaNodeStake.connect(this.owner).setPoolWeight(0, 180, true);
    const pool0NewWeight = await this.metaNodeStake.poolInfo(0);
    expect(pool0NewWeight.poolWeight).to.equal(180);
    
    // 测试11: 添加资金池时批量更新
    console.log("=== Testing Add Pool with Batch Update ===");
    
    await this.metaNodeStake.connect(this.owner).addPool(
      this.metaNodeToken.getAddress(),
      300,
      ethers.parseUnits("15", 18),
      150,
      true
    );
    
    expect(await this.metaNodeStake.getPoolInfoLength()).to.equal(3);
    
    // 测试12: 奖励分配比例
    console.log("=== Testing Reward Distribution Ratio ===");
    
    // 验证总权重
    const totalWeight = await this.metaNodeStake.totalPoolWeight();
    expect(totalWeight).to.equal(180 + 200 + 300); // 100->150->180 + 200 + 300
    
    // 测试13: 安全转账（合约余额不足）
    console.log("=== Testing Safe Transfer with Insufficient Balance ===");
    
    // 创建一个新用户并产生大量奖励
    await this.metaNodeToken.connect(this.owner).transfer(user3.address, ethers.parseUnits("1000", 18));
    await this.metaNodeToken.connect(user3).approve(this.metaNodeStake.getAddress(), ethers.parseUnits("1000", 18));
    
    const user3Instance = this.metaNodeStake.connect(user3);
    await user3Instance.stakeToken(1, ethers.parseUnits("500", 18));
    
    // 推进大量区块产生巨额奖励
    await mine(1000);
    
    // 转移走合约中的大部分代币，模拟余额不足
    // const contractBalance = await this.metaNodeToken.balanceOf(this.metaNodeStake.getAddress());
    // const transferAmount = contractBalance - ethers.parseUnits("100", 18);
    // await this.metaNodeToken.connect(this.owner).transfer(this.owner.address, transferAmount);
    
    // // 用户3尝试领取奖励（应该成功但只转账剩余余额）
    // await expect(user3Instance.cliam(1)).to.not.be.reverted;
    
    console.log("=== All Tests Completed Successfully ===");
  });
  
});
});



