"use client";

import { useState, useEffect, useRef } from "react";
import VisionXLogo from "@/components/VisionXLogo";

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "signin" | "signup";
};

export default function AuthModal({
  isOpen,
  onClose,
  initialMode = "signin",
}: AuthModalProps) {
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [org, setOrg] = useState("Delhi Traffic Police / NHAI");
  const [submitted, setSubmitted] = useState(false);
  const modalRef = useRef<HTMLDivElement | null>(null);

  // Synchronize initial mode when opened
  useEffect(() => {
    setMode(initialMode);
    setSubmitted(false);
  }, [initialMode, isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      alert(
        `Welcome to VisionX Roadway Intelligence, ${email || "Officer"}!\n\nAuthenticated under ${org}.\nRedirecting to dispatch telemetric feed...`
      );
      setSubmitted(false);
      onClose();
    }, 900);
  };

  return (
    <div
      className="auth-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="VisionX Authentication Portal"
    >
      <div
        className="auth-modal-card"
        onClick={(e) => e.stopPropagation()}
        ref={modalRef}
      >
        {/* Header with Logo & Close */}
        <div className="auth-modal-header">
          <VisionXLogo size="md" />
          <button
            type="button"
            className="auth-close-btn"
            onClick={onClose}
            aria-label="Close authentication modal"
          >
            ✕
          </button>
        </div>

        {/* Mode Toggle Switch */}
        <div className="auth-tab-switch" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signin"}
            className={`auth-tab-btn ${mode === "signin" ? "active" : ""}`}
            onClick={() => setMode("signin")}
          >
            SIGN IN
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signup"}
            className={`auth-tab-btn ${mode === "signup" ? "active" : ""}`}
            onClick={() => setMode("signup")}
          >
            REQUEST ACCESS
          </button>
        </div>

        {/* Subhead info */}
        <div className="auth-subhead">
          <h3>
            {mode === "signin"
              ? "Access Roadway Control Room"
              : "Register Department Credentials"}
          </h3>
          <p>
            {mode === "signin"
              ? "Enter your municipal or law enforcement credentials to access live camera telemetry."
              : "Provision new operator seat for automated ANPR surveillance and trajectory dispatch."}
          </p>
        </div>

        {/* OAuth 1-Click Buttons */}
        <div className="auth-oauth-group">
          <button
            type="button"
            className="auth-oauth-btn"
            onClick={() => {
              alert("Signing in via Government Single Sign-On (SSO / DigiLocker)...");
              onClose();
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z" />
            </svg>
            <span>Continue with Gov-SSO (Parivahan / NIC)</span>
          </button>
        </div>

        {/* Divider */}
        <div className="auth-divider">
          <span>OR WORK EMAIL</span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label htmlFor="auth-email">Official Agency Email</label>
            <input
              id="auth-email"
              type="email"
              required
              placeholder="officer@traffic.gov.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="auth-field">
            <div className="auth-label-row">
              <label htmlFor="auth-password">Security Passcode</label>
              {mode === "signin" && (
                <a href="#reset" onClick={(e) => { e.preventDefault(); alert("Recovery link dispatched to registered department terminal."); }} className="auth-forgot">
                  Forgot key?
                </a>
              )}
            </div>
            <input
              id="auth-password"
              type="password"
              required
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
            />
          </div>

          {mode === "signup" && (
            <div className="auth-field">
              <label htmlFor="auth-org">Jurisdiction / Agency</label>
              <select
                id="auth-org"
                value={org}
                onChange={(e) => setOrg(e.target.value)}
              >
                <option value="Delhi Traffic Police / NHAI">Delhi Traffic Police / NHAI</option>
                <option value="Mumbai Metropolitan Traffic HQ">Mumbai Metropolitan Traffic HQ</option>
                <option value="Bengaluru Smart City ITS">Bengaluru Smart City ITS</option>
                <option value="National Highway Authority of India">National Highway Authority of India</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={submitted}
          >
            {submitted
              ? "AUTHENTICATING TELEMETRY..."
              : mode === "signin"
              ? "LAUNCH OPERATOR PORTAL →"
              : "SUBMIT ACCESS APPLICATION →"}
          </button>
        </form>
      </div>
    </div>
  );
}
