import { RefreshCw } from "lucide-react";

// The refresh icon used by every "refresh" button. While `spinning` it turns with an ease
// in/out so each revolution is clearly visible (see .refresh-icon in globals.css). Add
// "group-hover:rotate-180" through `className` when the button is a Tailwind `group`.
export function RefreshIcon({
  spinning = false,
  size = 16,
  className = "",
}: {
  spinning?: boolean;
  size?: number;
  className?: string;
}) {
  return (
    <span aria-hidden="true" data-spinning={spinning} className={`refresh-icon ${className}`}>
      <RefreshCw size={size} />
    </span>
  );
}
