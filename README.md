# 代币质押系统

项目结构

```
meme_token/
├─ contracts/           	# 所有 Solidity 合约文件 (.sol)
│  ├─ MetaNodeStake.sol 	# 代币质押合约
│  ├─ MetaNodeToken.sol		# 质押奖励代币
├─ deploy/
├─ test/                	# 测试文件（Mocha/Chai）
│  ├─ MetaNodeStake.js
├─ .env                 	# 环境变量（私钥、RPC 等）
├─ hardhat.config.js    	# Hardhat 配置文件
```



### MetaNodeStake.sol

## 1. **代币质押系统**

- 用户可以将代币质押到合约中
- 支持多个质押池或节点类型
- 记录每个用户的质押余额和质押时间

## 2. **奖励分配机制**

- 基于区块高度计算奖励（`__startBlock` 到 `__endBlock`）
- 可配置的每区块奖励数量（`__metaNodePerBlock`）
- 按质押比例分配奖励给用户

## 3. **时间锁定功能**

- 质押代币有解锁期限制
- 防止用户立即提取所有质押的代币
- 确保系统稳定性

## 4. **提现管理**

- 用户可提取已解锁的代币
- 支持部分提现和全部提现
- 提现时自动计算应得奖励

## 5. **管理员功能**

- 合约所有者可以设置关键参数
- 调整奖励速率和周期
- 紧急情况下的资金管理



### MetaNodeToken.sol（ERC20代币）





## 合约部署

### 配置文件

```
./hardhat.config.js
./config.json
```

#### .env  文件结构

```
PRIVATE_KEY=PRIVATE_KEY
SEPOLIA_RPC_URL=SEPOLIA_RPC_URL
```



### 部署指令

```
npx hardhat deploy --tags MetaNodeToken --network sepolia
（修改./config.json 的tokenAddress）
npx hardhat deploy --tags MetaNodeStake --network sepolia
```

### 测试指令

```
npx hardhat test ./test/MetaNodeStake.js
```



