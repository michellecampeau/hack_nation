import { cn } from "@/lib/utils";

interface BridgeIconProps {
  size?: number;
  className?: string;
}

export function BridgeIcon({ size = 24, className }: BridgeIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-bridge-node", className)}
      aria-hidden
    >
      <circle cx="12" cy="12" r="6" fill="currentColor" />
      <line
        x1="18"
        y1="12"
        x2="62"
        y2="12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="68" cy="12" r="6" fill="currentColor" />
    </svg>
  );
}
