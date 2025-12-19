import "./FormattedNumber.css";

interface FormattedNumberProps {
  value: string | number;
  suffix?: string;
  className?: string;
}

export function FormattedNumber({ value, suffix = "", className = "" }: FormattedNumberProps) {
  const normalizedSuffix = suffix.trim();

  const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const raw =
    typeof value === "number"
      ? value.toLocaleString()
      : String(value).trim();

  const hasSuffix =
    normalizedSuffix.length > 0
      ? new RegExp(`\\s*${escapeRegExp(normalizedSuffix)}\\s*$`).test(raw)
      : false;

  return (
    <span className={className}>
      {raw}
      {!hasSuffix && normalizedSuffix ? ` ${normalizedSuffix}` : ""}
    </span>
  );
}
