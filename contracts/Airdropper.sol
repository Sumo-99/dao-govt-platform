// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

interface IERC721Lite {
    function balanceOf(address owner) external view returns (uint256);
}

/**
 * @title Airdropper (citizenship-gated, human-friendly)
 * @notice Owner-only airdrops. Accept "whole token" amounts and scale by token decimals.
 *         Also exposes *Raw variants if you ever want to pass base units directly.
 */
contract Airdropper is Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;
    IERC721Lite public immutable citizenNFT;

    uint8  public immutable tokenDecimals;
    uint256 public immutable UNIT; // 10 ** tokenDecimals

    constructor(address tokenAddr, address citizenAddr) {
        require(tokenAddr != address(0) && citizenAddr != address(0), "zero addr");
        token = IERC20(tokenAddr);
        citizenNFT = IERC721Lite(citizenAddr);

        // Detect decimals from the token
        uint8 dec = IERC20Metadata(tokenAddr).decimals();
        tokenDecimals = dec;
        UNIT = 10 ** uint256(dec);
    }

    // ---------------------------
    // Human-friendly airdrops (scale by 10**decimals)
    // Pass amounts as whole tokens: 100 => 100.000... (decimals) tokens
    // ---------------------------

    /**
     * @dev Transfer tokens already held by this contract to recipients.
     *      Amounts are WHOLE TOKENS and will be scaled by 10**decimals.
     *      Pre-fund this contract with tokens before calling.
     */
    function airdropMany(address[] calldata recipients, uint256[] calldata amountsWhole)
        external
        onlyOwner
    {
        require(recipients.length == amountsWhole.length, "length mismatch");
        for (uint256 i = 0; i < recipients.length; i++) {
            require(citizenNFT.balanceOf(recipients[i]) > 0, "not a citizen");
            uint256 scaled = amountsWhole[i] * UNIT;
            token.safeTransfer(recipients[i], scaled);
        }
    }

    /**
     * @dev Mint-and-airdrop if this contract has MINTER_ROLE on the token.
     *      Amounts are WHOLE TOKENS and will be scaled by 10**decimals.
     *      Token must expose mintTo(address,uint256) in base units.
     */
    function mintAndAirdrop(address[] calldata recipients, uint256[] calldata amountsWhole)
        external
        onlyOwner
    {
        require(recipients.length == amountsWhole.length, "length mismatch");
        for (uint256 i = 0; i < recipients.length; i++) {
            require(citizenNFT.balanceOf(recipients[i]) > 0, "not a citizen");
            uint256 scaled = amountsWhole[i] * UNIT;
            (bool ok, ) = address(token).call(
                abi.encodeWithSignature("mintTo(address,uint256)", recipients[i], scaled)
            );
            require(ok, "mint failed");
        }
    }

    // Convenience single-recipient versions (also human-friendly)
    function airdropOne(address recipient, uint256 amountWhole) external onlyOwner {
        require(citizenNFT.balanceOf(recipient) > 0, "not a citizen");
        token.safeTransfer(recipient, amountWhole * UNIT);
    }

    function mintAndAirdropOne(address recipient, uint256 amountWhole) external onlyOwner {
        require(citizenNFT.balanceOf(recipient) > 0, "not a citizen");
        (bool ok, ) = address(token).call(
            abi.encodeWithSignature("mintTo(address,uint256)", recipient, amountWhole * UNIT)
        );
        require(ok, "mint failed");
    }

    // ---------------------------
    // Raw variants (no scaling) — pass base units directly if you need to
    // ---------------------------

    function airdropManyRaw(address[] calldata recipients, uint256[] calldata amountsRaw)
        external
        onlyOwner
    {
        require(recipients.length == amountsRaw.length, "length mismatch");
        for (uint256 i = 0; i < recipients.length; i++) {
            require(citizenNFT.balanceOf(recipients[i]) > 0, "not a citizen");
            token.safeTransfer(recipients[i], amountsRaw[i]);
        }
    }

    function mintAndAirdropRaw(address[] calldata recipients, uint256[] calldata amountsRaw)
        external
        onlyOwner
    {
        require(recipients.length == amountsRaw.length, "length mismatch");
        for (uint256 i = 0; i < recipients.length; i++) {
            require(citizenNFT.balanceOf(recipients[i]) > 0, "not a citizen");
            (bool ok, ) = address(token).call(
                abi.encodeWithSignature("mintTo(address,uint256)", recipients[i], amountsRaw[i])
            );
            require(ok, "mint failed");
        }
    }
}