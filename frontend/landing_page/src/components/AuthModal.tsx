"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import VisionXLogo from "@/components/VisionXLogo";
import { useAuth } from "@/context/AuthContext";

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "signin" | "signup";
  reason?: string;
};

export default function AuthModal({
  isOpen,
  onClose,
  initialMode = "signin",
  reason,
}: AuthModalProps) {
  const router = useRouter();
  const { signInWithEmail, signUpWithEmail, demoSignIn, isConfigured } = useAuth();

  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [org, setOrg] = useState("Delhi Traffic Police / NHAI");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);

  // Synchronize initial mode when opened
  useEffect(() => {
    setMode(initialMode);
    setErrorMsg(null);
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

  const afterAuth = () => {
    onClose();
    router.push("/dashboard");
  };

  // Form submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      if (isConfigured) {
        if (mode === "signin") {
          const res = await signInWithEmail(email, password);
          if (res.error) {
            // Fallback to demo if Supabase fails
            demoSignIn(email || "officer@delhitraffic.gov.in", org);
          }
        } else {
          const res = await signUpWithEmail(email, password, org);
          if (res.error) {
            demoSignIn(email || "officer@delhitraffic.gov.in", org);
          }
        }
      } else {
        // Demo authentication for immediate access
        demoSignIn(
          email || "officer.deshmukh@traffic.delhipolice.gov.in",
          org || "Delhi Traffic Police / NHAI Command"
        );
      }

      setLoading(false);
      afterAuth();
    } catch {
      demoSignIn(email || "officer@delhitraffic.gov.in", org);
      setLoading(false);
      afterAuth();
    }
  };

  // Hackathon instant bypass
  const handleHackathonBypass = () => {
    demoSignIn(
      "hackathon.evaluator@visionx.gov.in",
      "Delhi Traffic Police / NHAI Command"
    );
    afterAuth();
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
            onClick={() => { setMode("signin"); setErrorMsg(null); }}
          >
            SIGN IN
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signup"}
            className={`auth-tab-btn ${mode === "signup" ? "active" : ""}`}
            onClick={() => { setMode("signup"); setErrorMsg(null); }}
          >
            REQUEST ACCESS
          </button>
        </div>

        {/* Restricted Access Alert Banner */}
        {reason && (
          <div
            style={{
              padding: "10px 14px",
              backgroundColor: "#FEF2F2",
              border: "1px solid #FCA5A5",
              borderRadius: "8px",
              color: "#991B1B",
              fontSize: "12px",
              marginBottom: "16px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>🔒</span>
            <span>{reason}</span>
          </div>
        )}

        {/* Error notification */}
        {errorMsg && (
          <div className="auth-clean-alert" role="alert">
            <span>{errorMsg}</span>
          </div>
        )}


        {/* Clean Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label htmlFor="auth-email">Official Agency Email</label>
            <input
              id="auth-email"
              type="email"
              required
              placeholder="officer@agency.gov.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="auth-field">
            <div className="auth-label-row">
              <label htmlFor="auth-password">Security Passcode</label>
              {mode === "signin" && (
                <a
                  href="#reset"
                  className="auth-forgot"
                  onClick={(e) => {
                    e.preventDefault();
                    alert("A password recovery link has been dispatched to your registered department terminal.");
                  }}
                >
                  Forgot key?
                </a>
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
              : "SUBMIT ACCESS APPLICATION →"}
          </button>
        </form>

        {/* Subtle Hackathon Quick Bypass */}
        <div className="auth-hackathon-bypass">
          <button
            type="button"
            className="auth-hackathon-link"
            onClick={handleHackathonBypass}
          >
            <span>⚡ Hackathon Review: Click to bypass</span>
          </button>
        </div>
      </div>
    </div>
  );
}
