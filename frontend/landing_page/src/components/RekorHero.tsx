"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import InteractiveCity from "@/components/InteractiveCity";
import AuthModal from "@/components/AuthModal";
import { useAuth } from "@/context/AuthContext";

const ROTATING_DOMAINS = [
  {
    line1: "TRANSPORTATION",
    line2: "MANAGEMENT",
  },
  {
    line1: "ROADWAY",
    line2: "INTELLIGENCE",
  },
  {
    line1: "URBAN",
    line2: "MOBILITY",
  },
  {
    line1: "PUBLIC",
    line2: "SAFETY",
  },
];

type RekorHeroProps = {
  theme?: "light" | "dark";
};

export default function RekorHero({ theme = "light" }: RekorHeroProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  // Auto-rotate every 5.5s unless paused by user interaction
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % ROTATING_DOMAINS.length);
    }, 5500);
    return () => clearInterval(interval);
  }, [isPaused]);

  // Handle ESC key to close video modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (videoModalOpen) setVideoModalOpen(false);
        if (authOpen) setAuthOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [videoModalOpen, authOpen]);

  const router = useRouter();
  const { user, officer } = useAuth();
  const isAuthenticated = Boolean(user || officer);

  const handleLaunch = () => {
    if (isAuthenticated) {
      router.push("/dashboard");
    } else {
      setAuthOpen(true);
    }
  };

  const current = ROTATING_DOMAINS[activeIdx];

  return (
    <header className={`rekor-hero-root theme-${theme}`} id="top">
      {/* ─────── 3D City Background (Interactive Light/Dark) ─────── */}
      <div className="rekor-hero-3d-bg" aria-hidden="true">
        <InteractiveCity theme={theme} mode="hero" />
      </div>

      {/* ─────── Atmospheric Gradient Mask & Vignette ─────── */}
      <div className="rekor-hero-gradient-overlay" aria-hidden="true" />

      {/* ─────── Main Content Shell ─────── */}
      <div className="rekor-hero-container">
        <div className="rekor-hero-copy">
          {/* Eyebrow: SpaceX-style all-caps microtext */}
          <p className="rekor-hero-eyebrow">VISIONX IS</p>

          {/* Large Rotating / Two-line Title promoted to semantic H1 */}
          <div
            className="rekor-hero-headline-wrap"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <h1 className="rekor-hero-headline-lines">
              <span
                key={`line1-${activeIdx}`}
                className="rekor-hero-line line-1"
              >
                {current.line1}
              </span>
              <span
                key={`line2-${activeIdx}`}
                className="rekor-hero-line line-2"
              >
                {current.line2}
              </span>
            </h1>

            {/* Rotator Indicator Dots with accessible touch targets */}
            <div className="rekor-slider-dots" role="tablist" aria-label="Rotating domains">
              {ROTATING_DOMAINS.map((domain, i) => (
                <button
                  key={domain.line1}
                  type="button"
                  role="tab"
                  className={`rekor-dot ${i === activeIdx ? "active" : ""}`}
                  onClick={() => {
                    setActiveIdx(i);
                    setIsPaused(true);
                  }}
                  aria-label={`Show ${domain.line1} ${domain.line2}`}
                  aria-selected={i === activeIdx}
                />
              ))}
            </div>
          </div>

          {/* Hero Paragraph */}
          <p className="rekor-hero-description">
            Using Artificial Intelligence, VisionX collects, connects, and organizes the world’s
            mobility data to deliver revolutionary roadway intelligence — laying the foundation
            for a digital-enabled operating system for the road.
          </p>

          {/* Action CTAs */}
          <div className="rekor-hero-actions">
            <button
              type="button"
              className="rekor-launch-hero-btn"
              onClick={handleLaunch}
              aria-label={isAuthenticated ? "Enter Operator Control Room" : "Launch VisionX platform"}
            >
              <span>{isAuthenticated ? "OPEN CONTROL ROOM" : "LAUNCH VISIONX"}</span>
              <span className="launch-hero-arrow" aria-hidden="true">→</span>
            </button>

            <a href="#about" className="rekor-learn-more-link">
              <span>LEARN ABOUT VISIONX</span>
              <span className="arrow-glyph" aria-hidden="true">↓</span>
            </a>
          </div>
        </div>
      </div>

      {/* Auth Modal Triggered from Hero */}
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </header>
  );
}
