import { useState } from "react";
import "./FormattedNumber.css";

interface FormattedNumberProps {
  value: string | number;
  suffix?: string;
  className?: string;
}

export function FormattedNumber({ value, suffix = "", className = "" }: FormattedNumberProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  // Convert to string and remove suffix if present
  let numStr = String(value).trim();
  const originalValue = numStr;
  
  // Remove the suffix from the value if it exists
  if (suffix && numStr.endsWith(suffix.trim())) {
    numStr = numStr.slice(0, -suffix.trim().length).trim();
  }

  // Remove commas for parsing
  const cleanNum = numStr.replace(/,/g, "");
  const num = parseFloat(cleanNum);

  if (isNaN(num)) {
    return <span className={className}>{originalValue}</span>;
  }

  // Format the number based on magnitude
  const formatNumber = (n: number): string => {
    if (n >= 1e15) {
      return (n / 1e15).toFixed(2) + "Q"; // Quadrillion
    } else if (n >= 1e12) {
      return (n / 1e12).toFixed(2) + "T"; // Trillion
    } else if (n >= 1e9) {
      return (n / 1e9).toFixed(2) + "B"; // Billion
    } else if (n >= 1e6) {
      return (n / 1e6).toFixed(2) + "M"; // Million
    } else if (n >= 1e3) {
      return (n / 1e3).toFixed(2) + "K"; // Thousand
    }
    return n.toLocaleString();
  };

  const shouldAbbreviate = num >= 1000;
  const displayValue = shouldAbbreviate ? formatNumber(num) : num.toLocaleString();
  const fullValue = num.toLocaleString(undefined, { maximumFractionDigits: 1 });

  return (
    <span
      className={`formatted-number ${className}`}
      onMouseEnter={() => shouldAbbreviate && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      title={shouldAbbreviate ? `${fullValue}${suffix ? ' ' + suffix : ''}` : undefined}
    >
      {displayValue}
      {suffix && ` ${suffix}`}
      {showTooltip && shouldAbbreviate && (
        <span className="formatted-number-tooltip">
          {fullValue}{suffix ? ' ' + suffix : ''}
        </span>
      )}
    </span>
  );
}
