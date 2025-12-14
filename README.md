# Country DAO - Decentralized Nation Governance Platform

A comprehensive full-stack blockchain application that implements a complete nation governance system using smart contracts and a modern React frontend. This project features soulbound citizenship NFTs, a governance token (NAT), democratic elections for government positions, and token airdrops for citizens.

## 🎥 Video Demo

[![Watch the Demo](https://img.shields.io/badge/YouTube-Watch%20Demo-red?style=for-the-badge&logo=youtube)](https://www.youtube.com/watch?v=1MsVDMZWii4)

**[Click here to watch the full video demonstration →](https://www.youtube.com/watch?v=1MsVDMZWii4)**

## Table of Contents

- [Overview](#overview)
- [Screenshots](#screenshots)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running the Project](#running-the-project)
- [Project Structure](#project-structure)
- [Smart Contracts](#smart-contracts)
- [Frontend Application](#frontend-application)
- [Testing](#testing)
- [Deployment](#deployment)
- [How to Use the DApp](#how-to-use-the-dapp)
- [Troubleshooting](#troubleshooting)

## Overview

Country DAO is a decentralized nation governance platform that demonstrates how blockchain technology can be used to create transparent and tamper-proof governance systems. The project consists of:

- **4 Smart Contracts**: Implementing citizenship, token economy, elections, and airdrops
  - **SoulboundCitizenID.sol**: Non-transferable NFT-based citizenship system
  - **NationToken.sol**: ERC20 governance token (NAT) with voting delegation
  - **Election.sol**: Flexible position-based election system
  - **Airdropper.sol**: Token distribution system for citizens
- **React Frontend with Routing**: Multi-page web interface with dedicated sections for citizens, officials, admin controls, and airdrops
- **Comprehensive Test Suite**: Multiple test files covering all contract functionality

## UI

### Citizens Page Displaying All of the Minted Tokens

![Home Page](img/Screenshot%202025-11-03%20at%204.31.01%20PM.png)

_Citizens page showing all minted CitizenID NFTs with their token IDs and owner addresses_

### Elections & Voting

![Elections Page](img/Screenshot%202025-11-03%20at%204.31.57%20PM.png)

_Government positions with candidates and voting interface (requires 1 NAT token per vote)_

### Admin Controls & Airdropper

![Admin Page](img/Screenshot%202025-11-03%20at%204.32.28%20PM.png)

_Admin dashboard for managing elections, positions, and token distribution via an airdropper contract, acting as a pseudo treasury_

## Key Concepts

### Soulbound Citizenship

Citizens are represented by non-transferable NFTs (CitizenID). Once you register as a citizen, the NFT cannot be transferred to another address, ensuring citizenship is tied to your identity. Each address can only hold one citizenship.

### Token-Based Voting

Unlike traditional DAOs with free voting, this system requires burning 1 NAT token per vote. This:

- Prevents vote spam
- Ensures voters have stake in the system
- Creates deflationary pressure on the token
- Makes voting a meaningful economic decision

### Flexible Government Positions

Instead of hardcoded roles, the admin can create any government position with a custom name (President, Vice President, Minister of Finance, etc.). This allows the DAO to adapt its governance structure as needed.

### Dual-Gate System

Most actions require both:

1. **Citizenship** (CitizenID NFT) - Proves you're a member
2. **Tokens** (NAT) - Provides economic stake

This dual requirement ensures only committed community members can participate in governance.

## Features

### Core Functionality

- **Soulbound Citizenship**: Non-transferable NFT-based citizenship system where each address can hold one CitizenID
- **Self-Service Registration**: Users can register themselves as citizens or be registered by the contract owner
- **Governance Token (NAT)**: ERC20 token with 18 decimals, voting delegation, and role-based minting
- **Token-Based Voting**: Each vote costs 1 NAT token (burned), preventing vote spam and ensuring stake in the system
- **Flexible Election System**: Create government positions with custom names (President, Vice President, Minister, etc.)
- **Token Airdrops**: Citizenship-gated token distribution system with whole-token convenience functions
- **Multi-Page Frontend**: Dedicated pages for different governance functions with React Router navigation

### Smart Contract Features

#### SoulboundCitizenID

- Non-transferable ERC721 tokens (soulbound)
- One citizenship per address
- Self-service registration via `registerCitizen()`
- Owner can mint citizenship to specific addresses
- Citizenship can be burned by the token owner

#### NationToken

- ERC20 token with 18 decimals
- Initial supply: 1 million NAT tokens
- Role-based access control (MINTER_ROLE, DEFAULT_ADMIN_ROLE)
- Voting delegation (ERC20Votes)
- Burn and burnFrom functions for token consumption
- Human-friendly minting (specify whole tokens, auto-scaled to 18 decimals)

#### Election

- Create government positions with custom names
- Add candidates to positions
- Citizenship and token-gated voting (requires 1+ CitizenID and 1 NAT token)
- Automatic vote tallying and winner determination
- Close positions to end voting
- Track voting participation per position

#### Airdropper

- Citizenship-gated token distribution
- Support for both pre-funded airdrops and mint-and-airdrop
- Human-friendly amounts (specify whole tokens)
- Batch airdrops to multiple recipients
- Raw variants for precise control

## Technology Stack

### Backend/Blockchain

- **Solidity**: ^0.8.20 (Smart Contracts)
- **OpenZeppelin Contracts**: ^4.9.6 (Secure Contract Libraries)
- **Hardhat**: ^3.0.9 (Development Framework)
- **Viem**: ^2.38.4 (Ethereum Library)
- **TypeScript**: ~5.8.0

### Frontend

- **React**: ^19.1.1
- **React Router DOM**: ^7.9.5 (Client-side Routing)
- **TypeScript**: ^5.9.3
- **Ethers.js**: ^6.15.0 (Blockchain Interaction)
- **Vite**: ^7.1.7 (Build Tool)

### Testing

- Node.js Test Runner (`node:test`)
- Hardhat Viem Assertions

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: v18.x or higher
- **npm**: v9.x or higher
- **MetaMask**: Browser extension for wallet interactions
- **Git**: For cloning the repository

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd country_dao
```

### 2. Install Backend Dependencies

```bash
npm install
```

### 3. Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

## Running the Project

### Step 1: Start a Local Hardhat Node

Open a terminal and run:

```bash
npm run node
```

This starts a local Ethereum node at `http://127.0.0.1:8545`. Keep this terminal running.

### Step 2: Deploy the Smart Contracts

Open a new terminal and deploy all contracts:

```bash
npx hardhat ignition deploy ignition/modules/CountryDAO.ts --network localhost
```

This will:

- Compile all smart contracts (SoulboundCitizenID, NationToken, Election, Airdropper)
- Deploy them to your local Hardhat network in the correct order
- Display the deployed contract addresses

**Important**: Copy all four deployed contract addresses from the output:

- SoulboundCitizenID address
- NationToken address
- Election address
- Airdropper address

### Step 3: Configure the Frontend

1. Navigate to the frontend configuration file:

   ```
   frontend/src/config.ts
   ```

2. Update all contract addresses with your deployed contract addresses:
   ```typescript
   export const SOULBOUND_CITIZEN_ID_ADDRESS =
     "0xYourSoulboundCitizenIDAddress";
   export const NATION_TOKEN_ADDRESS = "0xYourNationTokenAddress";
   export const ELECTION_ADDRESS = "0xYourElectionAddress";
   export const AIRDROPPER_ADDRESS = "0xYourAirdropperAddress";
   ```

### Step 4: Start the Frontend

In a new terminal:

```bash
cd frontend
npm run dev
```

The frontend will be available at `http://localhost:3000`

### Step 5: Configure MetaMask

1. Open MetaMask browser extension
2. Add the Hardhat local network:

   - Network Name: `Hardhat Local`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency Symbol: `ETH`

3. Import a test account:
   - Hardhat provides test accounts with ETH
   - Copy a private key from the terminal running `npm run node`
   - Import the account into MetaMask

### Step 6: Access the DApp

1. Open `http://localhost:3000` in your browser
2. Connect your MetaMask wallet
3. Start interacting with the Country DAO!

## Project Structure

```
country_dao/
├── contracts/                      # Smart contracts
│   ├── SoulboundCitizenID.sol     # Citizenship NFT contract
│   ├── NationToken.sol            # Governance token (NAT)
│   ├── Election.sol               # Election system
│   └── Airdropper.sol             # Token distribution
├── frontend/                       # React application
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx         # Navigation bar
│   │   │   ├── Navbar.css
│   │   │   ├── CopyableAddress.tsx # Address display component
│   │   │   └── CopyableAddress.css
│   │   ├── pages/
│   │   │   ├── Home.tsx           # Home page
│   │   │   ├── Citizens.tsx       # Citizen management
│   │   │   ├── Officials.tsx      # Elected officials view
│   │   │   ├── Admin.tsx          # Admin controls
│   │   │   ├── Airdropper.tsx     # Token distribution UI
│   │   │   └── Pages.css          # Page styles
│   │   ├── App.tsx                # Main app with routing
│   │   ├── App.css                # App styles
│   │   ├── config.ts              # Contract addresses & ABIs
│   │   └── main.tsx               # Entry point
│   ├── package.json
│   └── vite.config.ts
├── ignition/                       # Deployment modules
│   └── modules/
│       └── CountryDAO.ts          # Deployment script (deploys all 4 contracts)
├── test/                           # Test files
│   ├── citizenship.ts             # SoulboundCitizenID tests
│   ├── election.ts                # Election tests
│   ├── nationToken.ts             # NationToken tests
│   └── old/
│       └── CountryDAO.ts          # Legacy tests
├── hardhat.config.ts               # Hardhat configuration
├── package.json                    # Backend dependencies
└── README.md                       # This file
```

## Smart Contracts

### Contract: SoulboundCitizenID.sol

Located at: `contracts/SoulboundCitizenID.sol`

A non-transferable (soulbound) ERC721 NFT that represents citizenship in the Nation DAO.

#### Key Functions

**Public Functions:**

- `registerCitizen()`: Self-service citizenship registration (mints a CitizenID NFT to caller)
- `burn(uint256 tokenId)`: Burn your own citizenship token

**Owner Functions:**

- `mintCitizen(address to)`: Mint citizenship to a specific address

**View Functions:**

- `balanceOf(address owner)`: Check if an address is a citizen (returns 0 or 1)
- `ownerOf(uint256 tokenId)`: Get the owner of a specific token ID
- `nextId()`: Get the next token ID to be minted

#### Events

- `Transfer(address indexed from, address indexed to, uint256 indexed tokenId)`

#### Important Notes

- Each address can only hold **one** CitizenID NFT
- Tokens are **non-transferable** (soulbound) - transfers between addresses are blocked
- Approvals are disabled to prevent any transfer attempts

---

### Contract: NationToken.sol

Located at: `contracts/NationToken.sol`

ERC20 governance token with 18 decimals, role-based access control, and voting delegation.

#### Key Functions

**Public Functions:**

- `burn(uint256 amount)`: Burn tokens from your balance
- `burnFrom(address account, uint256 amount)`: Burn tokens from another account (used by voting contracts)
- `transfer(address to, uint256 amount)`: Transfer tokens

**MINTER_ROLE Functions:**

- `mintTo(address to, uint256 amount)`: Mint new tokens (amount in whole tokens, auto-scaled to 18 decimals)

**ADMIN Functions:**

- `grantRole(bytes32 role, address account)`: Grant a role to an address
- `revokeRole(bytes32 role, address account)`: Revoke a role from an address
- `sweepSelf(address to)`: Rescue tokens stuck in the contract

**View Functions:**

- `balanceOf(address account)`: Get token balance
- `totalSupply()`: Get total token supply
- `decimals()`: Get token decimals (returns 18)
- `hasRole(bytes32 role, address account)`: Check if an address has a role

#### Initial Parameters

- **Name**: "Nation Token"
- **Symbol**: "NAT"
- **Initial Supply**: 1,000,000 tokens (1000000 \* 10^18 base units)
- **Decimals**: 18

#### Roles

- `DEFAULT_ADMIN_ROLE`: Can manage roles
- `MINTER_ROLE`: Can mint new tokens

#### Events

- `Transfer(address indexed from, address indexed to, uint256 value)`
- `RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)`
- `RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)`

---

### Contract: Election.sol

Located at: `contracts/Election.sol`

Flexible position-based election system with citizenship and token-gated voting.

#### Key Functions

**Owner Functions:**

- `createPosition(string name, address[] initialCandidates)`: Create a new government position with optional initial candidates
- `addCandidate(uint256 positionId, address candidate)`: Add a candidate to an existing position
- `closePosition(uint256 positionId)`: Close voting for a position
- `transferOwnership(address newOwner)`: Transfer contract ownership

**Citizen Functions:**

- `vote(uint256 positionId, address candidate)`: Vote for a candidate (costs 1 NAT token, requires CitizenID)

**View Functions:**

- `currentWinner(uint256 positionId)`: Get the current winner and vote count
- `getCandidates(uint256 positionId)`: Get all candidates for a position
- `positions(uint256 positionId)`: Get position details (name, active status, exists)
- `hasVoted(uint256 positionId, address voter)`: Check if an address has voted
- `votes(uint256 positionId, address candidate)`: Get vote count for a candidate

#### Voting Requirements

- Must have at least 1 CitizenID NFT
- Must have at least 1 NAT token (1 \* 10^18 base units)
- 1 NAT token is **burned** when voting
- Can only vote once per position

#### Events

- `PositionCreated(uint256 indexed positionId, string name)`
- `CandidateAdded(uint256 indexed positionId, address candidate)`
- `Voted(uint256 indexed positionId, address indexed voter, address indexed candidate)`
- `PositionClosed(uint256 indexed positionId)`

---

### Contract: Airdropper.sol

Located at: `contracts/Airdropper.sol`

Token distribution system with citizenship verification and human-friendly amount handling.

#### Key Functions

**Owner Functions (Human-Friendly):**

- `airdropOne(address recipient, uint256 amountWhole)`: Airdrop tokens to one citizen
- `airdropMany(address[] recipients, uint256[] amountsWhole)`: Batch airdrop to multiple citizens
- `mintAndAirdropOne(address recipient, uint256 amountWhole)`: Mint and airdrop to one citizen
- `mintAndAirdrop(address[] recipients, uint256[] amountsWhole)`: Mint and batch airdrop

**Owner Functions (Raw - Base Units):**

- `airdropManyRaw(address[] recipients, uint256[] amountsRaw)`: Batch airdrop with exact base units
- `mintAndAirdropRaw(address[] recipients, uint256[] amountsRaw)`: Mint and batch airdrop with exact base units

**View Functions:**

- `token()`: Get the token contract address
- `citizenNFT()`: Get the citizenship NFT contract address
- `tokenDecimals()`: Get token decimals
- `UNIT()`: Get the decimal unit (10^18)

#### Important Notes

- All recipients must be citizens (hold CitizenID NFT)
- Human-friendly functions accept whole tokens (e.g., 100 = 100 tokens)
- Raw functions accept base units (e.g., 100 \* 10^18)
- For `mintAndAirdrop` functions, contract must have MINTER_ROLE

---

## Frontend Application

### Architecture

The frontend is a multi-page React application using React Router for navigation.

**App.tsx** (`frontend/src/App.tsx`)

The main app component that sets up routing:

- Navigation bar (persistent across all pages)
- React Router configuration
- Routes to all pages

### Pages

**Home** (`frontend/src/pages/Home.tsx`)

- Landing page with overview and wallet connection
- Project introduction and navigation

**Citizens** (`frontend/src/pages/Citizens.tsx`)

- Citizen registration (via `registerCitizen()`)
- View citizenship status
- Display CitizenID NFT balance

**Officials** (`frontend/src/pages/Officials.tsx`)

- View all government positions
- See candidates and vote counts
- Display current winners
- Vote for candidates (costs 1 NAT token)

**Admin** (`frontend/src/pages/Admin.tsx`)

- Create new government positions
- Add candidates to positions
- Close positions
- Grant/revoke roles on NationToken
- Contract management functions

**Airdropper** (`frontend/src/pages/Airdropper.tsx`)

- Airdrop NAT tokens to citizens
- Support for single and batch airdrops
- Mint-and-airdrop functionality
- View airdrop history

### Components

**Navbar** (`frontend/src/components/Navbar.tsx`)

- Navigation menu with links to all pages
- Wallet connection button
- Display connected address
- Responsive design

**CopyableAddress** (`frontend/src/components/CopyableAddress.tsx`)

- Display Ethereum addresses with copy-to-clipboard functionality
- Shortened address format
- Visual feedback on copy

### Configuration

**config.ts** (`frontend/src/config.ts`)

Contains:

- All 4 contract addresses (update after deployment)
- Complete ABIs for all contracts
- Position constants (PRESIDENT, VICE_PRESIDENT, MINISTER)
- Position name mappings

## Testing

The project includes comprehensive tests covering all contract functionality.

### Run All Tests

```bash
npm test
```

### Test Files

The test suite is organized by contract:

**test/citizenship.ts** - SoulboundCitizenID Contract Tests

- Citizen registration (self-service and owner mint)
- One citizenship per address enforcement
- Soulbound transfer restrictions
- Token burning

**test/nationToken.ts** - NationToken Contract Tests

- Token minting with proper decimal scaling
- Role-based access control (MINTER_ROLE, DEFAULT_ADMIN_ROLE)
- Burning functionality
- Role management

**test/election.ts** - Election Contract Tests

- Position creation with initial candidates
- Adding candidates to positions
- Citizenship and token-gated voting
- Token burning on vote
- Vote tallying and winner determination
- Position closing

**test/old/CountryDAO.ts** - Legacy Tests

- Old contract tests (kept for reference)

### Test Coverage

Tests cover:

- Contract deployment and initialization
- Access control and permissions
- Citizenship management
- Token economics and burning
- Election lifecycle
- Vote counting and winner calculation
- Error cases and edge conditions

## Deployment

### Deploy to Local Network

```bash
npm run deploy
```

### Deploy to Sepolia Testnet

1. Set up your private key:

   ```bash
   npx hardhat keystore set SEPOLIA_PRIVATE_KEY
   ```

2. Set up Sepolia RPC URL:

   ```bash
   npx hardhat keystore set SEPOLIA_RPC_URL
   ```

3. Deploy:
   ```bash
   npx hardhat ignition deploy ignition/modules/CountryDAO.ts --network sepolia
   ```

## How to Use the DApp

### Initial Setup (First Time)

1. **Connect Wallet**

   - Click "Connect Wallet" in the navigation bar
   - Approve MetaMask connection
   - Ensure you're on the Hardhat Local network

2. **Register as a Citizen**

   - Navigate to the "Citizens" page
   - Click "Register as Citizen"
   - Confirm the transaction to mint your CitizenID NFT
   - You can only register once per address

3. **Get NAT Tokens**
   - The deployer starts with 1 million NAT tokens
   - Ask the admin to airdrop tokens to you via the Airdropper page
   - Or transfer tokens from another address
   - You need NAT tokens to vote (1 NAT per vote)

### As a Citizen

#### Participating in Elections

1. Navigate to the **Officials** page
2. View all government positions and candidates
3. Select a candidate you want to vote for
4. Click "Vote" (costs 1 NAT token)
5. Confirm the transaction in MetaMask
6. Your vote is recorded and the token is burned

### As the Contract Owner (Admin)

#### Managing Elections

Navigate to the **Admin** page to:

1. **Create a Government Position**

   - Enter position name (e.g., "President", "Minister of Finance")
   - Optionally add initial candidate addresses
   - Click "Create Position"

2. **Add Candidates**

   - Select an existing position
   - Enter candidate's Ethereum address
   - Click "Add Candidate"

3. **Close Voting**
   - Select a position
   - Click "Close Position" to end voting
   - View the winner on the Officials page

#### Managing Token Distribution

Navigate to the **Airdropper** page to:

1. **Airdrop to Single Citizen**

   - Enter recipient address (must be a citizen)
   - Enter amount in whole tokens (e.g., 100)
   - Click "Airdrop One"

2. **Batch Airdrop**

   - Enter multiple addresses (comma-separated)
   - Enter corresponding amounts
   - Click "Airdrop Many"

3. **Mint and Airdrop**
   - Use "Mint and Airdrop" functions to create new tokens
   - Requires Airdropper contract to have MINTER_ROLE

#### Managing Token Roles

In the **Admin** page:

1. **Grant Minting Rights**

   - Enter address to grant MINTER_ROLE
   - This allows the address to mint new NAT tokens

2. **Grant Admin Rights**
   - Enter address to grant DEFAULT_ADMIN_ROLE
   - This allows the address to manage roles

## Troubleshooting

### Common Issues

**Issue**: "Please install MetaMask to use this dApp"

- **Solution**: Install the MetaMask browser extension

**Issue**: "Please update contract addresses in config.ts"

- **Solution**: Deploy all contracts and update all 5 addresses in `frontend/src/config.ts`

**Issue**: Transaction fails with "not owner"

- **Solution**: Make sure you're using the wallet that deployed the contracts for admin functions

**Issue**: Transaction fails with "not a citizen"

- **Solution**: Register as a citizen first via the Citizens page before trying to vote or participate

**Issue**: Transaction fails with "insufficient tokens" or "insufficient NAT"

- **Solution**:
  - Each vote costs 1 NAT token (1 \* 10^18 base units)
  - Get tokens from the admin via the Airdropper page
  - Check your NAT balance on the frontend

**Issue**: Transaction fails with "Already a citizen"

- **Solution**: Each address can only hold one CitizenID NFT. You're already registered.

**Issue**: Transaction fails with "Soulbound: non-transferable"

- **Solution**: CitizenID NFTs cannot be transferred. They are soulbound to your address.

**Issue**: Transaction fails with "already voted"

- **Solution**: You can only vote once per position or proposal. You've already cast your vote.

**Issue**: Airdrop fails with "mint failed"

- **Solution**:
  - Ensure the Airdropper contract has MINTER_ROLE on NationToken
  - Grant role via Admin page
  - Or use regular airdrop (pre-fund Airdropper contract with tokens)

**Issue**: Frontend doesn't update after transaction

- **Solution**:
  - Refresh the page or wait a few seconds for the transaction to be mined
  - Check MetaMask for transaction status
  - Verify transaction on Hardhat node console

**Issue**: MetaMask not connecting

- **Solution**:
  1. Ensure MetaMask is unlocked
  2. Check that you're on the correct network (Hardhat Local: Chain ID 31337)
  3. Try disconnecting and reconnecting the wallet
  4. Clear MetaMask activity/nonce data if needed

**Issue**: "AccessControl: account is missing role"

- **Solution**:
  - Only addresses with the appropriate role can call certain functions
  - Grant required roles via the Admin page
  - MINTER_ROLE: Can mint tokens
  - DEFAULT_ADMIN_ROLE: Can manage roles

### Development Tips

1. **Reset Hardhat Node**: If you encounter state issues, stop and restart the Hardhat node
2. **Clear MetaMask Activity**: Reset account activity in MetaMask settings if transactions get stuck
3. **Check Console**: Browser console logs provide helpful debugging information
4. **Verify Network**: Ensure MetaMask is connected to the same network as your deployed contract

## Additional Resources

- [Hardhat Documentation](https://hardhat.org/docs)
- [Viem Documentation](https://viem.sh/)
- [Ethers.js Documentation](https://docs.ethers.org/)
- [React Documentation](https://react.dev/)
- [Solidity Documentation](https://docs.soliditylang.org/)

## NPM Scripts Reference

### Backend Scripts

```bash
npm test          # Run all tests
npm run compile   # Compile smart contracts
npm run deploy    # Deploy to localhost
npm run node      # Start Hardhat node
npm run clean     # Clean artifacts and cache
```

### Frontend Scripts

```bash
npm run dev       # Start development server (port 3000)
npm run build     # Build for production
npm run lint      # Run ESLint
npm run preview   # Preview production build
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Built with Hardhat 3, React 19, Solidity 0.8.20, and OpenZeppelin Contracts 4.9.6
