"use client";

import { useState } from "react";
import AuthDialog from "@/components/AuthDialog";
import LandingHeader from "./LandingHeader";
import Hero from "./Hero";
import OrchestrationDiagram from "./OrchestrationDiagram";
import AgentCards from "./AgentCards";
import Capabilities from "./Capabilities";
import TrustSection from "./TrustSection";
import CTASection from "./CTASection";
import Footer from "./Footer";
import WaitlistDialog from "./WaitlistDialog";
import { useReveal, revealClass } from "./useReveal";

/**
 * Public marketing landing for logged-out visitors. Owns the sign-in and
 * request-access modals; a successful sign-in is picked up by the auth
 * listener in AuthGate, which swaps this out for the workspace.
 */
export default function LandingPage() {
  const [authOpen, setAuthOpen] = useState(false);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const diagram = useReveal<HTMLDivElement>();

  const openSignIn = () => {
    setWaitlistOpen(false);
    setAuthOpen(true);
  };
  const openWaitlist = () => {
    setAuthOpen(false);
    setWaitlistOpen(true);
  };

  return (
    <div
      id="landing-scroll"
      className="h-dvh overflow-y-auto overflow-x-hidden bg-paper text-ink"
    >
      <LandingHeader onSignIn={openSignIn} onRequestAccess={openWaitlist} />

      <main>
        <Hero onRequestAccess={openWaitlist} onSignIn={openSignIn} />

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
                The orchestrator triages your matter and delegates each step to
                the right specialist — analysis before drafting, validation
                before delivery. Hover any node to see what it does.
              </p>
            </div>
            <div
              className={revealClass(diagram.shown, "mt-12")}
              style={{ transitionDelay: diagram.shown ? "120ms" : undefined }}
            >
              <OrchestrationDiagram />
            </div>
          </div>
        </section>

        <AgentCards />
        <Capabilities />
        <TrustSection />
        <CTASection onRequestAccess={openWaitlist} onSignIn={openSignIn} />
      </main>

      <Footer />

      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
      <WaitlistDialog open={waitlistOpen} onClose={() => setWaitlistOpen(false)} />
    </div>
  );
}
