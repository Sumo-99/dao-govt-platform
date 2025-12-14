import { useState, useEffect, FormEvent } from "react";
import { ethers, Contract } from "ethers";
import {
  PUBLIC_WELFARE_ADDRESS,
  PUBLIC_WELFARE_ABI,
  SOULBOUND_CITIZEN_ID_ADDRESS,
  SOULBOUND_CITIZEN_ID_ABI,
  NATION_TOKEN_ADDRESS,
  NATION_TOKEN_ABI,
} from "../config";
import { CopyableAddress } from "../components/CopyableAddress";
import "./Pages.css";

interface Proposal {
  title: string;
  details: string;
  active: boolean;
  exists: boolean;
  forVotes: number;
  againstVotes: number;
}

declare global {
  interface Window {
    ethereum?: any;
  }
}

export function PublicWelfareBoard() {
  // Wallet & Contracts
  const [account, setAccount] = useState<string | null>(null);
  const [welfareContract, setWelfareContract] = useState<Contract | null>(null);
  const [citizenIdContract, setCitizenIdContract] = useState<Contract | null>(
    null
  );
  const [nationTokenContract, setNationTokenContract] =
    useState<Contract | null>(null);

  // User Status
  const [isCitizen, setIsCitizen] = useState<boolean>(false);
  const [tokenBalance, setTokenBalance] = useState<string>("0");
  const [isOwner, setIsOwner] = useState<boolean>(false);

  // Proposal Data
  const [proposals, setProposals] = useState<{ [key: number]: Proposal }>({});
  const [hasVotedByProposal, setHasVotedByProposal] = useState<{
    [key: number]: boolean;
  }>({});

  // UI State
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  // Form State
  const [newProposalTitle, setNewProposalTitle] = useState<string>("");
  const [newProposalDetails, setNewProposalDetails] = useState<string>("");

  useEffect(() => {
    connectWallet();
  }, []);

  useEffect(() => {
    if (
      welfareContract &&
      citizenIdContract &&
      nationTokenContract &&
      account
    ) {
      loadAllData();
    }
  }, [welfareContract, citizenIdContract, nationTokenContract, account]);

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        setError("Please install MetaMask to use this dApp");
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();

      const welfareContract = new ethers.Contract(
        PUBLIC_WELFARE_ADDRESS,
        PUBLIC_WELFARE_ABI,
        signer
      );
      const citizenIdContract = new ethers.Contract(
        SOULBOUND_CITIZEN_ID_ADDRESS,
        SOULBOUND_CITIZEN_ID_ABI,
        signer
      );
      const nationTokenContract = new ethers.Contract(
        NATION_TOKEN_ADDRESS,
        NATION_TOKEN_ABI,
        signer
      );

      setAccount(accounts[0]);
      setWelfareContract(welfareContract);
      setCitizenIdContract(citizenIdContract);
      setNationTokenContract(nationTokenContract);

      window.ethereum.on("accountsChanged", (accounts: string[]) => {
        setAccount(accounts[0]);
        window.location.reload();
      });
    } catch (err: any) {
      setError("Failed to connect wallet: " + err.message);
    }
  };

  const loadAllData = async () => {
    if (
      !welfareContract ||
      !citizenIdContract ||
      !nationTokenContract ||
      !account
    )
      return;

    try {
      setLoading(true);

      // Check citizenship status
      const balance = await citizenIdContract.balanceOf(account.toLowerCase());
      const hasCitizenship = balance > 0n || Number(balance) > 0;
      setIsCitizen(hasCitizenship);

      if (!hasCitizenship) {
        setError(
          "You must be a citizen to view this page. Please register on the Main App page."
        );
        setLoading(false);
        return;
      }

      // Check token balance
      const tokenBal = await nationTokenContract.balanceOf(account);
      const decimals = await nationTokenContract.decimals();
      setTokenBalance(ethers.formatUnits(tokenBal, Number(decimals)));

      // Check if user is owner
      const owner = await welfareContract.owner();
      setIsOwner(owner.toLowerCase() === account.toLowerCase());

      // Load all proposals
      const nextId = await welfareContract.nextProposalId();
      const proposalsData: { [key: number]: Proposal } = {};
      const votedData: { [key: number]: boolean } = {};

      for (let proposalId = 0; proposalId < Number(nextId); proposalId++) {
        try {
          const [title, details, active, exists, forVotes, againstVotes] =
            await welfareContract.proposals(proposalId);

          if (exists) {
            proposalsData[proposalId] = {
              title,
              details,
              active,
              exists,
              forVotes: Number(forVotes),
              againstVotes: Number(againstVotes),
            };

            // Check if user has voted
            const voted = await welfareContract.hasVoted(proposalId, account);
            votedData[proposalId] = voted;
          }
        } catch (err) {
          console.log(`Proposal ${proposalId} doesn't exist`);
        }
      }

      setProposals(proposalsData);
      setHasVotedByProposal(votedData);

      setLoading(false);
    } catch (err: any) {
      console.error("Error loading data:", err);
      setError("Failed to load data: " + err.message);
      setLoading(false);
    }
  };

  const handleCreateProposal = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!welfareContract) return;

    setError("");
    setSuccess("");

    try {
      setLoading(true);
      const tx = await welfareContract.createProposal(
        newProposalTitle,
        newProposalDetails
      );
      await tx.wait();

      setSuccess(`Proposal "${newProposalTitle}" created successfully!`);
      setNewProposalTitle("");
      setNewProposalDetails("");
      await loadAllData();
    } catch (err: any) {
      const errorMessage = err.reason || err.message || "Transaction failed";
      setError("Failed to create proposal: " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenProposal = async (proposalId: number) => {
    if (!welfareContract) return;

    setError("");
    setSuccess("");

    try {
      setLoading(true);
      const tx = await welfareContract.openProposal(proposalId);
      await tx.wait();
      setSuccess("Proposal opened successfully!");
      await loadAllData();
    } catch (err: any) {
      const errorMessage = err.reason || err.message || "Transaction failed";
      setError("Failed to open proposal: " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseProposal = async (proposalId: number) => {
    if (!welfareContract) return;

    setError("");
    setSuccess("");

    try {
      setLoading(true);
      const tx = await welfareContract.closeProposal(proposalId);
      await tx.wait();
      setSuccess("Proposal closed successfully!");
      await loadAllData();
    } catch (err: any) {
      const errorMessage = err.reason || err.message || "Transaction failed";
      setError("Failed to close proposal: " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (proposalId: number, support: boolean) => {
    if (!welfareContract) return;

    setError("");
    setSuccess("");

    try {
      setLoading(true);
      const tx = await welfareContract.vote(proposalId, support);
      await tx.wait();
      setSuccess(
        `Vote cast successfully! You voted ${support ? "FOR" : "AGAINST"}`
      );
      await loadAllData();
    } catch (err: any) {
      const errorMessage = err.reason || err.message || "Transaction failed";
      setError("Voting failed: " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!account) {
    return (
      <div style={{ padding: "20px" }}>
        <div className="container">
          <div className="card">
            <h1>Public Welfare Board</h1>
            <p className="subtitle">
              Connect your wallet to participate in welfare proposals
            </p>
            {error && <div className="error">{error}</div>}
            <button onClick={connectWallet} style={{ marginTop: "20px" }}>
              Connect MetaMask
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <div className="container">
        <header>
          <h1>Public Welfare Board</h1>
          <p className="subtitle">
            Community Proposals • Token-Based Voting • Public Welfare
            Initiatives
          </p>

          <div className="wallet-section">
            <div className="wallet-info">
              {account && (
                <CopyableAddress
                  address={account}
                  className="address"
                  showFull={true}
                />
              )}
              <span
                className={`status-badge ${isCitizen ? "active" : "inactive"}`}
              >
                {isCitizen ? "✓ Citizen" : "✗ Not a Citizen"}
              </span>
              <span className="status-badge">{tokenBalance} NAT</span>
              {isOwner && <span className="status-badge active">Admin</span>}
            </div>
          </div>
        </header>

        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        {/* Info Card */}
        <div className="card">
          <h2>How It Works</h2>
          <ul style={{ marginLeft: "20px" }}>
            <li>Admins create and manage welfare proposals</li>
            <li>Citizens with at least 1 NAT token can vote</li>
            <li>Voting costs 1 NAT token (burned upon voting)</li>
            <li>Each citizen can vote once per proposal (FOR or AGAINST)</li>
          </ul>
        </div>

        {/* Admin: Create Proposal */}
        {isOwner && (
          <div className="card">
            <h2>Create Welfare Proposal</h2>
            <form onSubmit={handleCreateProposal}>
              <div className="form-group">
                <label>Proposal Title</label>
                <input
                  type="text"
                  value={newProposalTitle}
                  onChange={(e) => setNewProposalTitle(e.target.value)}
                  placeholder="Universal Basic Income Initiative"
                  required
                />
              </div>
              <div className="form-group">
                <label>Proposal Details</label>
                <textarea
                  value={newProposalDetails}
                  onChange={(e) => setNewProposalDetails(e.target.value)}
                  placeholder="Describe the welfare proposal in detail..."
                  rows={4}
                  required
                />
              </div>
              <button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Proposal"}
              </button>
            </form>
          </div>
        )}

        {/* Proposals List */}
        {Object.entries(proposals).map(([id, proposal]) => {
          const proposalId = Number(id);
          const hasVoted = hasVotedByProposal[proposalId] || false;
          const canVote =
            isCitizen &&
            Number(tokenBalance) >= 1 &&
            proposal.active &&
            !hasVoted;
          const totalVotes = proposal.forVotes + proposal.againstVotes;
          const forPercentage =
            totalVotes > 0 ? (proposal.forVotes / totalVotes) * 100 : 0;
          const againstPercentage =
            totalVotes > 0 ? (proposal.againstVotes / totalVotes) * 100 : 0;

          return (
            <div key={id} className="card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "10px",
                }}
              >
                <h2>{proposal.title}</h2>
                <div>
                  <span
                    className={`status-badge ${
                      proposal.active ? "active" : "inactive"
                    }`}
                  >
                    {proposal.active ? "Active" : "Closed"}
                  </span>
                  {hasVoted && <span className="status-badge">Voted</span>}
                </div>
              </div>

              <p style={{ marginBottom: "15px", color: "#666" }}>
                {proposal.details}
              </p>

              {/* Vote Tally */}
              <div style={{ marginBottom: "15px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "5px",
                  }}
                >
                  <span style={{ color: "#28a745", fontWeight: "bold" }}>
                    FOR: {proposal.forVotes} ({forPercentage.toFixed(1)}%)
                  </span>
                  <span style={{ color: "#dc3545", fontWeight: "bold" }}>
                    AGAINST: {proposal.againstVotes} (
                    {againstPercentage.toFixed(1)}%)
                  </span>
                </div>
                <div
                  style={{
                    width: "100%",
                    height: "20px",
                    backgroundColor: "#e9ecef",
                    borderRadius: "4px",
                    overflow: "hidden",
                    display: "flex",
                  }}
                >
                  <div
                    style={{
                      width: `${forPercentage}%`,
                      backgroundColor: "#28a745",
                    }}
                  />
                  <div
                    style={{
                      width: `${againstPercentage}%`,
                      backgroundColor: "#dc3545",
                    }}
                  />
                </div>
                <div
                  style={{ marginTop: "5px", fontSize: "14px", color: "#666" }}
                >
                  Total Votes: {totalVotes}
                </div>
              </div>

              {/* Voting Buttons */}
              {canVote && (
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={() => handleVote(proposalId, true)}
                    disabled={loading}
                    style={{ backgroundColor: "#28a745" }}
                  >
                    Vote FOR
                  </button>
                  <button
                    onClick={() => handleVote(proposalId, false)}
                    disabled={loading}
                    style={{ backgroundColor: "#dc3545" }}
                  >
                    Vote AGAINST
                  </button>
                </div>
              )}

              {/* Vote Warnings */}
              {proposal.active && !isCitizen && (
                <div
                  className="info"
                  style={{
                    backgroundColor: "#fff3cd",
                    borderColor: "#ffc107",
                    color: "#856404",
                  }}
                >
                  You need citizenship to vote
                </div>
              )}

              {proposal.active && isCitizen && Number(tokenBalance) < 1 && (
                <div
                  className="info"
                  style={{
                    backgroundColor: "#fff3cd",
                    borderColor: "#ffc107",
                    color: "#856404",
                  }}
                >
                  You need at least 1 NAT token to vote (voting costs 1 NAT)
                </div>
              )}

              {proposal.active && hasVoted && (
                <div className="info success-state">
                  ✓ You have already voted on this proposal
                </div>
              )}

              {/* Admin Controls */}
              {isOwner && (
                <div
                  style={{ marginTop: "15px", display: "flex", gap: "10px" }}
                >
                  {!proposal.active ? (
                    <button
                      onClick={() => handleOpenProposal(proposalId)}
                      disabled={loading}
                      className="secondary"
                    >
                      Open Proposal
                    </button>
                  ) : (
                    <button
                      onClick={() => handleCloseProposal(proposalId)}
                      disabled={loading}
                      className="secondary"
                    >
                      Close Proposal
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {Object.keys(proposals).length === 0 && (
          <div className="card">
            <div className="empty-state">
              No welfare proposals created yet.
              {isOwner && " Create one above to get started!"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
