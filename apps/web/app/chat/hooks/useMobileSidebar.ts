"use client";

import { useEffect, useRef } from "react";

export function useMobileSidebar(
  sidebarOpen: boolean,
  setSidebarOpen: (v: boolean) => void
) {
  const swipeStartX = useRef<number | null>(null);
  const swipeCurrentX = useRef<number | null>(null);
  const swipeSidebarWasOpen = useRef(false);

  // body scroll lock when sidebar open (mobile)
  useEffect(() => {
    if (sidebarOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  // swipe open/close sidebar (mobile)
  useEffect(() => {
    function handleTouchStart(e: TouchEvent) {
      const t = e.touches[0];
      if (!t) return;

      swipeStartX.current = t.clientX;
      swipeCurrentX.current = t.clientX;
      swipeSidebarWasOpen.current = sidebarOpen;
    }

    function handleTouchMove(e: TouchEvent) {
      if (swipeStartX.current == null) return;
      const t = e.touches[0];
      if (!t) return;
      swipeCurrentX.current = t.clientX;
    }

    function handleTouchEnd() {
      if (swipeStartX.current == null || swipeCurrentX.current == null) {
        swipeStartX.current = null;
        swipeCurrentX.current = null;
        return;
      }

      const startX = swipeStartX.current;
      const deltaX = swipeCurrentX.current - swipeStartX.current;
      const THRESHOLD = 60;

      if (!swipeSidebarWasOpen.current) {
        if (startX <= 24 && deltaX > THRESHOLD) setSidebarOpen(true);
      } else {
        if (deltaX < -THRESHOLD) setSidebarOpen(false);
      }

      swipeStartX.current = null;
      swipeCurrentX.current = null;
    }

    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [sidebarOpen, setSidebarOpen]);
}
