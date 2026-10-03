"use client";

import { useState, useEffect } from "react";
import InteractiveCity from "@/components/InteractiveCity";

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
      if (e.key === "Escape" && videoModalOpen) {
        setVideoModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [videoModalOpen]);

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

          {/* Large Rotating / Two-line Title in Uppercase D-DIN / Inter */}
          <div
            className="rekor-hero-headline-wrap"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <div className="rekor-hero-headline-lines">
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
            </div>

            {/* Rotator Indicator Dots */}
            <div className="rekor-slider-dots" role="tablist" aria-label="Rotating domains">
              {ROTATING_DOMAINS.map((domain, i) => (
                <button
                  key={domain.line1}
                  type="button"
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

          {/* Action CTAs: SpaceX Ghost Pill on Light */}
          <div className="rekor-hero-actions">
            <button
              type="button"
              className="rekor-video-pill-btn"
              onClick={() => setVideoModalOpen(true)}
              aria-label="Watch the VisionX platform overview video"
            >
              <span className="play-icon-disc">
                <svg
                  viewBox="0 0 24 24"
                  className="play-icon-tri"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
              <span className="btn-label">SEE THE VISIONX DIFFERENCE</span>
            </button>

            <a href="#insights" className="rekor-learn-more-link">
              <span>LEARN ABOUT VISIONX</span>
              <span className="arrow-glyph" aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </div>

      {/* ─────── Video Lightbox Modal ─────── */}
      {videoModalOpen && (
        <div
          className="rekor-video-modal-overlay"
          onClick={() => setVideoModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="VisionX Video Player"
        >
          <div
            className="rekor-video-modal-box"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rekor-video-modal-top">
              <div className="rekor-modal-title">
                <span className="pill">OVERVIEW</span>
                <span>VisionX · Roadway Intelligence Operating System</span>
              </div>
              <button
                type="button"
                className="rekor-video-close-btn"
                onClick={() => setVideoModalOpen(false)}
                aria-label="Close video player"
              >
                ✕
              </button>
            </div>

            <div className="rekor-video-embed-wrap">
              <iframe
                src="https://player.vimeo.com/video/599565219?autoplay=1&title=0&byline=0&portrait=0"
                title="VisionX - Delivering Revolutionary Roadway Intelligence"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
