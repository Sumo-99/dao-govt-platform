// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title NationToken
 * @notice ERC20 + ERC20Permit + ERC20Votes + AccessControl
 *         - 18-decimal standard token for governance & voting
 *         - Human-friendly constructor: input supply in whole tokens
 *         - Role-based minting for MintDistributor/Treasury
 *         - Admin rescue helper if tokens are stuck in contract
 */
contract NationToken is ERC20, ERC20Permit, ERC20Votes, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /**
     * @param name_          Token name (e.g., "Nation Token")
     * @param symbol_        Token symbol (e.g., "NAT")
     * @param initialSupply  Whole tokens to mint to deployer (e.g., 100 => 100 tokens)
     */
    constructor(
        string memory name_,
        string memory symbol_,
        uint256 initialSupply
    ) ERC20(name_, symbol_) ERC20Permit(name_) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);

        if (initialSupply > 0) {
            // 🔹 Interpret input as whole tokens; scale up to 18 decimals
            _mint(msg.sender, initialSupply * 10 ** decimals());
        }
    }

    /// @notice Mint new tokens (in whole tokens) to `to`. Only MINTER_ROLE can call.
    function mintTo(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount * 10 ** decimals());
    }

    /// @notice Admin rescue helper: move tokens accidentally held by this contract.
    function sweepSelf(address to) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 bal = balanceOf(address(this));
        if (bal > 0) {
            _transfer(address(this), to, bal);
        }
    }

    /// @notice Burn tokens from caller's balance
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    /// @notice Burn tokens from a specific account (for contracts to burn user tokens)
    /// @dev Transfers tokens from account to this contract, then burns them - jr changes
    function burnFrom(address account, uint256 amount) external {
        // Transfer tokens from account to this contract first
        _transfer(account, address(this), amount);
        // Then burn them from this contract's balance
        _burn(address(this), amount);
    }

    // ---- Required overrides for ERC20Votes (OpenZeppelin 4.9.x) ----

    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20, ERC20Votes) {
        super._afterTokenTransfer(from, to, amount);
    }

    function _mint(
        address to,
        uint256 amount
    ) internal override(ERC20, ERC20Votes) {
        super._mint(to, amount);
    }

    function _burn(
        address from,
        uint256 amount
    ) internal override(ERC20, ERC20Votes) {
        super._burn(from, amount);
    }
}
