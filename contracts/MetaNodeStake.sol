// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.0;
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

import "hardhat/console.sol";

contract MetaNodeStake is Initializable,AccessControlUpgradeable,UUPSUpgradeable {
    bytes32 public constant ADMIN_ROLE = keccak256("admin_role");
    bytes32 public constant UPGRADE_ROLE = keccak256("upgrade_role");

    Pool[] public poolInfo; // 资金池信息
    uint256 public totalPoolWeight; // 所有资金池的权重总和
    uint256 public metaNodePerBlock; // 每经过一个区块高度获得的 MetaNode 数量
    IERC20 public metaNodeToken; // MetaNode 代币合约地址

    struct Pool {
        address stTokenAddress;// 质押代币的地址
        uint256 poolWeight; // 不同资金池所占的权重
        uint256 lastRewardBlock; // 上次分配奖励的区块高度
        uint256 accMetaNodePerST; // 质押1个代币经过1个区块高度，能拿到 n 个MetaNode
        uint256 stTokenAmount; // 质押的代币数量
        uint256 minDepositAmount; // 最小质押数量
        uint256 unstakeLockedBlocks; // Unstake locked blocks 解质押锁定的区块高度
    }

    struct User{
        uint256 amount; // 用户质押的代币数量
        uint256 finishMetaNode; // 用户已领取的奖励
        uint256 pendingMetaNode; // 用户待领取的奖励
        UnstakeRequest[] unstakeRequests; // 用户的解质押请求列表
    }

    struct UnstakeRequest{
        uint256 amount; // 解质押的代币数量
        uint256 requestBlock; // 发起解质押请求的区块高度
    }
    mapping(uint256 => mapping(address => User)) public userInfo; // 用户质押信息

    uint256 public startBlock; // 开始区块高度
    uint256 public endBlock; // 结束区块高度

    modifier checkPid(uint256 _pid) {
        require(_pid < poolInfo.length, "MetaNodeStake: pool not exists");
        _;
    }

    modifier checkStartAndEnd(){
        require(block.number >= startBlock && block.number <= endBlock, "MetaNodeStake: not in staking period");
        _;
    }

    function initialize(
        IERC20 _metaNodeToken,
        uint256 _startBlock,
        uint256 _endBlock,
        uint256 _metaNodePerBlock
    ) external initializer {
        __AccessControl_init();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(UPGRADE_ROLE, msg.sender);
        metaNodeToken = _metaNodeToken;
        startBlock = _startBlock;
        endBlock = _endBlock;
        metaNodePerBlock = _metaNodePerBlock;
    }


    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADE_ROLE) {}
    

    function addPool(address tokenAddress, uint256 poolWeight, uint256 minDepositAmount, uint256 unstakeLockedBlocks,bool _updatePoolAll) external onlyRole(ADMIN_ROLE)  {
        if(tokenAddress == address(0)){
            // 质押原生币逻辑
            require(poolInfo.length == 0, "MetaNodeStake: native token pool already exists");
        }
        if(_updatePoolAll){
            updatePoolAll();
        }
        poolInfo.push(Pool({
            stTokenAddress: tokenAddress,
            poolWeight: poolWeight,
            lastRewardBlock: block.number > startBlock ? block.number : startBlock,
            accMetaNodePerST: 0,
            stTokenAmount: 0,
            minDepositAmount: minDepositAmount,
            unstakeLockedBlocks: unstakeLockedBlocks
        }));
        totalPoolWeight += poolWeight;
    }

    function stakeToken(uint256 _pid,uint256 amount) external payable checkPid(_pid) {
        // 质押代币逻辑
        Pool storage pool = poolInfo[_pid];
        require(amount >= pool.minDepositAmount, "MetaNodeStake: amount less than minDepositAmount");
        updatePool(_pid);
        User storage user = userInfo[_pid][msg.sender];
        // 计算并更新用户奖励逻辑
        uint256 pending = (user.amount * pool.accMetaNodePerST) / 1 ether - user.finishMetaNode;
        if(pending > 0){
            user.pendingMetaNode += pending;
            user.finishMetaNode += pending;
        }
        if(_pid == 0){
            // 质押原生币逻辑
            require(msg.value == amount, "MetaNodeStake: msg.value not equal amount");
        }else{
            // 质押ERC20代币逻辑
            IERC20 stToken = IERC20(pool.stTokenAddress);
            require(stToken.transfer(msg.sender, amount), "MetaNodeStake: transferFrom failed");
        }
        user.amount += amount;
        pool.stTokenAmount += amount;
    }

    function unstakeToken(uint256 _pid, uint256 amount) external checkPid(_pid) {
        // 解质押代币逻辑
        Pool storage pool = poolInfo[_pid];
        User storage user = userInfo[_pid][msg.sender];
        require(user.amount >= amount, "MetaNodeStake: insufficient staked amount");
        updatePool(_pid);
        // 计算并更新用户奖励逻辑
        uint256 pending = (user.amount * pool.accMetaNodePerST) / 1 ether - user.finishMetaNode;
        if(pending > 0){
            user.pendingMetaNode += pending;
        }
        // 更新用户质押信息
        user.amount -= amount;
        pool.stTokenAmount -= amount;
        // 添加解质押请求
        user.unstakeRequests.push(UnstakeRequest({
            amount: amount,
            requestBlock: block.number
        }));
        user.finishMetaNode = user.amount * pool.accMetaNodePerST / 1 ether;
    }

    /**
     * 领取奖励
     * @param _pid 资金池id 
     */
    function cliam(uint256 _pid) external checkPid(_pid) {
        console.log("cliam------------------");
        updatePool(_pid);
        Pool storage pool = poolInfo[_pid];
        User storage user = userInfo[_pid][msg.sender];
        // 领取奖励逻辑
        uint256 amount = pool.accMetaNodePerST * user.amount / 1 ether - user.finishMetaNode;
        amount += user.pendingMetaNode;
        console.log("amount:",amount);
        require(amount > 0, "MetaNodeStake: no rewards to claim");
        user.pendingMetaNode = 0;
        user.finishMetaNode += amount;
        _safeTransferMetaNode(msg.sender, amount);
    }

    function getPendingRewardsByBlock(uint256 _pid,uint256 blockNum,address _uid) external view checkPid(_pid) returns (uint256) {
        Pool storage pool = poolInfo[_pid];
        User storage user = userInfo[_pid][_uid];
        uint256 accMetaNodePerSt = pool.accMetaNodePerST;
        if(blockNum > pool.lastRewardBlock){
            uint256 stSupply = pool.stTokenAmount;
            console.log("stSupply:",stSupply);
            if(stSupply > 0){
                // 获取最后奖励区块高度至当前区块高度的总奖励
                uint256 metaNodeByBlock = getMultiplier(pool.lastRewardBlock, blockNum);
                console.log("metaNodeByBlock:",metaNodeByBlock);
                // 计算每个质押代币的累计奖励
                uint256 metaNodePerByBlock = metaNodeByBlock * pool.poolWeight / totalPoolWeight;
                console.log("metaNodePerByBlock:",metaNodePerByBlock);
                accMetaNodePerSt = accMetaNodePerSt + metaNodePerByBlock * 1 ether / stSupply;
            }
        }
        uint256 pending = (user.amount * accMetaNodePerSt) / 1 ether - user.finishMetaNode;
        console.log("user.finishMetaNode:",user.finishMetaNode);
        console.log("pending:",pending);
        return pending + user.pendingMetaNode;
    }

    function _safeTransferMetaNode(address to, uint256 amount) internal {
        console.log("_safeTransferMetaNode1----------------------------");
        console.log("metaNodeTokenAddress:",address(metaNodeToken));
        uint256 metaNodeBal = metaNodeToken.balanceOf(address(this));
        console.log("_safeTransferMetaNode2----------------------------");
        if (amount > metaNodeBal) {
        console.log("_safeTransferMetaNode3----------------------------");
            require(metaNodeToken.transfer(to, metaNodeBal), "MetaNodeStake: transfer failed");
        } else {
        console.log("_safeTransferMetaNode4----------------------------");
            require(metaNodeToken.transfer(to, amount), "MetaNodeStake: transfer failed");
        }
    }

    /**
     * 更新资金池信息（代币奖励数）
     * @param _pid 资金池id
     */
    function updatePool(uint256 _pid) public {
        // 更新资金池信息逻辑
        Pool storage pool = poolInfo[_pid];
        uint256 lastRewardBlock = pool.lastRewardBlock;
        if(block.number <= lastRewardBlock || block.number < startBlock ){
            return;
        }
        uint256 stSupply = pool.stTokenAmount;
        if(stSupply > 0){
            // 获取最后奖励区块高度至当前区块高度的总奖励
            uint256 metaNodeByBlock = getMultiplier(lastRewardBlock, block.number);
            // 计算每个质押代币的累计奖励
            uint256 metaNodePerByBlock = metaNodeByBlock * 1 ether * pool.poolWeight / totalPoolWeight;
            pool.accMetaNodePerST += metaNodePerByBlock / stSupply;

        }
        pool.lastRewardBlock = block.number;
    }

    function getMultiplier(uint256 _from , uint256 _to) public view returns (uint256) {
        uint256 blockNumber;
        if (_to <= endBlock) {
            blockNumber =  _to - _from;
        } else if (_from >= endBlock) {
            blockNumber =  0;
        } else {
            blockNumber =  endBlock - _from;
        }
        console.log("blockNumber:",blockNumber);
        uint256 metaNodeByBlock = metaNodePerBlock * blockNumber;
        console.log("metaNodeByBlock in getMultiplier:",metaNodeByBlock);
        return metaNodeByBlock;
    }
    
    function withDraw(uint256 _pid ,address userAddress) external onlyRole(ADMIN_ROLE) {
        Pool storage pool = poolInfo[_pid];
        User storage user = userInfo[_pid][address(userAddress)];
        UnstakeRequest[] storage unstakeRequests = user.unstakeRequests;
        uint256 amount = 0;
        uint256 deleteNum = 0;
        for(uint256 i = 0; i < unstakeRequests.length; i++){
            UnstakeRequest storage request = unstakeRequests[i];
            if(block.number < request.requestBlock + pool.unstakeLockedBlocks){
                break;
            }
            amount += request.amount;
            // 记录已处理的解质押请求
            deleteNum++;
        }
        console.log("amount:",amount);
        uint256 head = 0;
        uint256 end = 0;
        while(end< unstakeRequests.length){
            unstakeRequests[head] = unstakeRequests[end];
            head++;
            end++;
        }
        for(uint256 i = 0;i< deleteNum;i++){
            unstakeRequests.pop();
        }
        if(amount > 0 ){
            if(_pid == 0){
                // 提取原生币逻辑
                payable(userAddress).transfer(amount);
            } else {
                // 提取ERC20代币逻辑
                IERC20 stToken = IERC20(pool.stTokenAddress);
                require(stToken.transfer(userAddress, amount), "MetaNodeStake: transfer failed");
            }
        }
    }


    function setMetaNodePerBlock(uint256 _metaNodePerBlock) external onlyRole(ADMIN_ROLE) {
        metaNodePerBlock = _metaNodePerBlock;
    }

    function setPoolWeight(uint256 _pid, uint256 _poolWeight,bool _updatePoolAll) external onlyRole(ADMIN_ROLE) checkPid(_pid) {
        Pool storage pool = poolInfo[_pid];
        if(_updatePoolAll){
            updatePoolAll();
        }
        totalPoolWeight = totalPoolWeight - pool.poolWeight + _poolWeight;
        pool.poolWeight = _poolWeight;
    }

    function updatePoolAll() public {
        uint256 poolLength = poolInfo.length;
        for(uint256 pid = 0;pid< poolLength ;pid++){
            updatePool(pid);
        }
    }

    function setMetaNodeToken(address _metaNodeToken) external onlyRole(ADMIN_ROLE) {
        metaNodeToken = IERC20(_metaNodeToken);
    }

    function setStartBlock(uint256 _startBlock) external onlyRole(ADMIN_ROLE) {
        startBlock = _startBlock;
    }

    function setEndBlock(uint256 _endBlock) external onlyRole(ADMIN_ROLE){
        endBlock = _endBlock;
    }

    // function getUserInfo(uint256 _pid, address userAddress) external view checkPid(_pid) returns (User memory) {
    //     return userInfo[_pid][userAddress];
    // }

    function getPoolInfoLength()external view returns (uint256){
        return poolInfo.length;
    }

    function getUserUnstakeRequestsLength(uint256 _pid,address _uid) external view returns (uint256){
        User storage user = userInfo[_pid][_uid];
        return user.unstakeRequests.length;
    }

}
