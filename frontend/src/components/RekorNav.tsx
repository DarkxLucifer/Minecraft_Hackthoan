"use client";

import { useState, useEffect, useRef } from "react";
import VisionXLogo from "@/components/VisionXLogo";
import AccessibilityIcon from "@/components/AccessibilityIcon";

type RekorNavProps = {
  theme?: "light" | "dark";
};

export default function RekorNav({ theme = "light" }: RekorNavProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Accessibility settings state
  const [highContrast, setHighContrast] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close menus on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
        setAccessOpen(false);
        setContactOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <nav
        className={`rekor-navbar theme-${theme} ${scrolled ? "scrolled" : ""} ${
          highContrast ? "high-contrast" : ""
        } ${largeText ? "large-text" : ""}`}
        aria-label="Main Navigation"
      >
        <div className="rekor-nav-container">
          {/* Logo */}
          <a href="#top" className="rekor-brand-link" aria-label="VisionX Home">
            <VisionXLogo size="md" />
          </a>

          {/* Center Navigation Links - Direct clean links, no dropdowns */}
          <div className="rekor-nav-menu desktop-only">
            <a href="#demo" className="rekor-nav-link">
              Solutions
            </a>
            <a href="#insights" className="rekor-nav-link">
              Resources
            </a>
            <a href="#pipeline" className="rekor-nav-link">
              Company
            </a>
            <a href="#dashboard" className="rekor-nav-link">
              Dashboard
            </a>
          </div>

          {/* Right Action Buttons */}
          <div className="rekor-nav-actions">
            <button
              type="button"
              className="rekor-contact-btn"
              onClick={() => setContactOpen(true)}
            >
              Contact Us
            </button>

            <button
              type="button"
              className="rekor-access-btn"
              aria-label="Accessibility options"
              title="Accessibility Menu"
              onClick={() => setAccessOpen((v) => !v)}
            >
              <AccessibilityIcon width="20" height="20" />
            </button>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              className="rekor-mobile-toggle mobile-only"
              aria-label="Toggle mobile menu"
              onClick={() => setMobileMenuOpen((v) => !v)}
            >
              <span className={`bar ${mobileMenuOpen ? "open" : ""}`} />
              <span className={`bar ${mobileMenuOpen ? "open" : ""}`} />
            </button>
          </div>
        </div>

        {/* Mobile Slide-down Menu */}
        {mobileMenuOpen && (
          <div className="rekor-mobile-drawer">
            <div className="rekor-mobile-links">
              <a href="#demo" onClick={() => setMobileMenuOpen(false)}>Solutions</a>
              <a href="#insights" onClick={() => setMobileMenuOpen(false)}>Resources</a>
              <a href="#pipeline" onClick={() => setMobileMenuOpen(false)}>Company</a>
              <a href="#dashboard" onClick={() => setMobileMenuOpen(false)}>Dashboard</a>
              <button
                type="button"
                className="rekor-contact-btn mobile-full"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setContactOpen(true);
                }}
              >
                Contact Us
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Accessibility Popover */}
      {accessOpen && (
        <div className="rekor-access-modal-overlay" onClick={() => setAccessOpen(false)}>
          <div
            className="rekor-access-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="access-title"
          >
            <div className="access-modal-head">
              <div className="access-head-title">
                <AccessibilityIcon width="22" height="22" />
                <h3 id="access-title">Accessibility Preferences</h3>
              </div>
              <button
                type="button"
                className="access-close-btn"
                onClick={() => setAccessOpen(false)}
                aria-label="Close accessibility menu"
              >
                ✕
              </button>
            </div>

            <div className="access-modal-body">
              <label className="access-toggle-row">
                <div className="toggle-info">
                  <strong>High Contrast Mode</strong>
                  <span>Increases border strength and text contrast for low vision</span>
                </div>
                <input
                  type="checkbox"
                  checked={highContrast}
                  onChange={(e) => setHighContrast(e.target.checked)}
                />
              </label>

              <label className="access-toggle-row">
                <div className="toggle-info">
                  <strong>Large Display Font</strong>
                  <span>Enlarges navigation and hero paragraph typography</span>
                </div>
                <input
                  type="checkbox"
                  checked={largeText}
                  onChange={(e) => setLargeText(e.target.checked)}
                />
              </label>

              <label className="access-toggle-row">
                <div className="toggle-info">
                  <strong>Pause Micro-Animations</strong>
                  <span>Reduces rotational motion and pulsing indicator effects</span>
                </div>
                <input
                  type="checkbox"
                  checked={reducedMotion}
                  onChange={(e) => setReducedMotion(e.target.checked)}
                />
              </label>
            </div>

            <div className="access-modal-foot">
              <button
                type="button"
                className="access-reset-btn"
                onClick={() => {
                  setHighContrast(false);
                  setLargeText(false);
                  setReducedMotion(false);
                }}
              >
                Reset Default
              </button>
              <button
                type="button"
                className="access-done-btn"
                onClick={() => setAccessOpen(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contact / Book Demo Modal */}
      {contactOpen && (
        <div className="rekor-contact-modal-overlay" onClick={() => setContactOpen(false)}>
          <div
            className="rekor-contact-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="contact-title"
          >
            <div className="contact-modal-head">
              <div>
                <span className="contact-kicker">VISIONX MOBILITY INTELLIGENCE</span>
                <h3 id="contact-title">Connect with VisionX Intelligence Experts</h3>
              </div>
              <button
                type="button"
                className="access-close-btn"
                onClick={() => setContactOpen(false)}
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            <form
              className="contact-modal-form"
              onSubmit={(e) => {
                e.preventDefault();
                alert("Thank you! A VisionX roadway intelligence specialist will contact you shortly.");
                setContactOpen(false);
              }}
            >
              <div className="form-group-row">
                <div className="form-group">
                  <label htmlFor="c-fname">First Name *</label>
                  <input id="c-fname" type="text" required placeholder="Jane" defaultValue="Sarah" />
                </div>
                <div className="form-group">
                  <label htmlFor="c-lname">Last Name *</label>
                  <input id="c-lname" type="text" required placeholder="Doe" defaultValue="Connor" />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="c-email">Work Email *</label>
                <input id="c-email" type="email" required placeholder="name@agency.gov" defaultValue="s.connor@dot.state.gov" />
              </div>

              <div className="form-group">
                <label htmlFor="c-org">Agency / Organization *</label>
                <input id="c-org" type="text" required placeholder="Department of Transportation or Agency" defaultValue="State Dept of Transportation" />
              </div>

              <div className="form-group">
                <label htmlFor="c-interest">Primary Area of Interest</label>
                <select id="c-interest" defaultValue="Transportation Management">
                  <option value="Transportation Management">Transportation Management</option>
                  <option value="Roadway Intelligence">Roadway Intelligence</option>
                  <option value="Urban Mobility">Urban Mobility</option>
                  <option value="Public Safety">Public Safety & ALPR</option>
                  <option value="Hardware / Edge Pro">Hardware & Solar Sensors</option>
                </select>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setContactOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="rekor-contact-btn submit-btn">
                  Submit Request →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
