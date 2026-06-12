"use client";

import { useEffect } from "react";
import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";

/**
 * One-time guided walkthrough (Driver.js). Runs only the first time a user
 * reaches the workspace on this device — the completion flag is persisted in
 * localStorage, so it never repeats on later logins.
 *
 * The popovers are deliberately styled as light "vanilla" cards (see the
 * .counselos-tour rules in globals.css) so they read clearly in dark mode too.
 */

const FLAG = "counselos.tour.v1";

const isMobile = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(max-width: 767px)").matches;

type Intent = "sidebar" | "composer";

interface Step extends DriveStep {
  /** which surface must be visible for this step's element */
  intent?: Intent;
}

export default function Tour({
  setSidebarOpen,
}: {
  setSidebarOpen: (open: boolean) => void;
}) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (localStorage.getItem(FLAG)) return;
    } catch {
      return; // storage blocked — skip rather than nag every load
    }

    const markDone = () => {
      try {
        localStorage.setItem(FLAG, "1");
      } catch {
        /* ignore */
      }
    };

    // sidebar steps need the drawer open; composer steps need it out of the
    // way on mobile (on desktop the sidebar is in-flow, so keep it open).
    const showSurface = (intent?: Intent) => {
      if (intent === "composer") setSidebarOpen(!isMobile() ? true : false);
      else setSidebarOpen(true);
    };

    const define = (s: Step): DriveStep => ({
      element: s.element,
      popover: s.popover,
      onHighlightStarted: () => showSurface(s.intent),
    });

    const raw: Step[] = [
      {
        popover: {
          title: "Welcome to the firm's AI workspace",
          description:
            "A 30-second tour of the essentials. You can skip any time, and you'll only see this once.",
        },
      },
      {
        element: '[data-tour="threads"]',
        intent: "sidebar",
        popover: {
          title: "Your chats",
          description:
            "Every conversation lives here. Hover a chat and click the ⋮ to rename, star, move it to a case, or delete it.",
          side: "right",
          align: "start",
        },
      },
      {
        element: '[data-tour="new-case"]',
        intent: "sidebar",
        popover: {
          title: "Organize by case",
          description:
            "Group a matter's chats and files together. Tap + beside Cases to start a new one — each case keeps its documents isolated.",
          side: "right",
          align: "start",
        },
      },
      {
        element: '[data-tour="connectors"]',
        intent: "sidebar",
        popover: {
          title: "Connect your tools",
          description:
            "Bring Gmail, Drive, Calendar, Slack and more into a case so the agents can work from your firm's systems.",
          side: "right",
          align: "start",
        },
      },
      {
        element: '[data-tour="profile"]',
        intent: "sidebar",
        popover: {
          title: "Settings & account",
          description:
            "Open Settings, manage connectors, switch light or dark mode, get help, or sign out — all from your profile.",
          side: "top",
          align: "start",
        },
      },
      {
        element: '[data-tour="upload"]',
        intent: "composer",
        popover: {
          title: "Add documents",
          description:
            "Tap + to upload depositions, contracts, and discovery into the case — or pull them from a connected source. You can also drag files straight in.",
          side: "top",
          align: "start",
        },
      },
      {
        element: '[data-tour="agent"]',
        intent: "composer",
        popover: {
          title: "Choose a specialist",
          description:
            "Let the Orchestrator route your request automatically, or pick a specialist directly — litigation, contracts, drafting, citation check, or strategy.",
          side: "top",
          align: "end",
        },
      },
      {
        element: '[data-tour="suggestions"]',
        intent: "composer",
        popover: {
          title: "Quick starts",
          description:
            "Not sure where to begin? Tap a suggestion below the input — draft a demand letter, build a timeline, review a contract, and more — to prefill a strong prompt.",
          side: "top",
          align: "center",
        },
      },
      {
        element: '[data-tour="theme"]',
        intent: "composer",
        popover: {
          title: "Light or dark",
          description:
            "Prefer a brighter workspace? Tap here any time to switch between light and dark mode — your choice is remembered.",
          side: "bottom",
          align: "end",
        },
      },
      {
        popover: {
          title: "You're all set",
          description:
            "Ask a question to begin. Need this again? It's a one-time tour, but everything's a tap away in the sidebar.",
        },
      },
    ];

    // keep element steps only when the target is actually in the DOM
    const steps = raw
      .filter((s) => !s.element || document.querySelector(s.element as string))
      .map(define);

    const d = driver({
      showProgress: true,
      popoverClass: "counselos-tour",
      overlayColor: "#0b0b0a",
      overlayOpacity: 0.62,
      stagePadding: 6,
      stageRadius: 14,
      nextBtnText: "Next",
      prevBtnText: "Back",
      doneBtnText: "Got it",
      steps,
      onDestroyed: () => {
        markDone();
        if (isMobile()) setSidebarOpen(false);
      },
    });

    setSidebarOpen(true);
    // let the workspace paint (and the drawer settle) before measuring
    const t = setTimeout(() => d.drive(), 650);
    return () => {
      clearTimeout(t);
      if (d.isActive()) d.destroy();
    };
  }, [setSidebarOpen]);

  return null;
}
