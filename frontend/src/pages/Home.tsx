import { useState, useEffect, FormEvent } from "react";
import { Link } from "react-router-dom";
import { ethers, Contract } from "ethers";
import {
  SOULBOUND_CITIZEN_ID_ADDRESS,
  SOULBOUND_CITIZEN_ID_ABI,
  NATION_TOKEN_ADDRESS,
  NATION_TOKEN_ABI,
  ELECTION_ADDRESS,
  ELECTION_ABI,
} from "../config";
import { CopyableAddress } from "../components/CopyableAddress";
import "./Pages.css";

interface Position {
  name: string;
  active: boolean;
  exists: boolean;
}

interface Candidate {
  address: string;
  voteCount: number;
}

interface Winners {
  [key: number]: { address: string; voteCount: number };
}

declare global {
  interface Window {
    ethereum?: any;
  }
}

export function Home() {
  // Wallet & Contracts
  const [account, setAccount] = useState<string | null>(null);
  const [citizenIdContract, setCitizenIdContract] = useState<Contract | null>(
    null
  );
  const [nationTokenContract, setNationTokenContract] =
    useState<Contract | null>(null);
  const [electionContract, setElectionContract] = useState<Contract | null>(
    null
  );

  // User Status
  const [isCitizen, setIsCitizen] = useState<boolean>(false);
  const [tokenBalance, setTokenBalance] = useState<string>("0");
  const [isOwner, setIsOwner] = useState<boolean>(false);

  // Election Data
  const [positions, setPositions] = useState<{ [key: number]: Position }>({});
  const [candidatesByPosition, setCandidatesByPosition] = useState<{
    [key: number]: Candidate[];
  }>({});
  const [hasVotedByPosition, setHasVotedByPosition] = useState<{
    [key: number]: boolean;
  }>({});
  const [winners, setWinners] = useState<Winners>({});

  // UI State
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  // Form State
  const [candidateAddress, setCandidateAddress] = useState<string>("");
  const [selectedPositionForCandidate, setSelectedPositionForCandidate] =
    useState<number>(0);

  useEffect(() => {
    connectWallet();
  }, []);

  useEffect(() => {
    if (
      electionContract &&
      citizenIdContract &&
      nationTokenContract &&
      account
    ) {
      loadAllData();
    }
  }, [electionContract, citizenIdContract, nationTokenContract, account]);

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        setError("Please install MetaMask to use this dApp");
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();

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
      const electionContract = new ethers.Contract(
        ELECTION_ADDRESS,
        ELECTION_ABI,
        signer
      );

      setAccount(accounts[0]);
      setCitizenIdContract(citizenIdContract);
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

  const loadAllData = async () => {
    if (
      !citizenIdContract ||
      !nationTokenContract ||
      !electionContract ||
      !account
    )
      return;

    try {
      setLoading(true);

      // Check citizenship status
      // Normalize account address to lowercase for consistency
      const normalizedAccount = account.toLowerCase();
      const balance = await citizenIdContract.balanceOf(normalizedAccount);
      const hasCitizenship = balance > 0n || Number(balance) > 0;
      console.log("Citizenship check:", {
        account,
        normalizedAccount,
        balance: balance.toString(),
        hasCitizenship,
      });
      setIsCitizen(hasCitizenship);

      // Check token balance
      const tokenBal = await nationTokenContract.balanceOf(account);
      const decimalsValue = await nationTokenContract.decimals();
      // Ensure decimals is a number (ethers v6 may return bigint for uint8 in some cases)
      const decimals = Number(decimalsValue);
      setTokenBalance(ethers.formatUnits(tokenBal, decimals));

      // Check if user is owner
      const owner = await electionContract.owner();
      setIsOwner(owner.toLowerCase() === account.toLowerCase());

      // Load all positions (check IDs 0-50 to support any position ID)
      const positionsData: { [key: number]: Position } = {};
      const candidatesData: { [key: number]: Candidate[] } = {};
      const votedData: { [key: number]: boolean } = {};
      const winnersData: Winners = {};

      for (let positionId = 0; positionId < 50; positionId++) {
        try {
          const [name, active, exists] = await electionContract.positions(
            positionId
          );

          if (exists) {
            positionsData[positionId] = { name, active, exists };

            // Load candidates for this position
            const candidateAddresses = await electionContract.getCandidates(
              positionId
            );
            const candidates: Candidate[] = [];

            for (const candidateAddr of candidateAddresses) {
              const voteCount = await electionContract.votes(
                positionId,
                candidateAddr
              );
              candidates.push({
                address: candidateAddr,
                voteCount: Number(voteCount),
              });
            }

            candidatesData[positionId] = candidates;

            // Check if user has voted
            const voted = await electionContract.hasVoted(positionId, account);
            votedData[positionId] = voted;

            // Get winner if position is closed
            if (!active) {
              const [winner, voteCount] = await electionContract.currentWinner(
                positionId
              );
              if (winner !== ethers.ZeroAddress) {
                winnersData[positionId] = {
                  address: winner,
                  voteCount: Number(voteCount),
                };
              }
            }
          }
        } catch (err) {
          // Position doesn't exist, skip
          console.log(`Position ${positionId} doesn't exist`);
        }
      }

      setPositions(positionsData);
      setCandidatesByPosition(candidatesData);
      setHasVotedByPosition(votedData);
      setWinners(winnersData);

      setLoading(false);
    } catch (err: any) {
      console.error("Error loading data:", err);
      setError("Failed to load data: " + err.message);
      setLoading(false);
    }
  };

  // Citizenship Functions
  const handleIssueCitizenship = async () => {
    if (!citizenIdContract || !account) return;

    setError("");
    setSuccess("");

    try {
      setLoading(true);

      // Use self-service registration - no owner check needed
      const tx = await citizenIdContract.registerCitizen();
      await tx.wait();
      setSuccess("Citizenship registered successfully!");
      await loadAllData();
    } catch (err: any) {
      // Better error handling to show the actual revert reason
      const errorMessage = err.reason || err.message || "Transaction failed";
      setError("Failed to issue citizenship: " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Election Management Functions

  const handleAddCandidate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!electionContract) return;

    setError("");
    setSuccess("");

    try {
      setLoading(true);
      const tx = await electionContract.addCandidate(
        selectedPositionForCandidate,
        candidateAddress
      );
      await tx.wait();
      setSuccess("Candidate added successfully!");
      setCandidateAddress("");
      await loadAllData();
    } catch (err: any) {
      setError("Failed to add candidate: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (positionId: number, candidateAddr: string) => {
    if (!electionContract) return;

    setError("");
    setSuccess("");

    try {
      setLoading(true);
      const tx = await electionContract.vote(positionId, candidateAddr);
      await tx.wait();
      setSuccess("Vote cast successfully!");
      await loadAllData();
    } catch (err: any) {
      // Better error handling to show the actual revert reason
      const errorMessage = err.reason || err.message || "Transaction failed";
      setError("Voting failed: " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClosePosition = async (positionId: number) => {
    if (!electionContract) return;

    setError("");
    setSuccess("");

    try {
      setLoading(true);
      const tx = await electionContract.closePosition(positionId);
      await tx.wait();
      setSuccess("Position closed successfully!");
      await loadAllData();
    } catch (err: any) {
      setError("Failed to close position: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!account) {
    return (
      <div className="home-page">
        <div className="container">
          <section className="home-hero-card">
            <div className="home-hero-header">
              <div>
                <p className="eyebrow">Nation-scale governance on-chain</p>
                <h1 className="home-title">CountryDAO Election System</h1>
                <p className="home-subtitle">
                  Soulbound citizenship, deflationary token voting, and
                  transparent elections &mdash; all secured by Ethereum.
                </p>
              </div>
            </div>

            <div className="home-hero-body">
              <div className="home-hero-left">
                <div className="home-hero-highlight">
                  <span className="home-hero-badge">Step 1</span>
                  <span className="home-hero-highlight-text">
                    Connect your wallet to join the nation.
                  </span>
                </div>
                {error && <div className="error">{error}</div>}
              </div>
              <div className="home-hero-right">
                <button onClick={connectWallet} className="home-primary-cta">
                  Connect MetaMask
                </button>
                <p className="home-hero-footnote">
                  You&apos;ll be prompted by MetaMask to approve the connection.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="home-page">
      <div className="container">
        <section className="home-hero-card">
          <div className="home-hero-header">
            <div>
              <p className="eyebrow">Nation-scale governance on-chain</p>
              <h1 className="home-title">CountryDAO Election System</h1>
              <p className="home-subtitle">
                Soulbound Citizenship • Token Governance • Democratic Elections
              </p>
            </div>
            <div className="home-hero-pills">
              <span className="pill pill--accent">
                <span className="pill-dot" />
                Connected
              </span>
              {isCitizen ? (
                <span className="pill pill--success">Citizen</span>
              ) : (
                <span className="pill pill--muted">No citizenship</span>
              )}
              {isOwner && <span className="pill pill--outline">Admin</span>}
            </div>
          </div>

          <div className="home-hero-body">
            <div className="home-hero-left">
              <div className="home-wallet-card">
                <div className="home-wallet-row">
                  <span className="home-wallet-label">Connected wallet</span>
                  {account && (
                    <CopyableAddress
                      address={account}
                      className="address"
                      showFull={true}
                    />
                  )}
                </div>
                <div className="home-wallet-row home-wallet-grid">
                  <div>
                    <span className="home-wallet-label">Citizenship</span>
                    <span
                      className={`status-badge ${
                        isCitizen ? "active" : "inactive"
                      }`}
                    >
                      {isCitizen ? "✓ Citizen" : "✗ Not a Citizen"}
                    </span>
                  </div>
                  <div>
                    <span className="home-wallet-label">Balance</span>
                    <span className="status-badge">{tokenBalance} NAT</span>
                  </div>
                  {isOwner && (
                    <div>
                      <span className="home-wallet-label">Role</span>
                      <span className="status-badge active">Admin</span>
                    </div>
                  )}
                </div>
              </div>

              {error && <div className="error">{error}</div>}
              {success && <div className="success">{success}</div>}
            </div>

            <div className="home-hero-right">
              <div className="home-steps-card">
                <h2>Get started in three steps</h2>
                <ol className="home-steps">
                  <li>
                    <span className="home-step-index">1</span>
                    <div>
                      <p className="home-step-title">Register citizenship</p>
                      <p className="home-step-copy">
                        Mint a soulbound CitizenID NFT tied to your wallet.
                      </p>
                    </div>
                  </li>
                  <li>
                    <span className="home-step-index">2</span>
                    <div>
                      <p className="home-step-title">Receive NAT tokens</p>
                      <p className="home-step-copy">
                        Ask the treasury admin to airdrop NAT so you can vote.
                      </p>
                    </div>
                  </li>
                  <li>
                    <span className="home-step-index">3</span>
                    <div>
                      <p className="home-step-title">Vote in elections</p>
                      <p className="home-step-copy">
                        Spend 1 NAT per vote to elect officials and steer policy.
                      </p>
                    </div>
                  </li>
                </ol>
                <div className="home-quick-links">
                  <Link to="/citizens" className="home-link-cta">
                    Open Citizens page
                  </Link>
                  <Link to="/officials" className="home-link-secondary">
                    View current elections
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="home-grid">
          <section className="card home-card">
            <h2>Citizenship status</h2>
            {!isCitizen ? (
              <>
                <p>
                  You need citizenship to participate in elections. Register
                  yourself for a soulbound Citizen ID NFT.
                </p>
                <button
                  onClick={handleIssueCitizenship}
                  disabled={loading}
                  className="home-primary-cta"
                >
                  {loading ? "Registering..." : "Register as Citizen"}
                </button>
              </>
            ) : (
              <div className="info success-state">
                ✓ You are a citizen! You can now participate in elections (with
                tokens).
              </div>
            )}
          </section>

          <section className="card home-card">
            <h2>Admin actions</h2>
            {isOwner ? (
              <>
                <p>
                  As an admin, you can create positions, add candidates, and
                  manage roles from the Admin console.
                </p>
                <div className="home-admin-actions">
                  <Link to="/admin" className="home-link-cta">
                    Go to Admin console
                  </Link>
                  <Link to="/airdropper" className="home-link-secondary">
                    Open Airdropper
                  </Link>
                </div>
              </>
            ) : (
              <div className="info">
                You don&apos;t have admin permissions. Admins can create and
                close positions, add candidates, and manage NAT token roles.
              </div>
            )}
          </section>
        </div>

        {/* Step 3: Add Candidates */}
        {isOwner && Object.keys(positions).length > 0 && (
          <section className="card">
            <h2>Add Candidates</h2>
            <p>
              Add candidates to election positions. Candidates must be citizen
              addresses.
            </p>
            <form onSubmit={handleAddCandidate}>
              <div className="form-group">
                <label>Position</label>
                <select
                  value={selectedPositionForCandidate}
                  onChange={(e) =>
                    setSelectedPositionForCandidate(Number(e.target.value))
                  }
                >
                  {Object.entries(positions).map(([id, pos]) => (
                    <option key={id} value={id}>
                      {pos.name} {pos.active ? "(Active)" : "(Closed)"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Candidate Address</label>
                <input
                  type="text"
                  value={candidateAddress}
                  onChange={(e) => setCandidateAddress(e.target.value)}
                  placeholder="0x..."
                  required
                />
              </div>
              <button type="submit" disabled={loading}>
                {loading ? "Adding..." : "Add Candidate"}
              </button>
            </form>
          </section>
        )}

        <section className="home-elections">
          <div className="home-elections-header">
            <h2>Open elections</h2>
            <p className="home-elections-subtitle">
              Vote with NAT tokens for candidates in active positions. Each vote
              burns 1 NAT to prevent spam.
            </p>
          </div>

          {Object.entries(positions).map(([id, position]) => {
            const positionId = Number(id);
            const candidates = candidatesByPosition[positionId] || [];
            const hasVoted = hasVotedByPosition[positionId] || false;
            const winner = winners[positionId];
            const canVote =
              isCitizen &&
              Number(tokenBalance) > 0 &&
              position.active &&
              !hasVoted;

            return (
              <div key={id} className="card home-election-card">
                <div className="home-election-header">
                  <div>
                    <h3>{position.name}</h3>
                    <p className="home-election-meta">
                      Position ID #{positionId}
                    </p>
                  </div>
                  <div className="home-election-tags">
                    <span
                      className={`status-badge ${
                        position.active ? "active" : "inactive"
                      }`}
                    >
                      {position.active ? "Active" : "Closed"}
                    </span>
                    {hasVoted && <span className="status-badge">Voted</span>}
                  </div>
                </div>

                {!position.active && winner && (
                  <div className="info success-state home-election-winner">
                    Winner:&nbsp;
                    <CopyableAddress
                      address={winner.address}
                      showFull={true}
                    />{" "}
                    ({winner.voteCount} votes)
                  </div>
                )}

                {position.active && canVote && (
                  <div className="info">
                    You can vote in this election. Each vote costs 1 NAT.
                  </div>
                )}

                {position.active && !isCitizen && (
                  <div className="info info-warning">
                    You need citizenship to vote in this election.
                  </div>
                )}

                {position.active &&
                  isCitizen &&
                  Number(tokenBalance) === 0 && (
                    <div className="info info-warning">
                      You need NAT tokens to vote. Request an airdrop from an
                      admin.
                    </div>
                  )}

                <div className="candidate-list">
                  {candidates.length === 0 ? (
                    <div className="empty-state">No candidates yet</div>
                  ) : (
                    candidates.map((candidate, idx) => (
                      <div key={idx} className="candidate-item">
                        <div className="candidate-info">
                          <CopyableAddress
                            address={candidate.address}
                            className="candidate-address"
                            showFull={true}
                          />
                        </div>
                        <div className="vote-count">
                          {candidate.voteCount} votes
                        </div>
                        {!position.active &&
                          winner?.address === candidate.address && (
                            <div className="winner-badge">Winner</div>
                          )}
                        {canVote && (
                          <button
                            onClick={() =>
                              handleVote(positionId, candidate.address)
                            }
                            disabled={loading}
                          >
                            Vote
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {isOwner && position.active && (
                  <button
                    onClick={() => handleClosePosition(positionId)}
                    disabled={loading}
                    className="secondary"
                    style={{ marginTop: "15px" }}
                  >
                    Close Position
                  </button>
                )}
              </div>
            );
          })}

          {Object.keys(positions).length === 0 && !isOwner && (
            <div className="card home-election-card">
              <div className="empty-state">
                No election positions created yet. Please check back later.
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
