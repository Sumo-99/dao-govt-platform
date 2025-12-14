import { useState, useEffect } from "react";
import { ethers, Contract } from "ethers";
import {
  SOULBOUND_CITIZEN_ID_ADDRESS,
  SOULBOUND_CITIZEN_ID_ABI,
  NATION_TOKEN_ADDRESS,
  NATION_TOKEN_ABI,
} from "../config";
import { CopyableAddress } from "../components/CopyableAddress";
import "./Pages.css";

interface Citizen {
  address: string;
  tokenBalance: string;
}

export function Citizens() {
  const [citizens, setCitizens] = useState<Citizen[]>([]);
  const [totalSupply, setTotalSupply] = useState<string>("0");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [account, setAccount] = useState<string | null>(null);

  useEffect(() => {
    loadCitizens();
  }, []);

  const loadCitizens = async () => {
    try {
      if (!window.ethereum) {
        setError("Please install MetaMask to use this dApp");
        setLoading(false);
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      setAccount(accounts[0]);

      const signer = await provider.getSigner();
      const citizenIdContract = new Contract(
        SOULBOUND_CITIZEN_ID_ADDRESS,
        SOULBOUND_CITIZEN_ID_ABI,
        signer
      );
      const nationTokenContract = new Contract(
        NATION_TOKEN_ADDRESS,
        NATION_TOKEN_ABI,
        signer
      );

      // Debug: Verify the contract is correct by checking owner
      try {
        const owner = await citizenIdContract.owner();
        console.log("SoulboundCitizenID Owner:", owner);
        console.log("SoulboundCitizenID Address:", SOULBOUND_CITIZEN_ID_ADDRESS);
      } catch (err: any) {
        console.error("Failed to call owner() on citizenIdContract:", err.message);
      }

      // Get all citizens by iterating through token IDs
      let nextId;
      try {
        nextId = await citizenIdContract.nextId();
        console.log("nextId from contract:", nextId);
      } catch (err: any) {
        console.error("Failed to call nextId():", err);
        throw new Error(`nextId() call failed: ${err.message}`);
      }

      const citizenAddresses = new Set<string>();

      // Iterate through all token IDs (starting from 1, since nextId is pre-incremented)
      for (let tokenId = 1; tokenId <= Number(nextId); tokenId++) {
        try {
          // Try to get the owner of this token
          // If token exists and hasn't been burned, this will return the owner
          const owner = await citizenIdContract.ownerOf(tokenId);
          citizenAddresses.add(owner);
        } catch (err) {
          // Token doesn't exist or was burned, skip it
          continue;
        }
      }

      // Get token balance for each citizen
      const decimalsValue = await nationTokenContract.decimals();
      // Ensure decimals is a number (ethers v6 may return bigint for uint8 in some cases)
      const decimals = Number(decimalsValue);
      const citizenData: Citizen[] = [];
      let sumOfCitizenBalances = BigInt(0);

      for (const address of citizenAddresses) {
        // Verify they still have the NFT (in case of burns)
        const balance = await citizenIdContract.balanceOf(address);
        if (Number(balance) > 0) {
          const tokenBalance = await nationTokenContract.balanceOf(address);
          sumOfCitizenBalances += tokenBalance;
          citizenData.push({
            address,
            tokenBalance: ethers.formatUnits(tokenBalance, decimals),
          });
        }
      }

      // Sort by token balance (highest first)
      citizenData.sort(
        (a, b) => parseFloat(b.tokenBalance) - parseFloat(a.tokenBalance)
      );

      // Get the actual total supply from the token contract
      const totalSupplyValue = await nationTokenContract.totalSupply();

      // Format the total supply with proper decimals
      const formattedTotalSupply = ethers.formatUnits(
        totalSupplyValue,
        decimals
      );
      const formattedSum = ethers.formatUnits(sumOfCitizenBalances, decimals);

      console.log("totalSupplyValue (raw):", totalSupplyValue.toString());
      console.log("decimals:", decimals, "(type:", typeof decimals, ")");
      console.log("formatted totalSupply:", formattedTotalSupply);
      console.log("sum of citizen balances:", formattedSum);
      const difference = totalSupplyValue - sumOfCitizenBalances;
      console.log("difference (raw):", difference.toString());
      console.log(
        "difference (formatted):",
        ethers.formatUnits(difference, decimals)
      );

      setCitizens(citizenData);
      setTotalSupply(formattedTotalSupply);
      setLoading(false);
    } catch (err: any) {
      console.error("Error loading citizens:", err);
      setError("Failed to load citizens: " + err.message);
      setLoading(false);
    }
  };

  if (!account) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>Citizens</h1>
          <p className="subtitle">
            View all registered citizens and their token holdings
          </p>
        </div>
        <div className="card">
          <div className="info">
            Please connect your wallet to view citizens
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>Citizens</h1>
          <p className="subtitle">
            View all registered citizens and their token holdings
          </p>
        </div>
        <div className="card">
          <div className="info">Loading citizens...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>Citizens</h1>
          <p className="subtitle">
            View all registered citizens and their token holdings
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
        <h1>Citizens</h1>
        <p className="subtitle">
          View all registered citizens and their token holdings
        </p>
      </div>

      <div className="card stats-card">
        <div className="stat-item">
          <div className="stat-label">Total Citizens</div>
          <div className="stat-value">{citizens.length}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Total Currency Supply</div>
          <div className="stat-value">{totalSupply} NAT</div>
        </div>
      </div>

      <div className="card">
        <h2>Registered Citizens</h2>
        {citizens.length === 0 ? (
          <div className="empty-state">No citizens registered yet</div>
        ) : (
          <div className="list-container">
            {citizens.map((citizen, index) => (
              <div key={citizen.address} className="list-item">
                <div className="list-item-header">
                  <span className="list-item-number">#{index + 1}</span>
                  <CopyableAddress
                    address={citizen.address}
                    className="list-item-address"
                    showFull={true}
                  />
                </div>
                <div className="list-item-info">
                  <span className="token-balance">
                    {citizen.tokenBalance} NAT
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
