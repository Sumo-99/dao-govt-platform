// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @dev Minimal interface to call `burnFrom()` from NationToken
 */
interface INationToken is IERC20 {
    function burnFrom(address account, uint256 amount) external;
}

contract PublicWelfare {
    address public owner;
    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    INationToken public immutable nationToken; // use the interface type directly here
    IERC721 public immutable citizenId;

    struct Proposal {
        string title;
        string details;
        bool active;
        bool exists;
        uint256 forVotes;
        uint256 againstVotes;
    }

    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    uint256 public nextProposalId;

    event ProposalCreated(uint256 indexed proposalId, string title);
    event ProposalOpened(uint256 indexed proposalId);
    event ProposalClosed(uint256 indexed proposalId);
    event Voted(uint256 indexed proposalId, address indexed voter, bool support);

    constructor(address _nationToken, address _citizenId) {
        require(_nationToken != address(0) && _citizenId != address(0), "zero addr");
        owner = msg.sender;
        nationToken = INationToken(_nationToken); // ✅ cast once here
        citizenId = IERC721(_citizenId);
    }

    function createProposal(string calldata title, string calldata details)
        external
        onlyOwner
        returns (uint256 proposalId)
    {
        require(bytes(title).length > 0, "title empty");
        proposalId = nextProposalId++;
        proposals[proposalId] = Proposal({
            title: title,
            details: details,
            active: false,
            exists: true,
            forVotes: 0,
            againstVotes: 0
        });
        emit ProposalCreated(proposalId, title);
    }

    function openProposal(uint256 proposalId) external onlyOwner {
        require(proposals[proposalId].exists, "no proposal");
        proposals[proposalId].active = true;
        emit ProposalOpened(proposalId);
    }

    function closeProposal(uint256 proposalId) external onlyOwner {
        require(proposals[proposalId].exists, "no proposal");
        proposals[proposalId].active = false;
        emit ProposalClosed(proposalId);
    }

    function vote(uint256 proposalId, bool support) external {
        Proposal storage p = proposals[proposalId];
        require(p.exists, "no proposal");
        require(p.active, "closed");
        require(citizenId.balanceOf(msg.sender) > 0, "not a citizen");
        require(!hasVoted[proposalId][msg.sender], "already voted");

        uint256 oneToken = 1 * 10 ** 18;
        require(nationToken.balanceOf(msg.sender) >= oneToken, "insufficient NAT");

        // ✅ now you can just call burnFrom directly, no casting needed here
        nationToken.burnFrom(msg.sender, oneToken);

        hasVoted[proposalId][msg.sender] = true;
        if (support) {
            p.forVotes += 1;
        } else {
            p.againstVotes += 1;
        }
        emit Voted(proposalId, msg.sender, support);
    }

    function getTally(uint256 proposalId)
        external
        view
        returns (uint256 forVotes, uint256 againstVotes)
    {
        require(proposals[proposalId].exists, "no proposal");
        Proposal storage p = proposals[proposalId];
        return (p.forVotes, p.againstVotes);
    }

    function currentResult(uint256 proposalId)
        external
        view
        returns (string memory title, uint256 forVotes, uint256 againstVotes, bool isActive, bool forLeading)
    {
        require(proposals[proposalId].exists, "no proposal");
        Proposal storage p = proposals[proposalId];
        return (p.title, p.forVotes, p.againstVotes, p.active, (p.forVotes >= p.againstVotes));
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "zero addr");
        owner = newOwner;
    }
}