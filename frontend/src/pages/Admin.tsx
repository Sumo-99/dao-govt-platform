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

    const confirmed = window.confirm(
      `Grant MINTER_ROLE to ${grantAddress}? This allows the address to mint new NAT tokens.`
    );
    if (!confirmed) return;

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

    const confirmed = window.confirm(
      `Revoke MINTER_ROLE from ${revokeAddress}? They will no longer be able to mint NAT.`
    );
    if (!confirmed) return;

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

    const confirmed = window.confirm(
      "Grant MINTER_ROLE to the Airdropper contract? This allows it to mint NAT when distributing tokens."
    );
    if (!confirmed) return;

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

    const recipient = recipientAddress || account;
    const confirmed = window.confirm(
      `Mint ${tokenAmount} NAT to ${recipient}? This will increase the circulating supply.`
    );
    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      setLoading(true);
      // Don't convert to wei - the contract's mintTo expects whole tokens
      // and multiplies by 10^18 internally
      const amount = BigInt(tokenAmount);

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

    const confirmed = window.confirm(
      `Create a new election position named "${newPositionName}"?`
    );
    if (!confirmed) return;

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
          <h1>Admin Control Center</h1>
          <p className="subtitle">
            Manage roles, positions, and treasury for CountryDAO
          </p>
        </div>
        <section className="card citizens-hero-card">
          <div className="citizens-hero-content">
            <p className="eyebrow">Restricted area</p>
            <h2>Connect an admin wallet to continue</h2>
            <p className="citizens-hero-subtitle">
              Only wallets with DEFAULT_ADMIN_ROLE on NationToken can access
              these controls.
            </p>
          </div>
          <div className="citizens-hero-status">
            <div className="info">
              Please connect your wallet from the navigation bar to check your
              admin status.
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (loading && !isAdmin) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>Admin Control Center</h1>
          <p className="subtitle">
            Manage roles, positions, and treasury for CountryDAO
          </p>
        </div>
        <section className="card citizens-hero-card">
          <div className="citizens-hero-content">
            <p className="eyebrow">Checking access</p>
            <h2>Verifying admin permissions…</h2>
            <p className="citizens-hero-subtitle">
              Reading your DEFAULT_ADMIN_ROLE status from the NationToken
              contract.
            </p>
          </div>
        </section>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>Admin Control Center</h1>
          <p className="subtitle">
            Manage roles, positions, and treasury for CountryDAO
          </p>
        </div>
        <section className="card citizens-hero-card">
          <div className="citizens-hero-content">
            <p className="eyebrow">Access denied</p>
            <h2>You do not have admin rights</h2>
            <p className="citizens-hero-subtitle">
              Only addresses with DEFAULT_ADMIN_ROLE on the NationToken contract
              can access these controls.
            </p>
          </div>
          <div className="citizens-hero-status">
            <div className="error">
              ⛔ Access Denied: You need DEFAULT_ADMIN_ROLE to access this page.
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Admin Control Center</h1>
        <p className="subtitle">
          Mint NAT, manage roles, and configure elections for CountryDAO
        </p>
      </div>

      {(error || success) && (
        <div className="admin-alert-row">
          {error && <div className="error">{error}</div>}
          {success && <div className="success">{success}</div>}
        </div>
      )}

      <section className="admin-layout">
        <div className="admin-column">
          {/* Token Distribution */}
          <div className="card admin-card">
            <div className="admin-section-header">
              <div>
                <h2>Token distribution</h2>
                <p>
                  Mint NAT to a recipient address. Amounts are in whole tokens
                  (no decimals).
                </p>
              </div>
              <span className="badge badge--accent">Treasury</span>
            </div>

            <form onSubmit={handleIssueTokens}>
              <div className="form-group">
                <label>Recipient address</label>
                <input
                  type="text"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  placeholder="0x... (leave empty to mint to yourself)"
                />
              </div>
              <div className="form-group">
                <label>Token amount (NAT)</label>
                <input
                  type="number"
                  value={tokenAmount}
                  onChange={(e) => setTokenAmount(e.target.value)}
                  placeholder="100"
                  min="1"
                  required
                />
              </div>
              <button type="submit" disabled={loading}>
                {loading ? "Issuing..." : "Mint tokens"}
              </button>
            </form>
          </div>

          {/* Create Election Position */}
          <div className="card admin-card">
            <div className="admin-section-header">
              <div>
                <h2>Create election position</h2>
                <p>
                  Define a new seat in government (e.g., President, Minister of
                  Finance).
                </p>
              </div>
              <span className="badge badge--muted">Elections</span>
            </div>

            <form onSubmit={handleCreatePosition}>
              <div className="form-group">
                <label>Position name</label>
                <input
                  type="text"
                  value={newPositionName}
                  onChange={(e) => setNewPositionName(e.target.value)}
                  placeholder="President"
                  required
                />
              </div>
              <button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create position"}
              </button>
            </form>

            <div className="info" style={{ marginTop: "12px" }}>
              After creating a position, use the Officials / Home pages to add
              candidates and manage voting.
            </div>
          </div>
        </div>

        <div className="admin-column">
          {/* Quick Actions */}
          <div className="card admin-card">
            <div className="admin-section-header">
              <div>
                <h2>Quick actions</h2>
                <p>Frequently used administrative operations.</p>
              </div>
              <span className="badge badge--accent">Shortcuts</span>
            </div>

            <button
              onClick={quickGrantToAirdropper}
              disabled={loading}
              style={{ width: "100%", marginBottom: "12px" }}
            >
              {loading
                ? "Processing..."
                : "Grant MINTER_ROLE to Airdropper contract"}
            </button>
            <div className="info" style={{ fontSize: "13px" }}>
              This allows the Airdropper to mint NAT when distributing tokens to
              citizens.
            </div>
          </div>

          {/* Current MINTER_ROLE Holders */}
          <div className="card admin-card">
            <div className="admin-section-header">
              <div>
                <h2>MINTER_ROLE status</h2>
                <p>Addresses that can mint new Nation Tokens (NAT).</p>
              </div>
              <span className="badge badge--outline">Roles</span>
            </div>

            <div className="list-container" style={{ marginTop: "12px" }}>
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
                      <span className="badge badge--success">Has role</span>
                    ) : (
                      <span className="badge badge--danger">No role</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Grant MINTER_ROLE */}
          <div className="card admin-card">
            <div className="admin-section-header">
              <div>
                <h2>Grant MINTER_ROLE</h2>
                <p>Give an address permission to mint new NAT tokens.</p>
              </div>
              <span className="badge badge--outline">Roles</span>
            </div>

            <form onSubmit={handleGrantMinterRole}>
              <div className="form-group">
                <label>Address to grant role</label>
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
          <div className="card admin-card">
            <div className="admin-section-header">
              <div>
                <h2>Revoke MINTER_ROLE</h2>
                <p>Remove minting permission from an address.</p>
              </div>
              <span className="badge badge--danger">Destructive</span>
            </div>

            <form onSubmit={handleRevokeMinterRole}>
              <div className="form-group">
                <label>Address to revoke role</label>
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
        </div>
      </section>

      {/* Info Section */}
      <div className="card admin-card">
        <div className="admin-section-header">
          <div>
            <h2>About roles</h2>
          </div>
          <span className="badge badge--outline">Reference</span>
        </div>
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
            <strong>⚠️ Security note:</strong> Only grant MINTER_ROLE to trusted
            addresses or contracts. Malicious minters could inflate the token
            supply.
          </div>
        </div>
      </div>
    </div>
  );
}
