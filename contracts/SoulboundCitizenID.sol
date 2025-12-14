// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * SoulboundCitizenID (OZ 4.9.6):
 * - Non-transferable (blocked via _beforeTokenTransfer)
 * - Only contract owner can mint
 * - One token per address
 * - Token owner can burn
 */
contract SoulboundCitizenID is ERC721, Ownable {
    uint256 public nextId;

    // NOTE: Ownable() has NO args in OZ 4.9.x
    constructor() ERC721("CitizenID", "CID") Ownable() {}

    function mintCitizen(address to) external onlyOwner {
        require(balanceOf(to) == 0, "Already a citizen");
        _safeMint(to, ++nextId);
    }

    /// @notice Self-service citizenship registration - allows users to mint their own citizenship - jr changes
    function registerCitizen() external {
        require(balanceOf(msg.sender) == 0, "Already a citizen");
        _safeMint(msg.sender, ++nextId);
    }

    function burn(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        _burn(tokenId);
    }

    // Block all transfers (only allow mint (from=0) and burn (to=0))
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
        if (from != address(0) && to != address(0)) {
            revert("Soulbound: non-transferable");
        }
    }

    // Block approvals
    function approve(address, uint256) public pure override {
        revert("Soulbound: no approvals");
    }

    function setApprovalForAll(address, bool) public pure override {
        revert("Soulbound: no approvals");
    }
}
