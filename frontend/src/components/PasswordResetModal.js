

import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './PasswordResetModal.module.css';

const RESEND_SECONDS = 5 * 60; // 5 minutes

function formatMMSS(totalSeconds) {
  const m = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const s = String(totalSeconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export default function PasswordResetModal({ open, onClose }) {
  const [step, setStep] = useState('request'); // request | verify | reset | success
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const timerRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const canSendCode = useMemo(() => {
    return email.trim().length > 3 && email.includes('@') && !loading;
  }, [email, loading]);

  const canVerify = useMemo(() => {
    return code.trim().length === 6 && !loading;
  }, [code, loading]);

  const canUpdatePassword = useMemo(() => {
    return (
      code.trim().length === 6 &&
      newPassword.length >= 8 &&
      confirmNewPassword.length >= 8 &&
      newPassword === confirmNewPassword &&
      !loading
    );
  }, [code, newPassword, confirmNewPassword, loading]);

  useEffect(() => {
    if (!open) return;

    // reset state on open
    setStep('request');
    setEmail('');
    setCode('');
    setNewPassword('');
    setConfirmNewPassword('');
    setSecondsLeft(RESEND_SECONDS);
    setLoading(false);
    setError('');
    setInfo('');
    stopTimer();

    return () => stopTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function startTimer() {
    stopTimer();
    setSecondsLeft(RESEND_SECONDS);

    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          stopTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  async function sendCode(isResend = false) {
    setError('');
    setInfo('');

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError('Please enter a valid email.');
      return;
    }

    try {
      setLoading(true);

      const res = await fetch('http://localhost:8080/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || 'Failed to send reset code.');
      }

      setInfo(isResend ? 'Code resent. Check your email.' : 'Code sent. Check your email.');
      setStep('verify');
      setCode('');
      startTimer();
    } catch (e) {
      setError(e.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }
async function handleVerify() {
  setError('');
  setInfo('');

  if (secondsLeft <= 0) {
    setError('Code expired. Please resend code.');
    return;
  }

  const trimmedEmail = email.trim().toLowerCase();
  const trimmedCode = code.trim();

  if (!trimmedEmail || !trimmedEmail.includes('@')) {
    setError('Please enter a valid email.');
    return;
  }

  if (trimmedCode.length !== 6) {
    setError('Please enter the 6-digit code.');
    return;
  }

  try {
    setLoading(true);

    const res = await fetch('http://localhost:8080/auth/verify-reset-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: trimmedEmail, code: trimmedCode }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.message || 'Invalid code or expired');
    }

    setInfo('Success, now choose your new password.');
    setStep('reset');
  } catch (e) {
    setError(e.message || 'Invalid code or expired');
  } finally {
    setLoading(false);
  }
}

  async function handleUpdatePassword() {
    setError('');
    setInfo('');

    if (secondsLeft <= 0) {
      setError('Code expired. Please resend code.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);

      const res = await fetch('http://localhost:8080/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: code.trim(),
          newPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || 'Failed to reset password.');
      }

        stopTimer();
        setError('');
        setInfo('Success! Password reset.');
        setStep('success');

        setTimeout(() => {
        onClose?.();
        }, 4000);

    } catch (e) {
      setError(e.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
        <div
        className={styles.backdrop}
        onMouseDown={() => {
            if (step !== 'success') onClose?.();
        }}
        >
      <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
        <button className={styles.xBtn} onClick={onClose} aria-label="Close">
        ✕
        </button>


        <h2 className={styles.title}>Reset password</h2>
        <p className={styles.subtitle}>Check your email for the 6-digit verification code.</p>

        {/* Email input + Send code */}
        <div className={styles.emailRow}>
          <input
            className={styles.input}
            type="email"
            placeholder="Enter email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={step !== 'request' || loading}
          />
          <button
            className={styles.primaryBtn}
            onClick={() => sendCode(false)}
            disabled={!canSendCode || step !== 'request'}
            type="button"
          >
            {loading ? 'Sending...' : 'Send code'}
          </button>
        </div>

        {/* The line you asked to change */}
        {step !== 'request' && (
          <div className={styles.emailInfo}>
            Entered email for reset password: <b>{email.trim()}</b>
          </div>
        )}

        {/* Verify step */}
        {(step === 'verify' || step === 'reset') && (
          <>
            <div className={styles.timerRow}>
              <div className={styles.timerLabel}>Time left</div>
              <div className={styles.timerValue}>{formatMMSS(secondsLeft)}</div>
            </div>

            <input
              className={styles.input}
              type="text"
              inputMode="numeric"
              placeholder="Enter 6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              disabled={loading}
            />

            {step === 'verify' && (
              <div className={styles.actions}>
                <button
                  className={styles.verifyBtn}
                  onClick={handleVerify}
                  disabled={!canVerify}
                  type="button"
                >
                  Verify
                </button>

                <button
                  className={styles.secondaryBtn}
                  onClick={() => sendCode(true)}
                  disabled={loading}
                  type="button"
                >
                  Resend code
                </button>
              </div>
            )}

            {step === 'reset' && (
              <>
                <input
                  className={styles.input}
                  type="password"
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                />

                <input
                  className={styles.input}
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  disabled={loading}
                />

                <div className={styles.actions}>
                  <button
                    className={styles.verifyBtn}
                    onClick={handleUpdatePassword}
                    disabled={!canUpdatePassword}
                    type="button"
                  >
                    {loading ? 'Updating...' : 'Update password'}
                  </button>

                  <button
                    className={styles.secondaryBtn}
                    onClick={() => sendCode(true)}
                    disabled={loading}
                    type="button"
                  >
                    Resend code
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {error && <div className={styles.error}>{error}</div>}
        {info && <div className={styles.info}>{info}</div>}

        {step === 'success' && (
          <div className={styles.successBox}>
            Password updated successfully. Closing...
          </div>
        )}
      </div>
    </div>
  );
}




// import React, { useEffect, useMemo, useState } from "react";
// import styles from "./PasswordResetModal.module.css";

// function formatTime(totalSeconds) {
//   const s = Math.max(0, totalSeconds);
//   const mm = String(Math.floor(s / 60)).padStart(2, "0");
//   const ss = String(s % 60).padStart(2, "0");
//   return `${mm}:${ss}`;
// }

// export default function PasswordResetModal({
//   isOpen,
//   email,
//   initialSeconds = 300,
//   onClose,
//   onResetSuccess,
// }) {
//   const [step, setStep] = useState("code"); // "code" | "password"
//   const [code, setCode] = useState("");

//   const [newPassword, setNewPassword] = useState("");
//   const [confirmNewPassword, setConfirmNewPassword] = useState("");

//   const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
//   const [status, setStatus] = useState({ loading: false, error: "" });
//   const [resendLoading, setResendLoading] = useState(false);

//   useEffect(() => {
//     if (!isOpen) return;

//     setStep("code");
//     setCode("");
//     setNewPassword("");
//     setConfirmNewPassword("");
//     setStatus({ loading: false, error: "" });
//     setResendLoading(false);
//     setSecondsLeft(Number(initialSeconds || 300));
//   }, [isOpen, email, initialSeconds]);

//   useEffect(() => {
//     if (!isOpen) return;
//     if (secondsLeft <= 0) return;

//     const t = setInterval(() => {
//       setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
//     }, 1000);

//     return () => clearInterval(t);
//   }, [isOpen, secondsLeft]);

//   const canVerifyCode = useMemo(() => {
//     return isOpen && !!email && secondsLeft > 0 && code.length === 6 && !status.loading;
//   }, [isOpen, email, secondsLeft, code, status.loading]);

//   const passwordError = useMemo(() => {
//     if (!newPassword && !confirmNewPassword) return "";
//     if (newPassword.length > 0 && newPassword.length < 6) return "Password must be at least 6 characters.";
//     if (confirmNewPassword.length > 0 && newPassword !== confirmNewPassword) return "Passwords do not match.";
//     return "";
//   }, [newPassword, confirmNewPassword]);

//   const canUpdatePassword = useMemo(() => {
//     return (
//       isOpen &&
//       !!email &&
//       secondsLeft > 0 &&
//       code.length === 6 &&
//       newPassword.length >= 6 &&
//       newPassword === confirmNewPassword &&
//       !status.loading
//     );
//   }, [isOpen, email, secondsLeft, code, newPassword, confirmNewPassword, status.loading]);

//   async function verifyCodeOnly() {
//     if (!canVerifyCode) return;

//     try {
//       setStatus({ loading: true, error: "" });

//       const res = await fetch("http://localhost:8080/auth/reset-password/verify", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ email, code }),
//       });

//       const data = await res.json().catch(() => ({}));

//       if (!res.ok) {
//         setStatus({ loading: false, error: data?.message || "Invalid code." });
//         return;
//       }

//       setStatus({ loading: false, error: "" });
//       setStep("password");
//     } catch (e) {
//       setStatus({ loading: false, error: "Network error. Try again." });
//     }
//   }

//   async function updatePassword() {
//     if (!canUpdatePassword) return;

//     try {
//       setStatus({ loading: true, error: "" });

//       const res = await fetch("http://localhost:8080/auth/reset-password", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ email, code, newPassword }),
//       });

//       const data = await res.json().catch(() => ({}));

//       if (!res.ok) {
//         setStatus({ loading: false, error: data?.message || "Password reset failed." });
//         return;
//       }

//       setStatus({ loading: false, error: "" });
//       localStorage.removeItem("pendingPasswordResetEmail");

//       if (typeof onResetSuccess === "function") onResetSuccess();
//       if (typeof onClose === "function") onClose();
//     } catch (e) {
//       setStatus({ loading: false, error: "Network error. Try again." });
//     }
//   }

//   async function resendCode() {
//     if (!email || resendLoading) return;

//     try {
//       setResendLoading(true);
//       setStatus((s) => ({ ...s, error: "" }));

//       const res = await fetch("http://localhost:8080/auth/forgot-password", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ email }),
//       });

//       const data = await res.json().catch(() => ({}));

//       if (!res.ok) {
//         setStatus((s) => ({ ...s, error: data?.message || "Resend failed." }));
//         setResendLoading(false);
//         return;
//       }

//       const nextSeconds = Number(data?.expiresInSeconds || 300);
//       setSecondsLeft(nextSeconds);
//       setCode("");
//       setStep("code");
//       setResendLoading(false);
//     } catch (e) {
//       setStatus((s) => ({ ...s, error: "Network error. Try again." }));
//       setResendLoading(false);
//     }
//   }

//   if (!isOpen) return null;

//   return (
//     <div className={styles.backdrop} role="dialog" aria-modal="true">
//       <div className={styles.modal}>
//         <div className={styles.header}>
//           <div className={styles.titleWrap}>
//             <h2 className={styles.title}>Reset password</h2>
//             <p className={styles.subtitle}>Check your email for the 6-digit verification code.</p>
//           </div>

//           <button className={styles.xBtn} onClick={onClose} aria-label="Close">
//             ✕
//           </button>
//         </div>

//         <div className={styles.body}>
//           <p className={styles.meta}>
//             We sent a reset code to: <b>{email || "—"}</b>
//           </p>

//           <div className={styles.timerRow} aria-live="polite">
//             <div className={styles.timerLabel}>Time left</div>
//             <div className={styles.timerValue}>{formatTime(secondsLeft)}</div>
//           </div>

//           {secondsLeft <= 0 && (
//             <div className={styles.expired}>Code expired. Click “Resend code” to get a new one.</div>
//           )}

//           <input
//             className={styles.input}
//             inputMode="numeric"
//             autoComplete="one-time-code"
//             placeholder="Enter 6-digit code"
//             value={code}
//             onChange={(e) => {
//               const onlyDigits = e.target.value.replace(/\D/g, "").slice(0, 6);
//               setCode(onlyDigits);
//             }}
//           />

//           {step === "password" ? (
//             <>
//               <div className={styles.sectionTitle}>Set a new password</div>

//               <input
//                 className={styles.input}
//                 type="password"
//                 autoComplete="new-password"
//                 placeholder="New password"
//                 value={newPassword}
//                 onChange={(e) => setNewPassword(e.target.value)}
//               />

//               <input
//                 className={styles.input}
//                 type="password"
//                 autoComplete="new-password"
//                 placeholder="Confirm new password"
//                 value={confirmNewPassword}
//                 onChange={(e) => setConfirmNewPassword(e.target.value)}
//               />

//               {passwordError ? <div className={styles.error}>{passwordError}</div> : null}

//               <div className={styles.actions}>
//                 <button className={styles.primaryBtn} onClick={updatePassword} disabled={!canUpdatePassword}>
//                   {status.loading ? "Updating..." : "Update password"}
//                 </button>

//                 <button className={styles.secondaryBtn} onClick={resendCode} disabled={resendLoading}>
//                   {resendLoading ? "Sending..." : "Resend code"}
//                 </button>
//               </div>
//             </>
//           ) : (
//             <div className={styles.actions}>
//               <button className={styles.primaryBtn} onClick={verifyCodeOnly} disabled={!canVerifyCode}>
//                 {status.loading ? "Verifying..." : "Verify"}
//               </button>

//               <button className={styles.secondaryBtn} onClick={resendCode} disabled={resendLoading}>
//                 {resendLoading ? "Sending..." : "Resend code"}
//               </button>
//             </div>
//           )}

//           {status.error ? <div className={styles.error}>{status.error}</div> : null}
//         </div>
//       </div>
//     </div>
//   );
// }
