// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.0;
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

contract MetaNodeToken is Initializable,ERC20Upgradeable,UUPSUpgradeable,AccessControlUpgradeable {

    bytes32 public constant ADMIN_ROLE = keccak256("admin_role");
    bytes32 public constant UPGRADE_ROLE = keccak256("upgrade_role");

    function initialize(
        string memory name,
        string memory symbol,
        address ownerAddress,
        uint256 initialSupply
    ) external initializer {
        __AccessControl_init();
        _grantRole(DEFAULT_ADMIN_ROLE, ownerAddress);
        _grantRole(ADMIN_ROLE, ownerAddress);
        _grantRole(UPGRADE_ROLE, ownerAddress);
        __ERC20_init(name, symbol);
        _mint(ownerAddress, initialSupply);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADE_ROLE) {}


}