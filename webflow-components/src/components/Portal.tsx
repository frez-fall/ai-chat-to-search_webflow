import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

type PortalProps = {
  children: ReactNode;
  /** Optional inline style overrides for the portal container */
  style?: React.CSSProperties;
  /** Optional className for the portal container */
  className?: string;
};

export default function Portal({ children, style, className }: PortalProps) {
  const elRef = useRef<HTMLDivElement | null>(null);

  if (!elRef.current) {
    elRef.current = document.createElement("div");
    // Default container style: full-screen fixed overlay with very high z-index
    elRef.current.style.position = "fixed";
    elRef.current.style.inset = "0";
    elRef.current.style.zIndex = "2147483647"; // max safe z-index
    elRef.current.style.pointerEvents = "none"; // let child control interactivity
  }

  useEffect(() => {
    const el = elRef.current!;
    if (className) el.className = className;
    if (style) Object.assign(el.style, style);

    document.body.appendChild(el);
    return () => {
      document.body.removeChild(el);
    };
  }, [className, style]);

  // Child content will provide interactive layers (set pointerEvents back)
  return createPortal(children, elRef.current);
}