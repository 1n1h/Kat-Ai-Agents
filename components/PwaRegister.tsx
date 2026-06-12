"use client";

import { useEffect } from "react";

/**
 * Registers the service worker so the app is installable as a standalone
 * desktop/mobile app. Mounted once from the root layout. No-op on the server
 * and on browsers without service-worker support.
 */
export default function PwaRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* installability is a progressive enhancement; ignore failures */
      });
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
