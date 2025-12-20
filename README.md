# Country DAO - Decentralized Nation Governance Platform

A comprehensive full-stack blockchain application that implements a complete nation governance system using smart contracts and a modern React frontend. This project features soulbound citizenship NFTs, a governance token (NAT), democratic elections for government positions, token airdrops for citizens, and a public welfare proposal system.



## Overview

Country DAO is a decentralized nation governance platform that demonstrates how blockchain technology can be used to create transparent and tamper-proof governance systems. The project consists of:

- **4 Smart Contracts**: Implementing citizenship, token economy, elections, and airdrops
  - **SoulboundCitizenID.sol**: Non-transferable NFT-based citizenship system
  - **NationToken.sol**: ERC20 governance token (NAT) with voting delegation
  - **Election.sol**: Flexible position-based election system
  - **Airdropper.sol**: Token distribution system for citizens
- **React Frontend with Routing**: Multi-page web interface with dedicated sections for citizens, officials, admin controls, airdrops, and welfare proposals
- **Comprehensive Test Suite**: Multiple test files covering all contract functionality

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

#### Participating in Public Welfare Proposals

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


## License

MIT

---

Built with Hardhat 3, React 19, Solidity 0.8.20, and OpenZeppelin Contracts 4.9.6
