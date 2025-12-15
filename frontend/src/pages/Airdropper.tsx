import { useState, useEffect, FormEvent } from "react";
import { ethers, BrowserProvider, Contract } from "ethers";
import {
  AIRDROPPER_ADDRESS,
  AIRDROPPER_ABI,
  NATION_TOKEN_ADDRESS,
  NATION_TOKEN_ABI,
  SOULBOUND_CITIZEN_ID_ADDRESS,
  SOULBOUND_CITIZEN_ID_ABI,
} from "../config";
import { CopyableAddress } from "../components/CopyableAddress";
import "./Pages.css";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export function Airdropper() {
  // Wallet & Contracts
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [airdropperContract, setAirdropperContract] = useState<Contract | null>(
    null
  );
  const [nationTokenContract, setNationTokenContract] =
    useState<Contract | null>(null);

  // Contract Info
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [contractBalance, setContractBalance] = useState<string>("0");

  // UI State
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  // Form State - Single Airdrop
  const [singleRecipient, setSingleRecipient] = useState<string>("");
  const [singleAmount, setSingleAmount] = useState<string>("100");
  const [useMint, setUseMint] = useState<boolean>(false);

  // Form State - Batch Airdrop
  const [batchRecipients, setBatchRecipients] = useState<string>("");
  const [batchAmounts, setBatchAmounts] = useState<string>("");
  const [batchUseMint, setBatchUseMint] = useState<boolean>(false);

  useEffect(() => {
    connectWallet();
  }, []);

  useEffect(() => {
    if (airdropperContract && nationTokenContract && account) {
      loadContractData();
    }
  }, [airdropperContract, nationTokenContract, account]);

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        setError("Please install MetaMask to use this dApp");
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();

      const airdropperContract = new ethers.Contract(
        AIRDROPPER_ADDRESS,
        AIRDROPPER_ABI,
        signer
      );
      const nationTokenContract = new ethers.Contract(
        NATION_TOKEN_ADDRESS,
        NATION_TOKEN_ABI,
        signer
      );

      setProvider(provider);
      setAccount(accounts[0]);
      setAirdropperContract(airdropperContract);
      setNationTokenContract(nationTokenContract);

      window.ethereum.on("accountsChanged", (accounts: string[]) => {
        setAccount(accounts[0]);
        window.location.reload();
      });
    } catch (err: any) {
      setError("Failed to connect wallet: " + err.message);
    }
  };

  const loadContractData = async () => {
    if (!airdropperContract || !nationTokenContract || !account) return;

    try {
      setLoading(true);

      // Check citizenship
      if (!provider) return;
      const signer = await provider.getSigner();
      const citizenIdContract = new Contract(
        SOULBOUND_CITIZEN_ID_ADDRESS,
        SOULBOUND_CITIZEN_ID_ABI,
        signer
      );
      const normalizedAccount = account.toLowerCase();
      const citizenBalance = await citizenIdContract.balanceOf(
        normalizedAccount
      );
      const hasCitizenship = citizenBalance > 0n || Number(citizenBalance) > 0;

      if (!hasCitizenship) {
        setError(
          "You must be a citizen to view this page. Please register on the Main App page."
        );
        setLoading(false);
        return;
      }

      // Check if user is owner
      const owner = await airdropperContract.owner();
      setIsOwner(owner.toLowerCase() === account.toLowerCase());

      // Get contract balance
      const balance = await nationTokenContract.balanceOf(AIRDROPPER_ADDRESS);
      const decimals = await nationTokenContract.decimals();
      setContractBalance(ethers.formatUnits(balance, Number(decimals)));

      setLoading(false);
    } catch (err: any) {
      console.error("Error loading contract data:", err);
      setError("Failed to load contract data: " + err.message);
      setLoading(false);
    }
  };

  const handleSingleAirdrop = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!airdropperContract) return;

    setError("");
    setSuccess("");

    try {
      setLoading(true);

      if (useMint) {
        const tx = await airdropperContract.mintAndAirdropOne(
          singleRecipient,
          singleAmount
        );
        await tx.wait();
        setSuccess(
          `Minted and airdropped ${singleAmount} tokens to ${singleRecipient}!`
        );
      } else {
        const tx = await airdropperContract.airdropOne(
          singleRecipient,
          singleAmount
        );
        await tx.wait();
        setSuccess(`Airdropped ${singleAmount} tokens to ${singleRecipient}!`);
      }

      setSingleRecipient("");
      setSingleAmount("100");
      await loadContractData();
    } catch (err: any) {
      const errorMessage = err.reason || err.message || "Transaction failed";
      setError("Failed to airdrop: " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchAirdrop = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!airdropperContract) return;

    setError("");
    setSuccess("");

    try {
      setLoading(true);

      // Parse recipients and amounts
      const recipients = batchRecipients
        .split("\n")
        .map((r) => r.trim())
        .filter((r) => r.length > 0);
      const amounts = batchAmounts
        .split("\n")
        .map((a) => a.trim())
        .filter((a) => a.length > 0);

      if (recipients.length !== amounts.length) {
        setError("Number of recipients must match number of amounts");
        setLoading(false);
        return;
      }

      if (recipients.length === 0) {
        setError("Please provide at least one recipient");
        setLoading(false);
        return;
      }

      if (batchUseMint) {
        const tx = await airdropperContract.mintAndAirdrop(recipients, amounts);
        await tx.wait();
        setSuccess(`Minted and airdropped to ${recipients.length} recipients!`);
      } else {
        const tx = await airdropperContract.airdropMany(recipients, amounts);
        await tx.wait();
        setSuccess(`Airdropped to ${recipients.length} recipients!`);
      }

      setBatchRecipients("");
      setBatchAmounts("");
      await loadContractData();
    } catch (err: any) {
      const errorMessage = err.reason || err.message || "Transaction failed";
      setError("Failed to batch airdrop: " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!account) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>Airdropper Treasury</h1>
          <p className="subtitle">
            Citizenship-gated token distribution for CountryDAO
          </p>
        </div>
        <section className="card citizens-hero-card">
          <div className="citizens-hero-content">
            <p className="eyebrow">Treasury access</p>
            <h2>Connect your wallet to manage airdrops</h2>
            <p className="citizens-hero-subtitle">
              Only the Airdropper contract owner can perform airdrops. Token
              transfers are restricted to citizens holding a CitizenID NFT.
            </p>
          </div>
          <div className="citizens-hero-status">
            {error && <div className="error">{error}</div>}
            <button onClick={connectWallet} className="home-primary-cta">
              Connect MetaMask
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Airdropper Treasury</h1>
        <p className="subtitle">
          Token airdrop management • Citizenship-gated distribution
        </p>
      </div>

      <section className="card citizens-hero-card">
        <div className="citizens-hero-content">
          <p className="eyebrow">Treasury status</p>
          <h2>Manage NAT airdrops to citizens</h2>
          <p className="citizens-hero-subtitle">
            Distribute existing NAT from the Airdropper balance, or mint and
            airdrop in a single transaction when the contract holds MINTER_ROLE.
          </p>
        </div>
        <div className="citizens-hero-status">
          <div className="wallet-info" style={{ marginBottom: "0.75rem" }}>
            {account && (
              <CopyableAddress
                address={account}
                className="address"
                showFull={true}
              />
            )}
          </div>
          <div className="wallet-info" style={{ gap: "0.5rem" }}>
            {isOwner && <span className="status-badge active">Owner</span>}
            <span className="status-badge">
              Contract Balance: {contractBalance} NAT
            </span>
          </div>
        </div>
      </section>

      {(error || success) && (
        <div className="admin-alert-row">
          {error && <div className="error">{error}</div>}
          {success && <div className="success">{success}</div>}
        </div>
      )}

      {!isOwner && (
        <div className="card admin-card">
          <div className="info info-warning">
            Only the Airdropper contract owner can perform airdrops.
          </div>
        </div>
      )}

      {isOwner && (
        <>
          <section className="citizens-layout">
            <section className="card citizens-list-card">
              <div className="admin-section-header">
                <div>
                  <h2>Contract information</h2>
                  <p>Addresses involved in this airdrop configuration.</p>
                </div>
              </div>
              <div style={{ marginBottom: "15px" }}>
                <strong>Airdropper contract:</strong>
                <CopyableAddress address={AIRDROPPER_ADDRESS} showFull={true} />
              </div>
              <div style={{ marginBottom: "15px" }}>
                <strong>Token contract:</strong>
                <CopyableAddress
                  address={NATION_TOKEN_ADDRESS}
                  showFull={true}
                />
              </div>
              <div>
                <strong>Contract token balance:</strong> {contractBalance} NAT
              </div>
              <div className="info" style={{ marginTop: "15px" }}>
                For non-mint airdrops, ensure the Airdropper holds enough NAT.
                For mint airdrops, grant MINTER_ROLE to the Airdropper via the
                Admin page.
              </div>
            </section>

            <section className="card citizens-list-card">
              <div className="admin-section-header">
                <div>
                  <h2>Single airdrop</h2>
                  <p>
                    Send NAT to a single citizen address. Amounts are specified
                    in whole tokens.
                  </p>
                </div>
              </div>
              <form onSubmit={handleSingleAirdrop}>
                <div className="form-group">
                  <label>Recipient address</label>
                  <input
                    type="text"
                    value={singleRecipient}
                    onChange={(e) => setSingleRecipient(e.target.value)}
                    placeholder="0x..."
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Amount (NAT, whole tokens)</label>
                  <input
                    type="number"
                    value={singleAmount}
                    onChange={(e) => setSingleAmount(e.target.value)}
                    placeholder="100"
                    min="1"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={useMint}
                      onChange={(e) => setUseMint(e.target.checked)}
                    />{" "}
                    Mint new tokens instead of using existing balance (requires
                    MINTER_ROLE)
                  </label>
                </div>
                <button type="submit" disabled={loading}>
                  {loading ? "Processing..." : "Send airdrop"}
                </button>
              </form>
            </section>
          </section>

          <section className="card citizens-list-card">
            <div className="admin-section-header">
              <div>
                <h2>Batch airdrop</h2>
                <p>
                  Send NAT to multiple citizens at once. One address and amount
                  per line.
                </p>
              </div>
            </div>
            <form onSubmit={handleBatchAirdrop}>
              <div className="form-group">
                <label>Recipient addresses (one per line)</label>
                <textarea
                  value={batchRecipients}
                  onChange={(e) => setBatchRecipients(e.target.value)}
                  placeholder={"0x123...\n0x456...\n0x789..."}
                  rows={5}
                  required
                />
              </div>
              <div className="form-group">
                <label>Amounts in NAT (one per line, whole tokens)</label>
                <textarea
                  value={batchAmounts}
                  onChange={(e) => setBatchAmounts(e.target.value)}
                  placeholder={"100\n200\n150"}
                  rows={5}
                  required
                />
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={batchUseMint}
                    onChange={(e) => setBatchUseMint(e.target.checked)}
                  />{" "}
                  Mint new tokens instead of using existing balance (requires
                  MINTER_ROLE)
                </label>
              </div>
              <button type="submit" disabled={loading}>
                {loading ? "Processing..." : "Send batch airdrop"}
              </button>
            </form>
          </section>
        </>
      )}
    </div>
  );
}
