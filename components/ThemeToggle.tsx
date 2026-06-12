"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

/** Dark is the system default; the toggle opts into the light paper theme. */
export default function ThemeToggle() {
  const [light, setLight] = useState(false);

  useEffect(() => {
    setLight(document.documentElement.classList.contains("light"));
  }, []);

  function toggle() {
    const next = !light;
    setLight(next);
    document.documentElement.classList.toggle("light", next);
    try {
      localStorage.setItem("counselos.theme", next ? "light" : "dark");
    } catch {
      /* private mode */
    }
  }

  return (
    <button
      onClick={toggle}
      data-tour="theme"
      title={light ? "Switch to dark mode" : "Switch to light mode"}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:border-line-strong hover:text-ink"
    >
      {light ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </button>
  );
}
