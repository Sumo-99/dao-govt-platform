import { useState, useEffect } from "react";
import { ethers, Contract } from "ethers";
import {
  ELECTION_ADDRESS,
  ELECTION_ABI,
  SOULBOUND_CITIZEN_ID_ADDRESS,
  SOULBOUND_CITIZEN_ID_ABI,
  NATION_TOKEN_ADDRESS,
  NATION_TOKEN_ABI,
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

export function Officials() {
  const [account, setAccount] = useState<string | null>(null);
  const [citizenIdContract, setCitizenIdContract] = useState<Contract | null>(
    null
  );
  const [nationTokenContract, setNationTokenContract] =
    useState<Contract | null>(null);
  const [electionContract, setElectionContract] = useState<Contract | null>(
    null
  );

  const [isCitizen, setIsCitizen] = useState<boolean>(false);
  const [tokenBalance, setTokenBalance] = useState<string>("0");

  const [positions, setPositions] = useState<{ [key: number]: Position }>({});
  const [candidatesByPosition, setCandidatesByPosition] = useState<{
    [key: number]: Candidate[];
  }>({});
  const [hasVotedByPosition, setHasVotedByPosition] = useState<{
    [key: number]: boolean;
  }>({});
  const [winners, setWinners] = useState<Winners>({});

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

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
        setLoading(false);
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
      setLoading(false);
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
      const normalizedAccount = account.toLowerCase();
      const balance = await citizenIdContract.balanceOf(normalizedAccount);
      const hasCitizenship = balance > 0n || Number(balance) > 0;
      setIsCitizen(hasCitizenship);

      // Check token balance
      const tokenBal = await nationTokenContract.balanceOf(account);
      const decimalsValue = await nationTokenContract.decimals();
      const decimals = Number(decimalsValue);
      setTokenBalance(ethers.formatUnits(tokenBal, decimals));

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
            const candidateAddresses =
              await electionContract.getCandidates(positionId);
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
          console.log(`Position ${positionId} doesn't exist`);
        }
      }

      setPositions(positionsData);
      setCandidatesByPosition(candidatesData);
      setHasVotedByPosition(votedData);
      setWinners(winnersData);

      setLoading(false);
    } catch (err: any) {
      console.error("Error loading officials data:", err);
      setError("Failed to load officials: " + err.message);
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
      setSuccess("Vote cast successfully! 1 NAT was burned for this vote.");
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
      <div className="page-container">
        <div className="page-header">
          <h1>Elected Officials & Elections</h1>
          <p className="subtitle">
            View current officials and participate in on-chain elections
          </p>
        </div>
        <section className="card citizens-hero-card">
          <div className="citizens-hero-content">
            <p className="eyebrow">Governance access</p>
            <h2>Connect your wallet to see elections</h2>
            <p className="citizens-hero-subtitle">
              Only connected wallets can view positions, candidates, and cast
              votes in CountryDAO elections.
            </p>
          </div>
          <div className="citizens-hero-status">
            <div className="info">
              Please connect your wallet from the navigation bar to view and
              vote in elections.
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (loading && !Object.keys(positions).length && !error) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>Elected Officials & Elections</h1>
          <p className="subtitle">
            View current officials and participate in on-chain elections
          </p>
        </div>
        <section className="card citizens-hero-card">
          <div className="citizens-hero-content">
            <p className="eyebrow">Loading positions</p>
            <h2>Fetching elections and officials…</h2>
            <p className="citizens-hero-subtitle">
              Reading all existing positions, candidates, and winners from the
              Election contract.
            </p>
          </div>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>Elected Officials & Elections</h1>
          <p className="subtitle">
            View current officials and participate in on-chain elections
          </p>
        </div>
        <section className="card citizens-hero-card">
          <div className="citizens-hero-content">
            <p className="eyebrow">Governance access</p>
            <h2>Unable to load elections</h2>
            <p className="citizens-hero-subtitle">
              There was an error while reading from the election, citizenship,
              or token contracts.
            </p>
          </div>
          <div className="citizens-hero-status">
            <div className="error">{error}</div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Elected Officials & Elections</h1>
        <p className="subtitle">
          View current officials, see candidates, and vote with NAT
        </p>
      </div>

      <section className="citizens-layout">
        <section className="card citizens-status-card">
          <div className="citizens-status-header">
            <div>
              <p className="eyebrow">Your voting eligibility</p>
              <h2>Citizen voting status</h2>
              <p className="citizens-hero-subtitle">
                To vote, you must hold a CitizenID NFT and at least 1 NAT token.
                Each vote permanently burns 1 NAT.
              </p>
            </div>
            <div className="citizens-status-badges">
              <span
                className={`status-badge ${isCitizen ? "active" : "inactive"}`}
              >
                {isCitizen ? "✓ Citizen" : "✗ Not a Citizen"}
              </span>
              <span className="status-badge">{tokenBalance} NAT</span>
            </div>
          </div>
          <div className="citizens-status-body">
            {!isCitizen && (
              <div className="info info-warning">
                You must register as a citizen before you can vote in
                elections. Go to the Citizens page to mint your CitizenID NFT.
              </div>
            )}
            {isCitizen && Number(tokenBalance) === 0 && (
              <div className="info info-warning">
                You do not have any NAT tokens. Request an airdrop from an
                admin to participate in voting.
              </div>
            )}
            {success && <div className="success">{success}</div>}
          </div>
        </section>

        <section className="card stats-card">
          <div className="stat-item">
            <div className="stat-label">Total Positions</div>
            <div className="stat-value">{Object.keys(positions).length}</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Active Elections</div>
            <div className="stat-value">
              {
                Object.values(positions).filter((position) => position.active)
                  .length
              }
            </div>
          </div>
        </section>
      </section>

      <section className="home-elections">
        {Object.entries(positions).length === 0 && (
          <div className="card home-election-card">
            <div className="empty-state">
              No positions have been created yet. Elections will appear here
              once an admin opens positions.
            </div>
          </div>
        )}

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
                  {hasVoted && (
                    <span className="status-badge">You have voted</span>
                  )}
                </div>
              </div>

              {!position.active && winner && (
                <div className="info success-state home-election-winner">
                  Current official:&nbsp;
                  <CopyableAddress
                    address={winner.address}
                    showFull={true}
                  />{" "}
                  ({winner.voteCount} votes)
                </div>
              )}

              {position.active && canVote && (
                <div className="info">
                  You can vote in this election. Each vote costs{" "}
                  <strong>1 NAT</strong> and is permanently burned.
                </div>
              )}

              <div className="candidate-list">
                {candidates.length === 0 ? (
                  <div className="empty-state">No candidates yet</div>
                ) : (
                  candidates.map((candidate, idx) => {
                    const isWinner =
                      !position.active &&
                      winner?.address === candidate.address;
                    const voteButtonDisabled =
                      !canVote || loading || !position.active;

                    return (
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
                        {isWinner && (
                          <div className="winner-badge">Winner</div>
                        )}
                        {position.active && (
                          <button
                            onClick={() =>
                              handleVote(positionId, candidate.address)
                            }
                            disabled={voteButtonDisabled}
                            title={
                              !isCitizen
                                ? "You must be a citizen to vote"
                                : Number(tokenBalance) === 0
                                ? "You need at least 1 NAT to vote"
                                : hasVoted
                                ? "You have already voted in this election"
                                : "Cast your vote (costs 1 NAT)"
                            }
                          >
                            {hasVoted
                              ? "Already voted"
                              : "Vote (costs 1 NAT)"}
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
