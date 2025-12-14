import { useState, useEffect, FormEvent } from "react";
import { ethers, Contract } from "ethers";
import {
  NATION_TOKEN_ADDRESS,
  NATION_TOKEN_ABI,
  ELECTION_ADDRESS,
  ELECTION_ABI,
  AIRDROPPER_ADDRESS,
  SOULBOUND_CITIZEN_ID_ADDRESS,
} from "../config";
import { CopyableAddress } from "../components/CopyableAddress";
import "./Pages.css";

declare global {
  interface Window {
    ethereum?: any;
  }
}

interface RoleHolder {
  address: string;
  hasRole: boolean;
}

export function Admin() {
  // Wallet & Contracts
  const [account, setAccount] = useState<string | null>(null);
  const [nationTokenContract, setNationTokenContract] =
    useState<Contract | null>(null);
  const [electionContract, setElectionContract] = useState<Contract | null>(
    null
  );

  // User Status
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // Role Data
  const [minterRoleHash, setMinterRoleHash] = useState<string>("");
  const [adminRoleHash, setAdminRoleHash] = useState<string>("");
  const [minterHolders, setMinterHolders] = useState<RoleHolder[]>([]);

  // UI State
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  // Form State - Role Management
  const [grantAddress, setGrantAddress] = useState<string>("");
  const [revokeAddress, setRevokeAddress] = useState<string>("");

  // Form State - Token Distribution
  const [tokenAmount, setTokenAmount] = useState<string>("100");
  const [recipientAddress, setRecipientAddress] = useState<string>("");

  // Form State - Election Position
  const [newPositionName, setNewPositionName] = useState<string>("");

  useEffect(() => {
    connectWallet();
  }, []);

  useEffect(() => {
    if (nationTokenContract && electionContract && account) {
      loadAdminData();
    }
  }, [nationTokenContract, electionContract, account]);

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        setError("Please install MetaMask to use this dApp");
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();

      const nationTokenContract = new ethers.Contract(
        NATION_TOKEN_ADDRESS,
        NATION_TOKEN_ABI,
        signer
      );
      const electionContract = new ethers.Contract(
        ELECTION_ADDRESS,
        ELECTION_ABI,
        signer
      );

      setAccount(accounts[0]);
      setNationTokenContract(nationTokenContract);
      setElectionContract(electionContract);

      window.ethereum.on("accountsChanged", (accounts: string[]) => {
        setAccount(accounts[0]);
        window.location.reload();
      });
    } catch (err: any) {
      setError("Failed to connect wallet: " + err.message);
    }
  };

  const loadAdminData = async () => {
    if (!nationTokenContract || !account) return;

    try {
      setLoading(true);

      // Get role hashes
      const minterRole = await nationTokenContract.MINTER_ROLE();
      const adminRole = await nationTokenContract.DEFAULT_ADMIN_ROLE();
      setMinterRoleHash(minterRole);
      setAdminRoleHash(adminRole);

      // Check if current user is admin
      const hasAdminRole = await nationTokenContract.hasRole(
        adminRole,
        account
      );
      setIsAdmin(hasAdminRole);

      // Check known addresses for MINTER_ROLE
      const knownAddresses = [
        { address: account, label: "You" },
        { address: AIRDROPPER_ADDRESS, label: "Airdropper" },
        { address: SOULBOUND_CITIZEN_ID_ADDRESS, label: "CitizenID" },
        { address: ELECTION_ADDRESS, label: "Election" },
      ];

      const holders: RoleHolder[] = [];
      for (const addr of knownAddresses) {
        const hasMinterRole = await nationTokenContract.hasRole(
          minterRole,
          addr.address
        );
        holders.push({
          address: addr.address,
          hasRole: hasMinterRole,
        });
      }
      setMinterHolders(holders);

      setLoading(false);
    } catch (err: any) {
      console.error("Error loading admin data:", err);
      setError("Failed to load admin data: " + err.message);
      setLoading(false);
    }
  };

  const handleGrantMinterRole = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!nationTokenContract || !minterRoleHash) return;

    setError("");
    setSuccess("");

    try {
      setLoading(true);
      const tx = await nationTokenContract.grantRole(
        minterRoleHash,
        grantAddress
      );
      await tx.wait();
      setSuccess(`MINTER_ROLE granted to ${grantAddress}`);
      setGrantAddress("");
      await loadAdminData();
    } catch (err: any) {
      setError("Failed to grant role: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeMinterRole = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!nationTokenContract || !minterRoleHash) return;

    setError("");
    setSuccess("");

    try {
      setLoading(true);
      const tx = await nationTokenContract.revokeRole(
        minterRoleHash,
        revokeAddress
      );
      await tx.wait();
      setSuccess(`MINTER_ROLE revoked from ${revokeAddress}`);
      setRevokeAddress("");
      await loadAdminData();
    } catch (err: any) {
      setError("Failed to revoke role: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const quickGrantToAirdropper = async () => {
    if (!nationTokenContract || !minterRoleHash) return;

    setError("");
    setSuccess("");

    try {
      setLoading(true);
      const tx = await nationTokenContract.grantRole(
        minterRoleHash,
        AIRDROPPER_ADDRESS
      );
      await tx.wait();
      setSuccess(`MINTER_ROLE granted to Airdropper contract!`);
      await loadAdminData();
    } catch (err: any) {
      setError("Failed to grant role: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleIssueTokens = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!nationTokenContract) return;

    setError("");
    setSuccess("");

    try {
      setLoading(true);
      // Don't convert to wei - the contract's mintTo expects whole tokens
      // and multiplies by 10^18 internally
      const amount = BigInt(tokenAmount);
      const recipient = recipientAddress || account;

      const tx = await nationTokenContract.mintTo(recipient, amount);
      await tx.wait();
      setSuccess(`Issued ${tokenAmount} tokens to ${recipient}!`);
      setTokenAmount("100");
      setRecipientAddress("");
    } catch (err: any) {
      setError("Failed to issue tokens: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePosition = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!electionContract) return;

    setError("");
    setSuccess("");

    try {
      setLoading(true);
      const tx = await electionContract.createPosition(newPositionName, []);
      const receipt = await tx.wait();

      // Get the returned positionId from the transaction receipt/logs
      if (receipt && receipt.logs) {
        const event = receipt.logs.find((log: any) => {
          try {
            const parsed = electionContract.interface.parseLog(log);
            return parsed && parsed.name === "PositionCreated";
          } catch {
            return false;
          }
        });

        if (event) {
          const parsed = electionContract.interface.parseLog(event);
          const positionId = parsed?.args.positionId;
          setSuccess(
            `Position "${newPositionName}" created with ID ${positionId.toString()}!`
          );
        } else {
          setSuccess(`Position "${newPositionName}" created successfully!`);
        }
      } else {
        setSuccess(`Position "${newPositionName}" created successfully!`);
      }

      setNewPositionName("");
    } catch (err: any) {
      const errorMessage = err.reason || err.message || "Transaction failed";
      setError("Failed to create position: " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!account) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>Admin Panel</h1>
          <p className="subtitle">Manage roles and permissions</p>
        </div>
        <div className="card">
          <div className="info">
            Please connect your wallet to access admin panel
          </div>
        </div>
      </div>
    );
  }

  if (loading && !isAdmin) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>Admin Panel</h1>
          <p className="subtitle">Manage roles and permissions</p>
        </div>
        <div className="card">
          <div className="info">Loading...</div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>Admin Panel</h1>
          <p className="subtitle">Manage roles and permissions</p>
        </div>
        <div className="card">
          <div className="error">
            ⛔ Access Denied: You need DEFAULT_ADMIN_ROLE to access this page.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>🔐 Admin Panel</h1>
        <p className="subtitle">
          Manage roles and permissions for the Nation DAO
        </p>
      </div>

      {error && (
        <div className="card">
          <div className="error">{error}</div>
        </div>
      )}
      {success && (
        <div className="card">
          <div className="success">{success}</div>
        </div>
      )}

      {/* Token Distribution */}
      <div className="card">
        <h2>💰 Token Distribution</h2>
        <p>
          Issue Nation Tokens (NAT) to citizens. Tokens are required for voting.
        </p>

        <form onSubmit={handleIssueTokens} style={{ marginTop: "20px" }}>
          <div className="form-group">
            <label>Recipient Address (leave empty for self)</label>
            <input
              type="text"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              placeholder="0x... or leave empty"
            />
          </div>
          <div className="form-group">
            <label>Token Amount</label>
            <input
              type="number"
              value={tokenAmount}
              onChange={(e) => setTokenAmount(e.target.value)}
              placeholder="100"
              required
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? "Issuing..." : "Issue Tokens"}
          </button>
        </form>
      </div>

      {/* Create Election Position */}
      <div className="card">
        <h2>🗳️ Create Election Position</h2>
        <p>Create a new position for elections (e.g., President, Minister).</p>

        <form onSubmit={handleCreatePosition} style={{ marginTop: "20px" }}>
          <div className="form-group">
            <label>Position Name</label>
            <input
              type="text"
              value={newPositionName}
              onChange={(e) => setNewPositionName(e.target.value)}
              placeholder="President"
              required
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Position"}
          </button>
        </form>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2>⚡ Quick Actions</h2>
        <p>Common administrative tasks</p>

        <div style={{ marginTop: "20px" }}>
          <button
            onClick={quickGrantToAirdropper}
            disabled={loading}
            style={{ width: "100%", marginBottom: "12px" }}
          >
            {loading
              ? "Processing..."
              : "Grant MINTER_ROLE to Airdropper Contract"}
          </button>
          <div className="info" style={{ fontSize: "13px" }}>
            This allows the Airdropper to mint new tokens when distributing to
            citizens.
          </div>
        </div>
      </div>

      {/* Current MINTER_ROLE Holders */}
      <div className="card">
        <h2>👥 MINTER_ROLE Status</h2>
        <p>Addresses that can mint new tokens</p>

        <div className="list-container" style={{ marginTop: "20px" }}>
          {minterHolders.map((holder, index) => (
            <div key={holder.address} className="list-item">
              <div className="list-item-header">
                <span className="list-item-number">#{index + 1}</span>
                <CopyableAddress
                  address={holder.address}
                  className="list-item-address"
                  showFull={true}
                />
              </div>
              <div className="list-item-info">
                {holder.hasRole ? (
                  <span
                    className="token-balance"
                    style={{
                      backgroundColor: "#dcfce7",
                      color: "#166534",
                      borderColor: "#10b981",
                    }}
                  >
                    ✓ Has Role
                  </span>
                ) : (
                  <span
                    className="token-balance"
                    style={{
                      backgroundColor: "#fee2e2",
                      color: "#991b1b",
                      borderColor: "#ef4444",
                    }}
                  >
                    ✗ No Role
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Grant MINTER_ROLE */}
      <div className="card">
        <h2>➕ Grant MINTER_ROLE</h2>
        <p>Give an address permission to mint new tokens</p>

        <form onSubmit={handleGrantMinterRole} style={{ marginTop: "20px" }}>
          <div className="form-group">
            <label>Address to Grant Role</label>
            <input
              type="text"
              value={grantAddress}
              onChange={(e) => setGrantAddress(e.target.value)}
              placeholder="0x..."
              required
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? "Granting..." : "Grant MINTER_ROLE"}
          </button>
        </form>
      </div>

      {/* Revoke MINTER_ROLE */}
      <div className="card">
        <h2>➖ Revoke MINTER_ROLE</h2>
        <p>Remove minting permission from an address</p>

        <form onSubmit={handleRevokeMinterRole} style={{ marginTop: "20px" }}>
          <div className="form-group">
            <label>Address to Revoke Role</label>
            <input
              type="text"
              value={revokeAddress}
              onChange={(e) => setRevokeAddress(e.target.value)}
              placeholder="0x..."
              required
            />
          </div>
          <button type="submit" disabled={loading} className="secondary">
            {loading ? "Revoking..." : "Revoke MINTER_ROLE"}
          </button>
        </form>
      </div>

      {/* Info Section */}
      <div className="card">
        <h2>ℹ️ About Roles</h2>
        <div style={{ lineHeight: "1.8" }}>
          <h3>MINTER_ROLE</h3>
          <p>
            Addresses with MINTER_ROLE can create new Nation Tokens (NAT) by
            calling the <code>mintTo()</code> function. This is useful for:
          </p>
          <ul style={{ marginLeft: "20px", marginTop: "10px" }}>
            <li>Airdropper contract distributing tokens to citizens</li>
            <li>Treasury management for funding public projects</li>
            <li>Rewards and incentive programs</li>
          </ul>

          <h3 style={{ marginTop: "24px" }}>DEFAULT_ADMIN_ROLE</h3>
          <p>
            The admin role (which you have) can grant and revoke other roles.
            This is the highest level of permission in the system.
          </p>

          <div className="info" style={{ marginTop: "20px" }}>
            <strong>⚠️ Security Note:</strong> Only grant MINTER_ROLE to trusted
            addresses or contracts. Malicious minters could inflate the token
            supply.
          </div>
        </div>
      </div>
    </div>
  );
}
