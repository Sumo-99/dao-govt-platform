import { useState } from "react";
import "./CopyableAddress.css";

interface CopyableAddressProps {
  address: string;
  className?: string;
  showFull?: boolean;
}

export function CopyableAddress({
  address,
  className = "",
  showFull = false,
}: CopyableAddressProps) {
  const [copied, setCopied] = useState(false);

  const formatAddress = (addr: string) => {
    if (showFull) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy address:", err);
    }
  };

  return (
    <span
      className={`copyable-address ${className}`}
      onClick={handleCopy}
      title="Click to copy full address"
    >
      {formatAddress(address)}
      {copied && <span className="copy-feedback">✓ Copied!</span>}
    </span>
  );
}
