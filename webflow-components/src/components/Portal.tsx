import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

type PortalWithStylesProps = {
  children: ReactNode;
  /** A DOM element inside your Code Component (to find its ShadowRoot & vars) */
  inheritFrom?: HTMLElement | null;
  /** Optional tweaks for the portal container */
  style?: React.CSSProperties;
  className?: string;
  /** Copy these CSS variables from inheritFrom to the portal container */
  cssVars?: string[];
};

/**
 * Renders children into document.body AND pulls in Shadow DOM styles + CSS variables
 * from `inheritFrom` (an element rendered inside your Code Component).
 */
export default function PortalWithStyles({
  children,
  inheritFrom,
  style,
  className,
  cssVars = [
    // core tokens you defined in tokens.css
    "--background",
    "--foreground",
    "--brand-primary",
    "--brand-primary-hover",
    "--brand-primary-active",
    "--brand-primary-light",
    "--brand-secondary",
    "--brand-secondary-hover",
    "--brand-secondary-active",
    "--brand-secondary-light",
    "--brand-accent",
    "--brand-accent-hover",
    "--brand-accent-active",
    "--brand-accent-light",
    "--brand-success",
    "--brand-error",
    "--brand-warning",
    "--brand-info",
    "--text-primary",
    "--text-secondary",
    "--text-tertiary",
    "--text-on-brand",
    "--border-default",
    "--border-brand",
    "--font-brand",
    "--font-system",
    "--font-mono",
    "--chat-radius",
    "--chat-font-size",
    "--chat-small",
    "--chat-user-bubble-bg",
    "--chat-user-text",
    "--chat-assistant-bubble-bg",
    "--chat-assistant-text",
  ],
}: PortalWithStylesProps) {
  const elRef = useRef<HTMLDivElement | null>(null);

  if (!elRef.current) {
    const el = document.createElement("div");
    // full-screen fixed container above everything
    el.style.position = "fixed";
    el.style.inset = "0";
    el.style.zIndex = "2147483647"; // max-safe z-index
    el.style.pointerEvents = "none"; // inner content will enable when open
    elRef.current = el;
  }

  useEffect(() => {
    const el = elRef.current!;
    if (className) el.className = className;
    if (style) Object.assign(el.style, style);

    // Attach to body
    document.body.appendChild(el);

    // If we have a source element inside the Code Component,
    // copy its CSS variables and ShadowRoot styles
    if (inheritFrom) {
      try {
        // 1) Copy CSS variables
        const source = inheritFrom;
        const computed = getComputedStyle(source);
        cssVars.forEach((name) => {
          const val = computed.getPropertyValue(name);
          if (val) el.style.setProperty(name, val);
        });

        // 2) Clone stylesheets (style/link) from ShadowRoot, if any
        const root = source.getRootNode() as Document | ShadowRoot;
        if ((root as ShadowRoot).host) {
          const shadow = root as ShadowRoot;
          const styleNodes = shadow.querySelectorAll('style, link[rel="stylesheet"]');
          styleNodes.forEach((node) => {
            const clone = node.cloneNode(true) as HTMLElement;
            // avoid double-adding the same link/style across re-renders
            // (cheap signature via outerHTML)
            const sig = clone.outerHTML.slice(0, 200);
            const exists = Array.from(el.childNodes).some(
              (n) => (n as HTMLElement).outerHTML?.slice(0, 200) === sig
            );
            if (!exists) {
              el.appendChild(clone);
            }
          });
        }
      } catch {
        // If CORS or other restrictions block cloning, we still have vars copied
      }
    }

    return () => {
      document.body.removeChild(el);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inheritFrom, className]);

  return createPortal(children, elRef.current);
}