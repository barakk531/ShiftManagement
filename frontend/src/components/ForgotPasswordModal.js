import React, { useEffect, useMemo, useState } from "react";
import styles from "./EmailVerificationModal.module.css"; // reuse same styling

function formatMMSS(totalSeconds) {
  const m = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const s = String(totalSeconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export default function ForgotPasswordModal({ isOpen, onClose }) {
  const [step, setStep] = useState("email"); // "email" | "reset"
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [secondsLeft, setSecondsLeft] = useState(300);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const timerText = useMemo(() => formatMMSS(secondsLeft), [secondsLeft]);

  useEffect(() => {
    if (!isOpen) return;

    // reset when opened
    setStep("email");
    setEmail("");
    setCode("");
    setNewPassword("");
    setConfirmNewPassword("");
    setError("");
    setSecondsLeft(300);
    setIsLoading(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (step !== "reset") return;
    if (secondsLeft <= 0) return;

    const t = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [isOpen, step, secondsLeft]);

  if (!isOpen) return null;

  async function sendResetCode() {
    setError("");
    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("http://localhost:8080/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.message || "Failed to send reset email.");
        return;
      }

      setSecondsLeft(data?.expiresInSeconds || 300);
      setStep("reset");
    } catch (e) {
      setError("Failed to send reset email.");
    } finally {
      setIsLoading(false);
    }
  }

  async function resendCode() {
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch("http://localhost:8080/auth/resend-forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.message || "Failed to resend code.");
        return;
      }

      setSecondsLeft(data?.expiresInSeconds || 300);
    } catch (e) {
      setError("Failed to resend code.");
    } finally {
      setIsLoading(false);
    }
  }

  async function resetPassword() {
    setError("");

    if (code.trim().length !== 6) {
      setError("Please enter the 6-digit code.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("http://localhost:8080/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          code: code.trim(),
          newPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.message || "Failed to reset password.");
        return;
      }

      onClose(); // close modal
    } catch (e) {
      setError("Failed to reset password.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={styles.backdrop} onMouseDown={onClose}>
      <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>Reset password</div>
            <div style={{ opacity: 0.75, marginTop: 4 }}>
              {step === "email"
                ? "Enter your email to receive a 6-digit reset code."
                : "Check your email and enter the code + your new password."}
            </div>
          </div>

          <button className={styles.xBtn} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {step === "email" && (
          <>
            <div style={{ marginTop: 14 }}>
              <label>Email</label>
              <input
                className={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                autoComplete="email"
              />
            </div>

            <div className={styles.actions}>
              <button className={styles.primaryBtn} onClick={sendResetCode} disabled={isLoading}>
                {isLoading ? "Sending..." : "Send reset code"}
              </button>
              <button className={styles.secondaryBtn} onClick={onClose} disabled={isLoading}>
                Cancel
              </button>
            </div>
          </>
        )}

        {step === "reset" && (
          <>
            <div className={styles.timerRow}>
              <span style={{ marginRight: 10, opacity: 0.75 }}>Time left</span>
              <span style={{ fontWeight: 800, fontSize: 22 }}>{timerText}</span>
            </div>

            <div style={{ marginTop: 14 }}>
              <label>6-digit code</label>
              <input
                className={styles.input}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Enter 6-digit code"
                inputMode="numeric"
              />
            </div>

            <div style={{ marginTop: 12 }}>
              <label>New password</label>
              <input
                className={styles.input}
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            <div style={{ marginTop: 12 }}>
              <label>Confirm new password</label>
              <input
                className={styles.input}
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            <div className={styles.actions}>
              <button className={styles.primaryBtn} onClick={resetPassword} disabled={isLoading}>
                {isLoading ? "Resetting..." : "Reset password"}
              </button>
              <button className={styles.secondaryBtn} onClick={resendCode} disabled={isLoading}>
                Resend code
              </button>
            </div>
          </>
        )}

        {error && <div className={styles.error}>{error}</div>}
      </div>
    </div>
  );
}
