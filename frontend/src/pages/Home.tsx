import { useState, useEffect, FormEvent } from "react";
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
import "../App.css";

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
      <div style={{ padding: "20px" }}>
        <div className="container">
          <div className="card">
            <h1>Country DAO Election System</h1>
            <p className="subtitle">
              Connect your wallet to participate in decentralized elections
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
          <h1>Country DAO Election System</h1>
          <p className="subtitle">
            Soulbound Citizenship • Token Governance • Democratic Elections
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

        <div className="main-content">
          {/* Step 1: Citizenship Issuance */}
          <div className="card">
            <h2>Step 1: Citizenship</h2>
            {!isCitizen ? (
              <>
                <p>
                  You need citizenship to participate in elections. Register
                  yourself for a soulbound Citizen ID NFT.
                </p>
                <button onClick={handleIssueCitizenship} disabled={loading}>
                  {loading ? "Registering..." : "Register as Citizen"}
                </button>
              </>
            ) : (
              <div className="info success-state">
                ✓ You are a citizen! You can now participate in elections (with
                tokens).
              </div>
            )}
          </div>

          {/* Step 3: Add Candidates */}
          {isOwner && Object.keys(positions).length > 0 && (
            <div className="card">
              <h2>Step 3: Add Candidates</h2>
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
            </div>
          )}
        </div>

        {/* Step 4: Elections */}
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
            <div key={id} className="card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <h2>{position.name}</h2>
                <div>
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
                <div
                  className="info success-state"
                  style={{ marginBottom: "15px" }}
                >
                  Winner:{" "}
                  <CopyableAddress address={winner.address} showFull={true} /> (
                  {winner.voteCount} votes)
                </div>
              )}

              {position.active && canVote && (
                <div className="info">
                  You can vote! Click a candidate below.
                </div>
              )}

              {position.active && !isCitizen && (
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

              {position.active && isCitizen && Number(tokenBalance) === 0 && (
                <div
                  className="info"
                  style={{
                    backgroundColor: "#fff3cd",
                    borderColor: "#ffc107",
                    color: "#856404",
                  }}
                >
                  You need Nation Tokens to vote
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
          <div className="card">
            <div className="empty-state">
              No election positions created yet. Please check back later.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
