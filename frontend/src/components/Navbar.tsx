import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ethers, Contract } from "ethers";
import {
  NATION_TOKEN_ADDRESS,
  NATION_TOKEN_ABI,
  SOULBOUND_CITIZEN_ID_ADDRESS,
  SOULBOUND_CITIZEN_ID_ABI,
} from "../config";
import "./Navbar.css";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export function Navbar() {
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isCitizen, setIsCitizen] = useState<boolean>(false);

  useEffect(() => {
    checkStatus();

    // Listen for account changes or page navigation
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", () => {
        checkStatus();
      });
    }
  }, []);

  const checkStatus = async () => {
    try {
      if (!window.ethereum) {
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);

      if (!accounts || accounts.length === 0) {
        return;
      }

      const account = accounts[0];
      const signer = await provider.getSigner();

      const nationTokenContract = new Contract(
        NATION_TOKEN_ADDRESS,
        NATION_TOKEN_ABI,
        signer
      );

      const citizenIdContract = new Contract(
        SOULBOUND_CITIZEN_ID_ADDRESS,
        SOULBOUND_CITIZEN_ID_ABI,
        signer
      );

      // Check admin status
      const adminRole = await nationTokenContract.DEFAULT_ADMIN_ROLE();
      const hasAdminRole = await nationTokenContract.hasRole(
        adminRole,
        account
      );
      setIsAdmin(hasAdminRole);

      // Check citizenship status
      const normalizedAccount = account.toLowerCase();
      const balance = await citizenIdContract.balanceOf(normalizedAccount);
      const hasCitizenship = balance > 0n || Number(balance) > 0;
      setIsCitizen(hasCitizenship);
    } catch (err) {
      console.error("Error checking status:", err);
    }
  };

  const isHome = location.pathname === "/";
  const isCitizens = location.pathname === "/citizens";
  const isOfficials = location.pathname === "/officials";
  const isAdminRoute = location.pathname === "/admin";
  const isAirdropper = location.pathname === "/airdropper";

  return (
    <nav className="navbar">
      <div className="navbar-shell">
        <div className="navbar-left">
          <Link to="/" className="navbar-logo">
            <div className="navbar-logo-mark">
              <span className="navbar-logo-orb" />
              <span className="navbar-logo-orbit" />
            </div>
            <div className="navbar-logo-text">
              <span className="navbar-logo-title">CountryDAO</span>
              <span className="navbar-logo-subtitle">
                On‑chain civic governance
              </span>
            </div>
          </Link>
        </div>

        <div className="navbar-center">
          <ul className="navbar-links">
            <li>
              <Link
                to="/"
                className={`navbar-link ${isHome ? "navbar-link--active" : ""}`}
              >
                Overview
              </Link>
            </li>
            <li>
              <Link
                to="/citizens"
                className={`navbar-link ${
                  isCitizens ? "navbar-link--active" : ""
                }`}
              >
                Citizens
              </Link>
            </li>
            <li>
              {isCitizen ? (
                <Link
                  to="/officials"
                  className={`navbar-link ${
                    isOfficials ? "navbar-link--active" : ""
                  }`}
                >
                  Officials
                </Link>
              ) : (
                <span
                  className="navbar-link navbar-link--disabled"
                  title="You must be a citizen to view this page"
                >
                  Officials
                  <span className="navbar-link-lock">🔒</span>
                </span>
              )}
            </li>
            {isAdmin && (
              <li>
                <Link
                  to="/admin"
                  className={`navbar-link ${
                    isAdminRoute ? "navbar-link--active" : ""
                  }`}
                >
                  Admin
                </Link>
              </li>
            )}
            <li>
              {isCitizen ? (
                <Link
                  to="/airdropper"
                  className={`navbar-link ${
                    isAirdropper ? "navbar-link--active" : ""
                  }`}
                >
                  Airdropper
                </Link>
              ) : (
                <span
                  className="navbar-link navbar-link--disabled"
                  title="You must be a citizen to view this page"
                >
                  Airdropper
                  <span className="navbar-link-lock">🔒</span>
                </span>
              )}
            </li>
          </ul>
        </div>

        <div className="navbar-right">
          <div className="navbar-badges">
            <span
              className={`navbar-pill ${
                isCitizen ? "navbar-pill--active" : "navbar-pill--muted"
              }`}
            >
              <span className="navbar-pill-dot" />
              {isCitizen ? "Citizen verified" : "Not a citizen"}
            </span>
            {isAdmin && (
              <span className="navbar-pill navbar-pill--accent">
                Admin controls
              </span>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
