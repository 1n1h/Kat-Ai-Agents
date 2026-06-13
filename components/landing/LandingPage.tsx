"use client";

import { useState } from "react";
import AuthDialog from "@/components/AuthDialog";
import LandingHeader from "./LandingHeader";
import Hero from "./Hero";
import PracticeAreas from "./PracticeAreas";
import ToolsShowcase from "./ToolsShowcase";
import OrchestrationShowcase from "./OrchestrationShowcase";
import DeviceScroll from "./DeviceScroll";
import AgentCards from "./AgentCards";
import Capabilities from "./Capabilities";
import TourSection from "./TourSection";
import Testimonials from "./Testimonials";
import CTASection from "./CTASection";
import Footer from "./Footer";
import { useReveal } from "./useReveal";

/**
 * Firm-internal welcome + onboarding page for signed-out visitors. Owns the
 * sign-in modal; a successful sign-in is picked up by the auth listener in
 * AuthGate, which swaps this out for the workspace.
 */
export default function LandingPage() {
  const [authOpen, setAuthOpen] = useState(false);
  const closing = useReveal<HTMLDivElement>();

  const openSignIn = () => setAuthOpen(true);

  return (
    <div
      id="landing-scroll"
      /* the landing is locked to the cream/light palette — `light` overrides
         the global theme for this subtree, so the in-app dark/light toggle
         never affects it — over a faint tessellated paper field. */
      className="light tessellate h-dvh overflow-y-auto overflow-x-hidden text-ink"
    >
      <LandingHeader onSignIn={openSignIn} />

      <main>
        <Hero onSignIn={openSignIn} />

        <PracticeAreas />

        <ToolsShowcase />

        {/* the centerpiece — the orchestration demo on a scroll-tilting device */}
        <DeviceScroll
          title={
            <h2 className="font-serif text-5xl leading-[1.05] text-ink sm:text-6xl">
              Plans, routes, verifies.
            </h2>
          }
        >
          <OrchestrationShowcase />
        </DeviceScroll>

        <AgentCards />
        <Capabilities />
        <TourSection />
        <Testimonials />
      </main>

      {/* closing zone — one translucent footage backdrop behind both the CTA
          card and the footer; fades in (top gradient blends it into the page,
          so there's no hard line) */}
      <div ref={closing.ref} className="relative overflow-hidden">
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-0 z-0 transition-opacity duration-[1200ms] ease-out ${
            closing.shown ? "opacity-100" : "opacity-0"
          }`}
        >
          <video
            className="h-full w-full object-cover"
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
          >
            <source src="/vids/shot44.mp4" type="video/mp4" />
          </video>
          {/* paper tint keeps the card + footer legible over the footage */}
          <div className="absolute inset-0 bg-paper/55" />
          {/* top fade — no hard edge where the page meets the footage */}
          <div
            className="absolute inset-x-0 top-0 h-64"
            style={{
              background:
                "linear-gradient(to bottom, var(--color-paper), transparent)",
            }}
          />
        </div>

        <div className="relative z-10">
          <CTASection onSignIn={openSignIn} />
          <Footer />
        </div>
      </div>

      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
