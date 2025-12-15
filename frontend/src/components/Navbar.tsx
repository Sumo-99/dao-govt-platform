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

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <h1>Country DAO</h1>
        </div>
        <ul className="navbar-links">
          <li>
            <Link to="/" className={location.pathname === "/" ? "active" : ""}>
              Main App
            </Link>
          </li>
          <li>
            <Link
              to="/citizens"
              className={location.pathname === "/citizens" ? "active" : ""}
            >
              Citizens
            </Link>
          </li>
          <li>
            {isCitizen ? (
              <Link
                to="/officials"
                className={location.pathname === "/officials" ? "active" : ""}
              >
                Officials
              </Link>
            ) : (
              <span
                className="navbar-link-disabled"
                title="You must be a citizen to view this page"
              >
                Officials 🔒
              </span>
            )}
          </li>
          {isAdmin && (
            <li>
              <Link
                to="/admin"
                className={location.pathname === "/admin" ? "active" : ""}
              >
                Admin
              </Link>
            </li>
          )}
          <li>
            {isCitizen ? (
              <Link
                to="/airdropper"
                className={location.pathname === "/airdropper" ? "active" : ""}
              >
                Airdropper
              </Link>
            ) : (
              <span
                className="navbar-link-disabled"
                title="You must be a citizen to view this page"
              >
                Airdropper 🔒
              </span>
            )}
          </li>
        </ul>
      </div>
    </nav>
  );
}
