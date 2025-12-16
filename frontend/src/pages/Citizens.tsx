import { useState, useEffect } from "react";
import { ethers, Contract } from "ethers";
import {
  SOULBOUND_CITIZEN_ID_ADDRESS,
  SOULBOUND_CITIZEN_ID_ABI,
  NATION_TOKEN_ADDRESS,
  NATION_TOKEN_ABI,
} from "../config";
import { CopyableAddress } from "../components/CopyableAddress";
import { FormattedNumber } from "../components/FormattedNumber";
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
  const [isCitizen, setIsCitizen] = useState<boolean>(false);
  const [tokenBalance, setTokenBalance] = useState<string>("0");
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [registrationSuccess, setRegistrationSuccess] = useState<string>("");
  const [registrationError, setRegistrationError] = useState<string>("");

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
      const currentAccount = accounts[0];
      setAccount(currentAccount);

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

      // Check current account's citizenship status directly
      const currentAccountCitizenBalance = await citizenIdContract.balanceOf(currentAccount);
      const currentAccountIsCitizen = Number(currentAccountCitizenBalance) > 0;
      
      // Get current account's token balance
      const decimalsValue = await nationTokenContract.decimals();
      const decimals = Number(decimalsValue);
      const currentAccountTokenBalance = await nationTokenContract.balanceOf(currentAccount);
      const currentAccountBalance = ethers.formatUnits(currentAccountTokenBalance, decimals);

      // Get all citizens by iterating through token IDs
      // This is more reliable than event queries
      const nextId = await citizenIdContract.nextId();
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
      const citizenData: Citizen[] = [];
      let sumOfCitizenBalances = BigInt(0);

      for (const address of citizenAddresses) {
        // Verify they still have the NFT (in case of burns)
        const balance = await citizenIdContract.balanceOf(address);
        if (Number(balance) > 0) {
          const tokenBalance = await nationTokenContract.balanceOf(address);
          sumOfCitizenBalances += tokenBalance;
          const formatted = ethers.formatUnits(tokenBalance, decimals);

          citizenData.push({
            address,
            tokenBalance: formatted,
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
      setIsCitizen(currentAccountIsCitizen);
      setTokenBalance(currentAccountBalance);
      setLoading(false);
    } catch (err: any) {
      console.error("Error loading citizens:", err);
      setError("Failed to load citizens: " + err.message);
      setLoading(false);
    }
  };

  const handleRegisterCitizenship = async () => {
    try {
      if (!window.ethereum) {
        setRegistrationError("Please install MetaMask to register as a citizen");
        return;
      }

      setRegistrationError("");
      setRegistrationSuccess("");
      setIsRegistering(true);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const citizenIdContract = new Contract(
        SOULBOUND_CITIZEN_ID_ADDRESS,
        SOULBOUND_CITIZEN_ID_ABI,
        signer
      );

      const tx = await citizenIdContract.registerCitizen();
      await tx.wait();

      setRegistrationSuccess("Citizenship registered successfully!");
      await loadCitizens();
    } catch (err: any) {
      const message = err?.reason || err?.message || "Transaction failed";
      setRegistrationError("Failed to register citizenship: " + message);
    } finally {
      setIsRegistering(false);
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
        <section className="card citizens-hero-card">
          <div className="citizens-hero-content">
            <p className="eyebrow">Membership registry</p>
            <h2>Connect your wallet to view citizens</h2>
            <p className="citizens-hero-subtitle">
              The registry lists every address that holds a soulbound CitizenID
              NFT, along with its NAT token balance.
            </p>
          </div>
          <div className="citizens-hero-status">
            <div className="info">
              Please connect your wallet from the navigation bar to continue.
            </div>
          </div>
        </section>
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
        <section className="card citizens-hero-card">
          <div className="citizens-hero-content">
            <p className="eyebrow">Membership registry</p>
            <h2>Loading citizens...</h2>
            <p className="citizens-hero-subtitle">
              Fetching all current CitizenID holders and their associated NAT
              balances.
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
          <h1>Citizens</h1>
          <p className="subtitle">
            View all registered citizens and their token holdings
          </p>
        </div>
        <section className="card citizens-hero-card">
          <div className="citizens-hero-content">
            <p className="eyebrow">Membership registry</p>
            <h2>Unable to load citizens</h2>
            <p className="citizens-hero-subtitle">
              There was an error while reading from the citizenship and token
              contracts.
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
        <h1>Citizens</h1>
        <p className="subtitle">
          View all registered citizens and their token holdings
        </p>
      </div>

      <section className="citizens-layout">
        <section className="card citizens-status-card">
          <div className="citizens-status-header">
            <div>
              <p className="eyebrow">Your citizenship</p>
              <h2>{isCitizen ? "You are a registered citizen" : "Become a citizen"}</h2>
              <p className="citizens-hero-subtitle">
                Citizenship is represented by a soulbound NFT that cannot be
                transferred and is permanently tied to your address.
              </p>
            </div>
            <div className="citizens-status-badges">
              <span
                className={`status-badge ${isCitizen ? "active" : "inactive"}`}
              >
                {isCitizen ? "✓ Citizen" : "✗ Not a Citizen"}
              </span>
              <span className="status-badge">
                {tokenBalance} NAT
              </span>
            </div>
          </div>

          <div className="citizens-status-body">
            {registrationError && <div className="error">{registrationError}</div>}
            {registrationSuccess && (
              <div className="success">{registrationSuccess}</div>
            )}

            {!isCitizen ? (
              <div className="citizens-status-action">
                <p>
                  Register yourself for a CitizenID NFT to participate in
                  elections, receive airdrops, and access all citizen-only
                  features.
                </p>
                <button
                  onClick={handleRegisterCitizenship}
                  disabled={isRegistering}
                >
                  {isRegistering ? "Registering..." : "Register as Citizen"}
                </button>
              </div>
            ) : (
              <div className="info success-state">
                ✓ You already hold a CitizenID NFT. You can now vote in
                elections and receive NAT airdrops.
              </div>
            )}
          </div>
        </section>

        <section className="card stats-card">
          <div className="stat-item">
            <div className="stat-label">Total Citizens</div>
            <div className="stat-value">
              <FormattedNumber value={citizens.length} />
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Total Currency Supply</div>
            <div className="stat-value">
              <FormattedNumber value={totalSupply} suffix="NAT" />
            </div>
          </div>
        </section>
      </section>

      <section className="card citizens-list-card">
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
                    <FormattedNumber value={citizen.tokenBalance} suffix="NAT" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
