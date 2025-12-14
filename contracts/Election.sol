// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./NationToken.sol";

contract Election {
    // Basic owner pattern to avoid external imports
    address public owner;
    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    IERC20 public immutable nationToken; // Keep as IERC20 for type safety
    IERC721 public immutable citizenId;

    struct Position {
        string name;
        bool active;
        bool exists;
    }

    // positionId => Position
    mapping(uint256 => Position) public positions;

    // positionId => candidate => votes
    mapping(uint256 => mapping(address => uint256)) public votes;

    // positionId => voter => voted?
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    // positionId => candidate listed?
    mapping(uint256 => mapping(address => bool)) public isCandidate;

    // positionId => list of candidates
    mapping(uint256 => address[]) public candidateList;

    uint256 public nextPositionId; 

    event PositionCreated(uint256 indexed positionId, string name);
    event PositionClosed(uint256 indexed positionId);
    event CandidateAdded(uint256 indexed positionId, address candidate);
    event Voted(
        uint256 indexed positionId,
        address indexed voter,
        address indexed candidate
    );

    constructor(address _nationToken, address _citizenId) {
        require(
            _nationToken != address(0) && _citizenId != address(0),
            "zero addr"
        );
        owner = msg.sender;
        nationToken = IERC20(_nationToken);
        citizenId = IERC721(_citizenId);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "zero addr");
        owner = newOwner;
    }

    /// Create a new government position with optional initial candidates
    /// @return positionId The ID of the newly created position
    function createPosition(
        string calldata name,
        address[] calldata initialCandidates
    ) external onlyOwner returns (uint256 positionId) {
        positionId = nextPositionId++; // Auto-increment

        positions[positionId] = Position({
            name: name,
            active: true,
            exists: true
        });
        emit PositionCreated(positionId, name);

        uint256 len = initialCandidates.length;
        for (uint256 i = 0; i < len; i++) {
            _addCandidate(positionId, initialCandidates[i]);
        }
    }

    /// Add a candidate to an existing position
    function addCandidate(
        uint256 positionId,
        address candidate
    ) external onlyOwner {
        require(positions[positionId].exists, "no position");
        _addCandidate(positionId, candidate);
    }

    /// Close voting for a position
    function closePosition(uint256 positionId) external onlyOwner {
        require(positions[positionId].exists, "no position");
        positions[positionId].active = false;
        emit PositionClosed(positionId);
    }

    /// Cast a single vote for a candidate in a position
    function vote(uint256 positionId, address candidate) external {
        Position memory p = positions[positionId];
        require(p.exists, "no position");
        require(p.active, "closed");

        // Eligibility: must have at least one CitizenID and at least 1 NAT token
        require(citizenId.balanceOf(msg.sender) > 0, "not a citizen");
        uint256 oneToken = 1 * 10 ** 18;
        require(
            nationToken.balanceOf(msg.sender) >= oneToken,
            "insufficient tokens"
        );

        require(!hasVoted[positionId][msg.sender], "already voted");
        require(isCandidate[positionId][candidate], "not a candidate");

        // Burn 1 NAT token from voter's balance (in 18 decimals, so 1 * 10^18)
        NationToken(address(nationToken)).burnFrom(msg.sender, oneToken);

        hasVoted[positionId][msg.sender] = true;
        votes[positionId][candidate] += 1;

        emit Voted(positionId, msg.sender, candidate);
    }

    /// Read the current winner by simple plurality
    function currentWinner(
        uint256 positionId
    ) external view returns (address winner, uint256 voteCount) {
        require(positions[positionId].exists, "no position");
        address[] memory list = candidateList[positionId];
        uint256 len = list.length;

        for (uint256 i = 0; i < len; i++) {
            address c = list[i];
            uint256 v = votes[positionId][c];
            if (v > voteCount) {
                voteCount = v;
                winner = c;
            }
        }
    }

    /// Return the list of candidates for a position
    function getCandidates(
        uint256 positionId
    ) external view returns (address[] memory) {
        return candidateList[positionId];
    }

    // Internal helper
    function _addCandidate(uint256 positionId, address candidate) internal {
        require(candidate != address(0), "zero addr");
        require(!isCandidate[positionId][candidate], "already candidate");
        isCandidate[positionId][candidate] = true;
        candidateList[positionId].push(candidate);
        emit CandidateAdded(positionId, candidate);
    }
}
