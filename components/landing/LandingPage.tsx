"use client";

import { useState } from "react";
import AuthDialog from "@/components/AuthDialog";
import LandingHeader from "./LandingHeader";
import Hero from "./Hero";
import OrchestrationShowcase from "./OrchestrationShowcase";
import AgentCards from "./AgentCards";
import Capabilities from "./Capabilities";
import TourSection from "./TourSection";
import GetStarted from "./GetStarted";
import CTASection from "./CTASection";
import Footer from "./Footer";
import { useReveal, revealClass } from "./useReveal";

/**
 * Firm-internal welcome + onboarding page for signed-out visitors. Owns the
 * sign-in modal; a successful sign-in is picked up by the auth listener in
 * AuthGate, which swaps this out for the workspace.
 */
export default function LandingPage() {
  const [authOpen, setAuthOpen] = useState(false);
  const diagram = useReveal<HTMLDivElement>();

  const openSignIn = () => setAuthOpen(true);

  return (
    <div
      id="landing-scroll"
      className="h-dvh overflow-y-auto overflow-x-hidden bg-paper text-ink"
    >
      <LandingHeader onSignIn={openSignIn} />

      <main>
        <Hero onSignIn={openSignIn} />

        {/* the centerpiece */}
        <section className="px-6 py-20 sm:py-28">
          <div ref={diagram.ref} className="mx-auto max-w-5xl">
            <div className={revealClass(diagram.shown)}>
              <p className="text-center font-mono text-[11px] tracking-[0.28em] text-accent uppercase">
                One conversation. A whole team behind it.
              </p>
              <h2 className="mx-auto mt-4 max-w-2xl text-center font-serif text-3xl leading-tight text-ink sm:text-4xl">
                You speak to the orchestrator. It runs the rest.
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-center text-[15.5px] leading-relaxed text-ink-soft">
                Watch one request move through the orchestration layer — planned,
                routed to each specialist, drafted, and citation-checked before it
                returns to you.
              </p>
            </div>
            <div
              className={revealClass(diagram.shown, "mt-12")}
              style={{ transitionDelay: diagram.shown ? "120ms" : undefined }}
            >
              <OrchestrationShowcase />
            </div>
          </div>
        </section>

        <AgentCards />
        <Capabilities />
        <TourSection />
        <GetStarted onSignIn={openSignIn} />
        <CTASection onSignIn={openSignIn} />
      </main>

      <Footer />

      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
