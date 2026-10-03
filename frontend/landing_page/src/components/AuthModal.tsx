"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import VisionXLogo from "@/components/VisionXLogo";
import { useAuth } from "@/context/AuthContext";

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
  const router = useRouter();
  const { signInWithEmail, signUpWithEmail, demoSignIn, isConfigured } = useAuth();

  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [org, setOrg] = useState("Delhi Traffic Police / NHAI");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);

  // Synchronize initial mode when opened
  useEffect(() => {
    setMode(initialMode);
    setErrorMsg(null);
    setInfoMsg(null);
    setLoading(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    setLoading(true);

    if (mode === "signin") {
      const res = await signInWithEmail(email, password);
      if (res.error) {
        setLoading(false);
        setErrorMsg(res.error);
        return;
      }
      setLoading(false);
      onClose();
      router.push("/dashboard");
    } else {
      const res = await signUpWithEmail(email, password, org);
      if (res.error) {
        setLoading(false);
        setErrorMsg(res.error);
        return;
      }
      setLoading(false);
      if (res.confirmationRequired) {
        setInfoMsg(
          "Confirmation email dispatched. Please verify your email before signing in, or use Instant Demo Access."
        );
      } else {
        onClose();
        router.push("/dashboard");
      }
    }
  };

  const handleDemoAccess = () => {
    demoSignIn(
      email || "officer.deshmukh@traffic.delhipolice.gov.in",
      org || "Delhi Traffic Police / NHAI Command"
    );
    onClose();
    router.push("/dashboard");
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

        {/* Supabase Status Pill */}
        <div className="auth-status-bar">
          <span className={`status-pill ${isConfigured ? "configured" : "demo"}`}>
            <span className="status-dot" />
            {isConfigured ? "Supabase Cloud Auth Active" : "Supabase Keys Pending · Demo Mode Ready"}
          </span>
        </div>

        {/* Mode Toggle Switch */}
        <div className="auth-tab-switch" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signin"}
            className={`auth-tab-btn ${mode === "signin" ? "active" : ""}`}
            onClick={() => {
              setMode("signin");
              setErrorMsg(null);
            }}
          >
            OFFICER SIGN IN
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signup"}
            className={`auth-tab-btn ${mode === "signup" ? "active" : ""}`}
            onClick={() => {
              setMode("signup");
              setErrorMsg(null);
            }}
          >
            REGISTER SEAT
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
              ? "Enter your verified agency email & password to access real-time ANPR and telemetry."
              : "Provision new operator account with authenticated Supabase credentials."}
          </p>
        </div>

        {/* Error / Info Alerts */}
        {errorMsg && (
          <div className="auth-alert error" role="alert">
            <span className="auth-alert-icon">⚠</span>
            <div className="auth-alert-body">
              <span>{errorMsg}</span>
              {!isConfigured && (
                <button
                  type="button"
                  className="auth-inline-demo-btn"
                  onClick={handleDemoAccess}
                >
                  Click here to bypass with Demo Operator Access →
                </button>
              )}
            </div>
          </div>
        )}

        {infoMsg && (
          <div className="auth-alert info" role="status">
            <span className="auth-alert-icon">ℹ</span>
            <span>{infoMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label htmlFor="auth-email">Official Agency Email</label>
            <input
              id="auth-email"
              type="email"
              required
              placeholder="officer@traffic.delhipolice.gov.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="auth-field">
            <div className="auth-label-row">
              <label htmlFor="auth-password">Security Password</label>
              {mode === "signin" && (
                <span className="auth-hint">Min 6 characters</span>
              )}
            </div>
            <input
              id="auth-password"
              type="password"
              required
              minLength={6}
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
            disabled={loading}
          >
            {loading
              ? "AUTHENTICATING TELEMETRY..."
              : mode === "signin"
              ? "LAUNCH OPERATOR PORTAL →"
              : "CREATE CREDENTIALS & ACCESS →"}
          </button>
        </form>

        {/* 1-Click Demo Shortcut */}
        <div className="auth-demo-footer">
          <div className="auth-divider">
            <span>OR INSTANT REVIEW ACCESS</span>
          </div>
          <button
            type="button"
            className="auth-demo-btn"
            onClick={handleDemoAccess}
          >
            <span className="demo-dot" />
            <span>ENTER AS DEMO LEAD DISPATCHER →</span>
          </button>
          <span className="auth-demo-note">
            Bypasses database lookup for hackathon evaluations & instant review.
          </span>
        </div>
      </div>
    </div>
  );
}
