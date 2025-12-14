# MetaMask Setup Guide

## 1. Add Hardhat Local Network

- **Network Name**: `Hardhat Local`
- **RPC URL**: `http://127.0.0.1:8545`
- **Chain ID**: `31337`
- **Currency Symbol**: `ETH`

## 2. Test Account Private Keys

When you run `npm run node`, you'll see test accounts with private keys. Use these to import accounts:

```
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

Account #1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (10000 ETH)
Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
```

## 3. Add NationToken (NAT) to MetaMask

- **Token Contract Address**: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- **Token Symbol**: `NAT`
- **Decimals**: `18`

## 4. Contract Addresses (Current Deployment)

- **SoulboundCitizenID**: `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`
- **NationToken (NAT)**: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- **Election**: `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0`

## Steps to Connect:

1. **Start Hardhat node**:

   ```bash
   npm run node
   ```

2. **Open MetaMask** and switch to "Hardhat Local" network

3. **Import a test account** using one of the private keys shown in the Hardhat output

4. **Visit your frontend** at `http://localhost:5173`

5. **Click "Connect Wallet"** in your frontend - MetaMask will prompt you to connect

6. **Approve the connection** - Your account will now be connected to the dApp!

## Troubleshooting

- **No ETH**: Make sure you're on the Hardhat Local network and imported an account from the Hardhat output
- **Can't see NAT tokens**: Add the token manually using the contract address above
- **Connection refused**: Make sure Hardhat node is running on port 8545
