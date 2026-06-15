"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import "./orchestrationShowcase.css";

/**
 * Cinematic explainer: types a request into the real UI, zooms into the
 * "orchestration layer," walks the request through each specialist agent
 * (plan → analyze → review → draft → cite-check → strategy), then zooms back
 * out to the delivered, verified reply. Auto-loops; static under reduced motion.
 */

const PROMPT =
  "Review this settlement agreement — flag risks, draft a response, verify every citation.";

export default function OrchestrationShowcase() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const q = (s: string) => root.querySelector(s) as HTMLElement | null;
    const qa = (s: string) =>
      Array.from(root.querySelectorAll(s)) as HTMLElement[];
    const tickerText = q("#tickerText");
    const setT = (t: string) => () => {
      if (tickerText) tickerText.textContent = t;
    };

    let tl: gsap.core.Timeline | undefined;

    function typeText(
      timeline: gsap.core.Timeline,
      el: HTMLElement | null,
      text: string,
      dur: number,
    ) {
      if (!el) return;
      const o = { n: 0 };
      timeline.to(o, {
        n: text.length,
        duration: dur,
        ease: "none",
        onUpdate: () => {
          el.textContent = text.slice(0, Math.round(o.n));
        },
      });
    }

    function spotlight(
      timeline: gsap.core.Timeline,
      st: HTMLElement | null,
      ticker: string,
      holdAfter = 0.35,
    ) {
      if (!st) return;
      const spot = st.querySelector(".spot");
      const steps = st.querySelectorAll<HTMLElement>(".step");
      if (ticker) timeline.call(setT(ticker));
      timeline
        .add(() => st.classList.add("lit"))
        .to(spot, { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" });
      steps.forEach((s) => {
        timeline.to(s, { opacity: 1, x: 0, duration: 0.28 }, "+=.12");
        const tickBox = s.querySelector(".tick");
        const tick = s.querySelector(".tick svg path");
        if (tick) {
          const fail = s.classList.contains("failstep");
          const col = fail ? "#c14b38" : "#2e8a55";
          timeline
            .to(
              tickBox,
              { backgroundColor: col, borderColor: col, duration: 0.18 },
              "-=.05",
            )
            .to(tick, { strokeDashoffset: 0, duration: 0.22 }, "<+.05");
        }
        if (s.id === "failstep")
          timeline.fromTo(
            s,
            { x: 0 },
            { x: 3, duration: 0.05, repeat: 5, yoyo: true },
          );
      });
      timeline
        .to(st.querySelector(".out"), { opacity: 1, y: 0, duration: 0.35 }, "+=.1")
        .to({}, { duration: holdAfter })
        .add(() => st.classList.remove("lit"));
    }

    function travel(timeline: gsap.core.Timeline, i: number) {
      const stations = qa(".station");
      const w = stations[0].offsetWidth;
      const vw = (q("#frame") as HTMLElement).offsetWidth;
      const to = (i + 1) * w + w / 2;
      timeline.to(q("#rail"), { x: -(to - vw / 2), duration: 0.9, ease: "power1.inOut" });
      timeline.to(q("#packet"), { x: to, duration: 0.9, ease: "power1.inOut" }, "<");
      timeline.to(
        stations[i].querySelector(".raillit"),
        { scaleX: 1, duration: 0.9, ease: "none" },
        "<",
      );
    }

    function play() {
      if (tl) tl.kill();

      gsap.set(q("#uiScene"), {
        opacity: 1,
        scale: 1,
        filter: "blur(0px)",
        transformOrigin: "58% 56%",
      });
      gsap.set(q("#backend"), { opacity: 0, scale: 0.8, transformOrigin: "50% 45%" });
      const home = q("#homeState");
      const thread = q("#threadState");
      if (home) home.style.display = "flex";
      if (thread) thread.style.display = "none";
      gsap.set(q("#userMsg"), { opacity: 0, y: 8 });
      gsap.set(q("#reply"), { opacity: 0, y: 8 });
      gsap.set(qa(".msg.reply .rl"), { opacity: 0, y: 5 });
      gsap.set(q("#chipV"), { opacity: 0 });
      gsap.set(q("#caret"), { opacity: 1 });
      gsap.set(q("#send"), { scale: 1 });
      gsap.set(q("#attach"), { opacity: 0, y: 6, scale: 0.96 });
      gsap.set(q("#fbarFill"), { width: "0%" });
      gsap.set(q("#fdone"), { opacity: 0, scale: 1 });
      gsap.set(q("#plusBtn"), { scale: 1 });
      const typed = q("#typed");
      if (typed) typed.textContent = "";
      gsap.set(qa(".spot"), { opacity: 0, y: 14 });
      gsap.set(qa(".step"), { opacity: 0, x: -6 });
      gsap.set(qa(".step .tick svg path"), { strokeDashoffset: 14 });
      gsap.set(qa(".step .tick"), { clearProps: "backgroundColor,borderColor" });
      gsap.set(qa(".out"), { opacity: 0, y: 6 });
      gsap.set(qa(".raillit"), { scaleX: 0 });
      qa(".station").forEach((s) => s.classList.remove("lit"));

      const vw = (q("#frame") as HTMLElement).offsetWidth;
      const w = (q("#st0") as HTMLElement).offsetWidth;
      gsap.set(q("#rail"), { x: -(w / 2 - vw / 2) });
      gsap.set(q("#packet"), { x: w / 2, opacity: 0 });

      const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

      tl = gsap.timeline({ delay: 0.5, repeat: -1, repeatDelay: 3.2 });

      /* SCENE 1 · the UI */
      tl.call(setT("LEX"));
      tl.call(setT("ATTACHING DOCUMENT"), undefined, "+=.4")
        .to(q("#plusBtn"), {
          scale: 0.78,
          duration: 0.1,
          yoyo: true,
          repeat: 1,
          transformOrigin: "50% 50%",
        })
        .to(q("#attach"), { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: "back.out(1.6)" }, "+=.15")
        .to(q("#fbarFill"), { width: "100%", duration: 0.8, ease: "power1.inOut" })
        .to(q("#fdone"), { opacity: 1, duration: 0.25 })
        .fromTo(q("#fdone"), { scale: 1.6 }, { scale: 1, duration: 0.25, ease: "back.out(2)" }, "<");
      tl.call(setT("LEX"), undefined, "+=.3");
      typeText(tl, q("#typed"), PROMPT, 2.3);
      tl.to(q("#send"), { scale: 0.85, duration: 0.1, yoyo: true, repeat: 1 }).set(
        q("#caret"),
        { opacity: 0 },
      );

      /* ZOOM IN */
      tl.call(setT("ENTERING THE ORCHESTRATION LAYER"), undefined, "+=.4")
        .to(q("#uiScene"), { scale: 7, opacity: 0, filter: "blur(10px)", duration: 1.1, ease: "power2.in" })
        .to(q("#backend"), { opacity: 1, scale: 1, duration: 1.0, ease: "power2.out" }, "-=.55")
        .to(q("#packet"), { opacity: 1, duration: 0.3 });

      /* AGENT TOUR */
      spotlight(tl, q("#st0"), "ORCHESTRATOR · COMPILING PLAN");
      travel(tl, 0);
      spotlight(tl, q("#st1"), "AGENT 1/5 · LITIGATION ANALYSIS");
      travel(tl, 1);
      spotlight(tl, q("#st2"), "AGENT 2/5 · CONTRACT REVIEW");
      travel(tl, 2);
      spotlight(tl, q("#st3"), "AGENT 3/5 · DRAFTING");
      travel(tl, 3);
      spotlight(tl, q("#st4"), "AGENT 4/5 · AUDITING EVERY CITATION");
      travel(tl, 4);
      spotlight(tl, q("#st5"), "AGENT 5/5 · PRACTICE STRATEGY");

      /* ZOOM OUT → thread */
      tl.call(setT("RETURNING TO YOU"), undefined, "+=.2")
        .to(q("#packet"), { opacity: 0, duration: 0.3 })
        .add(() => {
          if (home) home.style.display = "none";
          if (thread) thread.style.display = "flex";
        })
        .to(q("#backend"), { opacity: 0, scale: 1.25, duration: 0.9, ease: "power2.in" })
        .to(q("#uiScene"), { scale: 1, opacity: 1, filter: "blur(0px)", duration: 1.0, ease: "power2.out" }, "-=.45");

      /* THE REPLY */
      tl.call(setT("DELIVERED · CITED · VERIFIED"))
        .to(q("#userMsg"), { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" })
        .to(q("#reply"), { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" }, "+=.25")
        .to(qa(".msg.reply .rl"), { opacity: 1, y: 0, stagger: 0.25, duration: 0.35 })
        .to(q("#chipV"), { opacity: 1, duration: 0.4 })
        .fromTo(q("#chipV"), { scale: 1.25 }, { scale: 1, duration: 0.3, ease: "back.out(2)" }, "<");

      if (reduce) {
        tl.pause();
        if (home) home.style.display = "none";
        if (thread) thread.style.display = "flex";
        gsap.set(q("#uiScene"), { opacity: 1, scale: 1, filter: "blur(0px)" });
        gsap.set([q("#userMsg"), q("#reply"), ...qa(".msg.reply .rl")], { opacity: 1, y: 0 });
        gsap.set(q("#chipV"), { opacity: 1 });
        if (tickerText) tickerText.textContent = "DELIVERED · CITED · VERIFIED";
      }
    }

    play();

    const replay = q("#replay");
    const onReplay = () => play();
    replay?.addEventListener("click", onReplay);

    let rs: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(rs);
      rs = setTimeout(play, 250);
    };
    window.addEventListener("resize", onResize);

    return () => {
      replay?.removeEventListener("click", onReplay);
      window.removeEventListener("resize", onResize);
      clearTimeout(rs);
      tl?.kill();
    };
  }, []);

  return (
    <div className="cos-orch" ref={rootRef}>
      <div className="frame" id="frame">
        {/* BACKEND */}
        <div className="backend" id="backend">
          <div className="rail" id="rail">
            <div className="station" id="st0">
              <div className="railline" />
              <div className="raillit" />
              <div className="node">
                <svg viewBox="0 0 24 24">
                  <rect x="9" y="3" width="6" height="5" rx="1" />
                  <rect x="3" y="16" width="6" height="5" rx="1" />
                  <rect x="15" y="16" width="6" height="5" rx="1" />
                  <path d="M12 8v4M12 12H6v4M12 12h6v4" />
                </svg>
              </div>
              <div className="agent-name">
                <div className="n">Orchestrator</div>
                <div className="r">Plans · Routes · Verifies</div>
              </div>
              <div className="spot">
                <div className="what">
                  Reads the request, breaks it into a plan, and routes each piece to
                  the right specialist.
                </div>
                <div className="plan">
                  <div className="step">
                    <span className="num">1</span>assess litigation posture
                  </div>
                  <div className="step">
                    <span className="num">2</span>review every clause
                  </div>
                  <div className="step">
                    <span className="num">3</span>draft the response
                  </div>
                  <div className="step">
                    <span className="num">4</span>audit every citation
                  </div>
                  <div className="step">
                    <span className="num">5</span>recommend strategy
                  </div>
                </div>
                <div className="out">PLAN COMPILED · 5 TASKS ROUTED</div>
              </div>
            </div>

            <div className="station" id="st1">
              <div className="railline" />
              <div className="raillit" />
              <div className="node">
                <svg viewBox="0 0 24 24">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" />
                  <path d="M17.5 14v7M14 17.5h7" />
                </svg>
              </div>
              <div className="agent-name">
                <div className="n">Litigation Analysis</div>
                <div className="r">Specialist</div>
              </div>
              <div className="spot">
                <div className="what">
                  Maps the dispute — claims, defenses, and exposure — before anyone
                  writes a word.
                </div>
                <div className="step">
                  <span className="tick">
                    <svg viewBox="0 0 24 24">
                      <path d="M5 13l5 5L20 7" />
                    </svg>
                  </span>
                  reads pleadings &amp; case facts
                </div>
                <div className="step">
                  <span className="tick">
                    <svg viewBox="0 0 24 24">
                      <path d="M5 13l5 5L20 7" />
                    </svg>
                  </span>
                  maps claims against defenses
                </div>
                <div className="step">
                  <span className="tick">
                    <svg viewBox="0 0 24 24">
                      <path d="M5 13l5 5L20 7" />
                    </svg>
                  </span>
                  scores exposure &amp; leverage
                </div>
                <div className="out">EXPOSURE: MODERATE · LEVERAGE FOUND</div>
              </div>
            </div>

            <div className="station" id="st2">
              <div className="railline" />
              <div className="raillit" />
              <div className="node">
                <svg viewBox="0 0 24 24">
                  <path d="M7 3h10a1 1 0 0 1 1 1v16l-3-2-3 2-3-2-3 2V4a1 1 0 0 1 1-1z" />
                  <path d="M9 8h6M9 12h6" />
                </svg>
              </div>
              <div className="agent-name">
                <div className="n">Contract Review</div>
                <div className="r">Specialist</div>
              </div>
              <div className="spot">
                <div className="what">
                  Hunts risk clause-by-clause and compares every term against
                  precedent.
                </div>
                <div className="step">
                  <span className="tick">
                    <svg viewBox="0 0 24 24">
                      <path d="M5 13l5 5L20 7" />
                    </svg>
                  </span>
                  parses 47 clauses
                </div>
                <div className="step">
                  <span className="tick">
                    <svg viewBox="0 0 24 24">
                      <path d="M5 13l5 5L20 7" />
                    </svg>
                  </span>
                  compares against precedent terms
                </div>
                <div className="step">
                  <span className="tick">
                    <svg viewBox="0 0 24 24">
                      <path d="M5 13l5 5L20 7" />
                    </svg>
                  </span>
                  flags deviations by severity
                </div>
                <div className="out warn">⚠ 3 RISK CLAUSES FLAGGED</div>
              </div>
            </div>

            <div className="station" id="st3">
              <div className="railline" />
              <div className="raillit" />
              <div className="node">
                <svg viewBox="0 0 24 24">
                  <path d="M17 3l4 4L8 20l-5 1 1-5L17 3z" />
                </svg>
              </div>
              <div className="agent-name">
                <div className="n">Drafting</div>
                <div className="r">Specialist</div>
              </div>
              <div className="spot">
                <div className="what">
                  Writes the response in your firm&apos;s voice, built on what Review
                  and Analysis found.
                </div>
                <div className="step">
                  <span className="tick">
                    <svg viewBox="0 0 24 24">
                      <path d="M5 13l5 5L20 7" />
                    </svg>
                  </span>
                  loads firm style &amp; precedents
                </div>
                <div className="step">
                  <span className="tick">
                    <svg viewBox="0 0 24 24">
                      <path d="M5 13l5 5L20 7" />
                    </svg>
                  </span>
                  drafts objections &amp; revisions
                </div>
                <div className="step">
                  <span className="tick">
                    <svg viewBox="0 0 24 24">
                      <path d="M5 13l5 5L20 7" />
                    </svg>
                  </span>
                  inserts supporting authority
                </div>
                <div className="out">RESPONSE DRAFTED · 2 PAGES</div>
              </div>
            </div>

            <div className="station" id="st4">
              <div className="railline" />
              <div className="raillit" />
              <div className="node">
                <svg viewBox="0 0 24 24">
                  <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              </div>
              <div className="agent-name">
                <div className="n">Citation Check</div>
                <div className="r">Specialist</div>
              </div>
              <div className="spot">
                <div className="what">
                  Verifies every authority against real case law. Nothing fabricated
                  gets through.
                </div>
                <div className="step">
                  <span className="tick">
                    <svg viewBox="0 0 24 24">
                      <path d="M5 13l5 5L20 7" />
                    </svg>
                  </span>
                  extracts 12 citations from draft
                </div>
                <div className="step failstep" id="failstep">
                  <span className="tick">
                    <svg viewBox="0 0 24 24">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </span>
                  1 case not found — hallucination caught
                </div>
                <div className="step">
                  <span className="tick">
                    <svg viewBox="0 0 24 24">
                      <path d="M5 13l5 5L20 7" />
                    </svg>
                  </span>
                  replaced with verified authority
                </div>
                <div className="out">12/12 CITATIONS VERIFIED</div>
              </div>
            </div>

            <div className="station" id="st5">
              <div className="railline" />
              <div className="raillit" />
              <div className="node">
                <svg viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M14.5 9.5l-1.5 4-4 1.5 1.5-4 4-1.5z" />
                </svg>
              </div>
              <div className="agent-name">
                <div className="n">Practice Strategy</div>
                <div className="r">Specialist</div>
              </div>
              <div className="spot">
                <div className="what">
                  Turns everything upstream into a recommendation you can act on.
                </div>
                <div className="step">
                  <span className="tick">
                    <svg viewBox="0 0 24 24">
                      <path d="M5 13l5 5L20 7" />
                    </svg>
                  </span>
                  weighs exposure vs. leverage
                </div>
                <div className="step">
                  <span className="tick">
                    <svg viewBox="0 0 24 24">
                      <path d="M5 13l5 5L20 7" />
                    </svg>
                  </span>
                  ranks paths: counter · settle · litigate
                </div>
                <div className="step">
                  <span className="tick">
                    <svg viewBox="0 0 24 24">
                      <path d="M5 13l5 5L20 7" />
                    </svg>
                  </span>
                  writes the recommendation
                </div>
                <div className="out">RECOMMEND: COUNTER · REVISED §8.2, §11.4, §14.1</div>
              </div>
            </div>

            <div className="packet" id="packet">
              <div className="paper">
                <i />
                <i />
                <i />
              </div>
            </div>
          </div>
        </div>

        {/* THE REAL UI */}
        <div className="ui-scene" id="uiScene">
          <div className="sidebar">
            <div className="logo">
              <b>Le</b>
              <span>x</span>
            </div>
            <div className="side-item">
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v8M8 12h8" />
              </svg>
              New thread
            </div>
            <div className="side-item">
              <svg viewBox="0 0 24 24">
                <rect x="3" y="7" width="18" height="13" rx="2" />
                <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              Cases
            </div>
            <div className="side-sub">General</div>
            <div className="side-sub active">Sam v T</div>
            <div className="side-item" style={{ marginTop: 6 }}>
              <svg viewBox="0 0 24 24">
                <path d="M9 6v12M15 6v12M9 12h6" />
                <circle cx="9" cy="6" r="2" />
                <circle cx="15" cy="18" r="2" />
              </svg>
              Connectors
            </div>
            <div className="side-label">Recents</div>
            <div className="side-empty">No threads yet in this case.</div>
            <div className="side-foot">
              <div className="avatar">O</div>
              <div>
                <div className="un">Oirazan Marganon</div>
                <div className="st">Signed in</div>
              </div>
            </div>
          </div>

          <div className="main">
            <div className="crumb">
              SAM V T / NEW THREAD &nbsp;·&nbsp; <b>ORCHESTRATED</b>
            </div>

            {/* home state */}
            <div className="home" id="homeState">
              <div className="greet">Working late, Oirazan.</div>
              <div className="composer" id="composer">
                <div className="attach" id="attach">
                  <div className="fico">PDF</div>
                  <div className="fmeta">
                    <div className="fname">Settlement_Agreement.pdf</div>
                    <div className="fsub">
                      <span className="fsize">2.4 MB</span>
                      <span className="fbar">
                        <i id="fbarFill" />
                      </span>
                      <span className="fdone" id="fdone">
                        ✓
                      </span>
                    </div>
                  </div>
                </div>
                <div className="field">
                  <span id="typed" />
                  <span className="cos-caret" id="caret" />
                </div>
                <div className="row">
                  <div className="plus" id="plusBtn">
                    +
                  </div>
                  <div className="grow" />
                  <div className="model">
                    Orchestrator{" "}
                    <svg viewBox="0 0 24 24">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </div>
                  <div className="cicon">
                    <svg viewBox="0 0 24 24">
                      <rect x="9" y="3" width="6" height="11" rx="3" />
                      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
                    </svg>
                  </div>
                  <div className="cicon">
                    <svg viewBox="0 0 24 24">
                      <path d="M4 10v4M8 7v10M12 4v16M16 7v10M20 10v4" />
                    </svg>
                  </div>
                  <div className="send-up" id="send">
                    <svg viewBox="0 0 24 24">
                      <path d="M12 19V5M5 12l7-7 7 7" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="chips">
                <div className="chip">
                  <svg viewBox="0 0 24 24">
                    <path d="M14 4l6 6-9 9H5v-6l9-9z" />
                  </svg>
                  Demand letter
                </div>
                <div className="chip">
                  <svg viewBox="0 0 24 24">
                    <path d="M12 3v18M5 7l7-4 7 4M3 13l2-6 2 6a3 3 0 0 1-4 0zM17 13l2-6 2 6a3 3 0 0 1-4 0z" />
                  </svg>
                  Spot missing clauses
                </div>
                <div className="chip">
                  <svg viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="7" />
                    <path d="M21 21l-4.3-4.3" />
                  </svg>
                  Find contradictions
                </div>
                <div className="chip">
                  <span className="em gm">M</span>From Gmail
                </div>
                <div className="chip">
                  <span className="em dr">▲</span>From Drive
                </div>
                <div className="chip">
                  <span className="em cal">▦</span>From Calendar
                </div>
              </div>
            </div>

            {/* thread state */}
            <div className="thread" id="threadState">
              <div className="msg user" id="userMsg">
                <div className="msg-attach">
                  <span className="mfico">PDF</span>Settlement_Agreement.pdf
                </div>
                Review this settlement agreement — flag risks, draft a response,
                verify every citation.
              </div>
              <div className="msg reply" id="reply">
                <div className="rh">Lex · Orchestrator</div>
                <div className="rl">
                  <span>01</span>3 risk clauses flagged — severity ranked (§8.2,
                  §11.4, §14.1)
                </div>
                <div className="rl">
                  <span>02</span>Draft response ready, firm style applied
                </div>
                <div className="rl">
                  <span>03</span>Strategy: counter with revised terms — full memo
                  attached
                </div>
                <div className="chip-verified" id="chipV">
                  ✓ EVERY CITATION VERIFIED · 12/12
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="ticker">
          <div className="ticker-box">
            <span id="tickerText">LEX</span>
            <span className="cursor" />
          </div>
        </div>
        <button className="replay" id="replay" type="button">
          ↻ Replay
        </button>
      </div>
    </div>
  );
}
