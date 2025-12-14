// Contract Addresses - Update these after deploying your contracts
export const SOULBOUND_CITIZEN_ID_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
export const NATION_TOKEN_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
export const ELECTION_ADDRESS = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
export const AIRDROPPER_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"; // Update after deployment
export const PUBLIC_WELFARE_ADDRESS = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9"; // Update after deployment

// SoulboundCitizenID Contract ABI
export const SOULBOUND_CITIZEN_ID_ABI = [
  "function mintCitizen(address to) external",
  "function registerCitizen() external",
  "function balanceOf(address owner) external view returns (uint256)",
  "function burn(uint256 tokenId) external",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function owner() external view returns (address)",
  "function nextId() external view returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
];

// NationToken Contract ABI
export const NATION_TOKEN_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function totalSupply() external view returns (uint256)",
  "function mintTo(address to, uint256 amount) external",
  "function burn(uint256 amount) external",
  "function burnFrom(address account, uint256 amount) external",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function name() external view returns (string)",
  "function hasRole(bytes32 role, address account) external view returns (bool)",
  "function grantRole(bytes32 role, address account) external",
  "function revokeRole(bytes32 role, address account) external",
  "function MINTER_ROLE() external view returns (bytes32)",
  "function DEFAULT_ADMIN_ROLE() external view returns (bytes32)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)",
  "event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)"
];

// Election Contract ABI
export const ELECTION_ABI = [
  "function createPosition(string memory name, address[] memory initialCandidates) external returns (uint256 positionId)",
  "function addCandidate(uint256 positionId, address candidate) external",
  "function vote(uint256 positionId, address candidate) external",
  "function closePosition(uint256 positionId) external",
  "function transferOwnership(address newOwner) external",
  "function currentWinner(uint256 positionId) external view returns (address winner, uint256 voteCount)",
  "function getCandidates(uint256 positionId) external view returns (address[] memory)",
  "function positions(uint256 positionId) external view returns (string memory name, bool active, bool exists)",
  "function hasVoted(uint256 positionId, address voter) external view returns (bool)",
  "function isCandidate(uint256 positionId, address candidate) external view returns (bool)",
  "function votes(uint256 positionId, address candidate) external view returns (uint256)",
  "function owner() external view returns (address)",
  "function nationToken() external view returns (address)",
  "function citizenId() external view returns (address)",
  "event PositionCreated(uint256 indexed positionId, string name)",
  "event CandidateAdded(uint256 indexed positionId, address candidate)",
  "event Voted(uint256 indexed positionId, address indexed voter, address indexed candidate)",
  "event PositionClosed(uint256 indexed positionId)"
];

// Position IDs (can be any number, but using 0, 1, 2... for simplicity)
export const POSITIONS = {
  PRESIDENT: 0,
  VICE_PRESIDENT: 1,
  MINISTER: 2
} as const;

export const POSITION_NAMES: { [key: number]: string } = {
  0: "President",
  1: "Vice President",
  2: "Minister"
};

// Airdropper Contract ABI
export const AIRDROPPER_ABI = [
  "function airdropMany(address[] calldata recipients, uint256[] calldata amountsWhole) external",
  "function mintAndAirdrop(address[] calldata recipients, uint256[] calldata amountsWhole) external",
  "function airdropOne(address recipient, uint256 amountWhole) external",
  "function mintAndAirdropOne(address recipient, uint256 amountWhole) external",
  "function airdropManyRaw(address[] calldata recipients, uint256[] calldata amountsRaw) external",
  "function mintAndAirdropRaw(address[] calldata recipients, uint256[] calldata amountsRaw) external",
  "function token() external view returns (address)",
  "function citizenNFT() external view returns (address)",
  "function tokenDecimals() external view returns (uint8)",
  "function UNIT() external view returns (uint256)",
  "function owner() external view returns (address)"
];

// PublicWelfare Contract ABI
export const PUBLIC_WELFARE_ABI = [
  "function createProposal(string calldata title, string calldata details) external returns (uint256 proposalId)",
  "function openProposal(uint256 proposalId) external",
  "function closeProposal(uint256 proposalId) external",
  "function vote(uint256 proposalId, bool support) external",
  "function getTally(uint256 proposalId) external view returns (uint256 forVotes, uint256 againstVotes)",
  "function currentResult(uint256 proposalId) external view returns (string memory title, uint256 forVotes, uint256 againstVotes, bool isActive, bool forLeading)",
  "function proposals(uint256 proposalId) external view returns (string memory title, string memory details, bool active, bool exists, uint256 forVotes, uint256 againstVotes)",
  "function hasVoted(uint256 proposalId, address voter) external view returns (bool)",
  "function nextProposalId() external view returns (uint256)",
  "function owner() external view returns (address)",
  "function nationToken() external view returns (address)",
  "function citizenId() external view returns (address)",
  "function transferOwnership(address newOwner) external",
  "event ProposalCreated(uint256 indexed proposalId, string title)",
  "event ProposalOpened(uint256 indexed proposalId)",
  "event ProposalClosed(uint256 indexed proposalId)",
  "event Voted(uint256 indexed proposalId, address indexed voter, bool support)"
];
