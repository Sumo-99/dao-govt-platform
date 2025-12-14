import { useState, useEffect } from "react";
import { ethers, Contract } from "ethers";
import {
  ELECTION_ADDRESS,
  ELECTION_ABI,
  SOULBOUND_CITIZEN_ID_ADDRESS,
  SOULBOUND_CITIZEN_ID_ABI,
} from "../config";
import { CopyableAddress } from "../components/CopyableAddress";
import "./Pages.css";

interface Official {
  positionId: number;
  positionName: string;
  address: string;
  voteCount: number;
}

export function Officials() {
  const [officials, setOfficials] = useState<Official[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [account, setAccount] = useState<string | null>(null);

  useEffect(() => {
    loadOfficials();
  }, []);

  const loadOfficials = async () => {
    try {
      if (!window.ethereum) {
        setError("Please install MetaMask to use this dApp");
        setLoading(false);
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const account = accounts[0];
      setAccount(account);

      const signer = await provider.getSigner();

      // Check citizenship
      const citizenIdContract = new Contract(
        SOULBOUND_CITIZEN_ID_ADDRESS,
        SOULBOUND_CITIZEN_ID_ABI,
        signer
      );
      const normalizedAccount = account.toLowerCase();
      const balance = await citizenIdContract.balanceOf(normalizedAccount);
      const hasCitizenship = balance > 0n || Number(balance) > 0;

      if (!hasCitizenship) {
        setError(
          "You must be a citizen to view this page. Please register on the Main App page."
        );
        setLoading(false);
        return;
      }

      const electionContract = new Contract(
        ELECTION_ADDRESS,
        ELECTION_ABI,
        signer
      );

      // Load all closed positions (check IDs 0-50)
      const officialsData: Official[] = [];

      for (let positionId = 0; positionId < 50; positionId++) {
        try {
          const [name, active, exists] = await electionContract.positions(
            positionId
          );

          // Only include closed positions (elections that have finished)
          if (exists && !active) {
            const [winner, voteCount] = await electionContract.currentWinner(
              positionId
            );

            // Only add if there's a valid winner
            if (winner !== ethers.ZeroAddress && Number(voteCount) > 0) {
              officialsData.push({
                positionId,
                positionName: name,
                address: winner,
                voteCount: Number(voteCount),
              });
            }
          }
        } catch (err) {
          // Position doesn't exist, skip
          console.log(`Position ${positionId} doesn't exist`);
        }
      }

      // Sort by position ID
      officialsData.sort((a, b) => a.positionId - b.positionId);

      setOfficials(officialsData);
      setLoading(false);
    } catch (err: any) {
      console.error("Error loading officials:", err);
      setError("Failed to load officials: " + err.message);
      setLoading(false);
    }
  };

  if (!account) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>Elected Officials</h1>
          <p className="subtitle">
            View all elected officials from closed elections
          </p>
        </div>
        <div className="card">
          <div className="info">
            Please connect your wallet to view officials
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>Elected Officials</h1>
          <p className="subtitle">
            View all elected officials from closed elections
          </p>
        </div>
        <div className="card">
          <div className="info">Loading officials...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>Elected Officials</h1>
          <p className="subtitle">
            View all elected officials from closed elections
          </p>
        </div>
        <div className="card">
          <div className="error">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Elected Officials</h1>
        <p className="subtitle">
          View all elected officials from closed elections
        </p>
      </div>

      <div className="card stats-card">
        <div className="stat-item">
          <div className="stat-label">Total Positions Filled</div>
          <div className="stat-value">{officials.length}</div>
        </div>
      </div>

      <div className="card">
        <h2>Current Officials</h2>
        {officials.length === 0 ? (
          <div className="empty-state">
            No elections have been closed yet. Officials will appear here once
            elections are completed.
          </div>
        ) : (
          <div className="officials-grid">
            {officials.map((official) => (
              <div key={official.positionId} className="official-card">
                <div className="official-header">
                  <h3>{official.positionName}</h3>
                  <span className="position-badge">
                    Position #{official.positionId}
                  </span>
                </div>
                <div className="official-info">
                  <div className="info-row">
                    <span className="info-label">Address:</span>
                    <CopyableAddress
                      address={official.address}
                      className="info-value"
                      showFull={true}
                    />
                  </div>
                  <div className="info-row">
                    <span className="info-label">Votes:</span>
                    <span className="info-value votes">
                      {official.voteCount}
                    </span>
                  </div>
                </div>
                <div className="winner-badge-large">🏆 Elected Official</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
