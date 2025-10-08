// webflow-components/src/hooks/useLockBodyScroll.ts
import { useEffect, useRef } from "react";

/**
 * Locks <body> scroll while `locked` is true.
 * - Prevents background scroll on Webflow page while modal (inside Code Component) is open
 * - Avoids layout shift by compensating for scrollbar
 * - Restores scroll position on unlock
 */
export function useLockBodyScroll(locked: boolean) {
  const scrollYRef = useRef(0);
  const locksRef = useRef(0); // allows multiple lock callers if ever needed

  useEffect(() => {
    if (typeof window === "undefined") return;

    const body = document.body;
    const html = document.documentElement;

    const getScrollbarWidth = () => {
      // Avoid reflow if no scrollbar
      const hasScroll =
        window.innerWidth > html.clientWidth ||
        body.scrollHeight > window.innerHeight;
      if (!hasScroll) return 0;

      // Create a temp element to measure scrollbar width (cross-browser)
      const scrollDiv = document.createElement("div");
      scrollDiv.style.cssText =
        "position:absolute; top:-9999px; width:100px; height:100px; overflow:scroll;";
      body.appendChild(scrollDiv);
      const width = scrollDiv.offsetWidth - scrollDiv.clientWidth;
      body.removeChild(scrollDiv);
      return width;
    };

    const lock = () => {
      if (locksRef.current > 0) {
        locksRef.current++;
        return;
      }
      locksRef.current = 1;

      // Save current scroll Y
      scrollYRef.current = window.scrollY || window.pageYOffset || 0;

      // Compensate for scrollbar to avoid content "jump"
      const scrollBarW = getScrollbarWidth();
      if (scrollBarW > 0) {
        body.style.paddingRight = `${scrollBarW}px`;
      }

      // Lock scroll with fixed body (works on iOS Safari, too)
      body.style.position = "fixed";
      body.style.top = `-${scrollYRef.current}px`;
      body.style.left = "0";
      body.style.right = "0";
      body.style.width = "100%";
      body.style.overflow = "hidden"; // belt-and-suspenders
      html.style.scrollBehavior = "auto"; // avoid smooth scroll fighting restore
      body.setAttribute("data-scroll-locked", "true");
    };

    const unlock = () => {
      if (locksRef.current > 1) {
        locksRef.current--;
        return;
      }
      locksRef.current = 0;

      body.removeAttribute("data-scroll-locked");
      body.style.overflow = "";
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      body.style.width = "";
      body.style.paddingRight = "";
      html.style.scrollBehavior = "";

      // Restore previous scroll position
      window.scrollTo(0, scrollYRef.current);
    };

    if (locked) {
      lock();
      return unlock; // cleanup on unmount while locked
    } else {
      // ensure unlock if previously locked
      unlock();
    }
  }, [locked]);
}