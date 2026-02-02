

import React, { useEffect, useMemo, useState } from "react";
import styles from "./EmailVerificationModal.module.css";

function formatTime(totalSeconds) {
  const s = Math.max(0, totalSeconds);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export default function EmailVerificationModal({
  isOpen,
  email,
  initialSeconds = 300,
  onClose,
  onVerified,
}) {
  const [code, setCode] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [status, setStatus] = useState({ loading: false, error: "" });
  const [resendLoading, setResendLoading] = useState(false);

  // Reset when opening / email changes
  useEffect(() => {
    if (!isOpen) return;
    setCode("");
    setStatus({ loading: false, error: "" });
    setResendLoading(false);
    setSecondsLeft(initialSeconds || 300);
  }, [isOpen, email, initialSeconds]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen) return;
    if (secondsLeft <= 0) return;

    const t = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);

    return () => clearInterval(t);
  }, [isOpen, secondsLeft]);

  const canVerify = useMemo(() => {
    return (
      isOpen &&
      !!email &&
      secondsLeft > 0 &&
      code.length === 6 &&
      !status.loading
    );
  }, [isOpen, email, secondsLeft, code, status.loading]);

  async function verify() {
    if (!canVerify) return;

    try {
      setStatus({ loading: true, error: "" });

      const res = await fetch("http://localhost:8080/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus({
          loading: false,
          error: data?.message || "Verification failed.",
        });
        return;
      }

      // token returned on success
      const token = data?.token;
      if (token) {
        localStorage.setItem("token", token);
      }

      setStatus({ loading: false, error: "" });

      // let parent handle redirect / closing
      if (typeof onVerified === "function") onVerified(token);

      // close modal (optional but nice)
      if (typeof onClose === "function") onClose();
    } catch (e) {
      setStatus({ loading: false, error: "Network error. Try again." });
    }
  }

  async function resend() {
    if (!email || resendLoading) return;

    try {
      setResendLoading(true);
      setStatus((s) => ({ ...s, error: "" }));

      const res = await fetch("http://localhost:8080/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus((s) => ({
          ...s,
          error: data?.message || "Resend failed.",
        }));
        setResendLoading(false);
        return;
      }

      // reset timer based on backend response
      const nextSeconds = Number(data?.expiresInSeconds || 300);
      setSecondsLeft(nextSeconds);
      setCode("");
      setResendLoading(false);
    } catch (e) {
      setStatus((s) => ({ ...s, error: "Network error. Try again." }));
      setResendLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.titleWrap}>
            <h2 className={styles.title}>Authentication needed</h2>
            <p className={styles.subtitle}>
              Check your email for the 6-digit verification code.
            </p>
          </div>

          <button className={styles.xBtn} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className={styles.body}>
          <p className={styles.meta}>
            We sent a verification code to: <b>{email || "—"}</b>
          </p>

          <div className={styles.timerRow} aria-live="polite">
            <div className={styles.timerLabel}>Time left</div>
            <div className={styles.timerValue}>{formatTime(secondsLeft)}</div>
          </div>

          {secondsLeft <= 0 && (
            <div className={styles.expired}>
              Code expired. Click “Resend code” to get a new one.
            </div>
          )}

          <input
            className={styles.input}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="Enter 6-digit code"
            value={code}
            onChange={(e) => {
              const onlyDigits = e.target.value.replace(/\D/g, "").slice(0, 6);
              setCode(onlyDigits);
            }}
          />

          <div className={styles.actions}>
            <button
              className={styles.primaryBtn}
              onClick={verify}
              disabled={!canVerify}
            >
              {status.loading ? "Verifying..." : "Verify"}
            </button>

            <button
              className={styles.secondaryBtn}
              onClick={resend}
              disabled={resendLoading}
            >
              {resendLoading ? "Sending..." : "Resend code"}
            </button>
          </div>

          {status.error ? <div className={styles.error}>{status.error}</div> : null}
        </div>
      </div>
    </div>
  );
}




// import { useEffect, useMemo, useState } from "react";
// import styles from "./EmailVerificationModal.module.css";


// function formatTime(totalSeconds) {
//   const s = Math.max(0, totalSeconds);
//   const mm = String(Math.floor(s / 60)).padStart(2, "0");
//   const ss = String(s % 60).padStart(2, "0");
//   return `${mm}:${ss}`;
// }

// export default function EmailVerificationModal({
//   isOpen,
//   email,
//   initialSeconds,
//   onClose,
//   onVerified,
// }) {
//   const [code, setCode] = useState("");
//   const [secondsLeft, setSecondsLeft] = useState(initialSeconds || 0);
//   const [status, setStatus] = useState({ loading: false, error: null });

//   useEffect(() => {
//     if (!isOpen) return;

//     setCode("");
//     setStatus({ loading: false, error: null });
//     setSecondsLeft(Number(initialSeconds || 0));
//   }, [isOpen, initialSeconds]);

//   useEffect(() => {
//     if (!isOpen) return;
//     if (secondsLeft <= 0) return;

//     const id = setInterval(() => {
//       setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
//     }, 1000);

//     return () => clearInterval(id);
//   }, [isOpen, secondsLeft]);

//   const timeText = useMemo(() => {
//     const s = Math.max(0, Number(secondsLeft || 0));
//     const mm = String(Math.floor(s / 60)).padStart(2, "0");
//     const ss = String(s % 60).padStart(2, "0");
//     return `${mm}:${ss}`;
//   }, [secondsLeft]);

//   async function verify() {
//     const trimmedEmail = String(email || "").trim();
//     const trimmedCode = String(code || "").trim();

//     if (!trimmedEmail) {
//       setStatus({ loading: false, error: "Missing email. Please sign up again." });
//       return;
//     }

//     if (!/^\d{6}$/.test(trimmedCode)) {
//       setStatus({ loading: false, error: "Code must be exactly 6 digits." });
//       return;
//     }

//     if (secondsLeft <= 0) {
//       setStatus({ loading: false, error: "Verification code expired. Please resend." });
//       return;
//     }

//     setStatus({ loading: true, error: null });

//     try {
//       const response = await fetch("http://127.0.0.1:8080/auth/verify-email", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ email: trimmedEmail, code: trimmedCode }),
//       });

//       const resData = await response.json().catch(() => ({}));

//       if (!response.ok) {
//         setStatus({ loading: false, error: resData?.message || "Verification failed." });
//         return;
//       }

//       const token = resData?.token;
//       if (!token) {
//         setStatus({ loading: false, error: "No token returned from server." });
//         return;
//       }

//       localStorage.setItem("token", token);
//       localStorage.setItem("expiration", new Date(Date.now() + 60 * 60 * 1000).toISOString());
//       localStorage.removeItem("pendingEmailVerificationEmail");

//       setStatus({ loading: false, error: null });
//       onVerified?.();
//     } catch (err) {
//       setStatus({ loading: false, error: "Network error: could not reach backend." });
//     }
//   }

//   async function resend() {
//     const trimmedEmail = String(email || "").trim();
//     if (!trimmedEmail) {
//       setStatus({ loading: false, error: "Missing email. Please sign up again." });
//       return;
//     }

//     setStatus({ loading: true, error: null });

//     try {
//       const response = await fetch("http://127.0.0.1:8080/auth/resend-verification", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ email: trimmedEmail }),
//       });

//       const resData = await response.json().catch(() => ({}));

//       if (!response.ok) {
//         setStatus({ loading: false, error: resData?.message || "Resend failed." });
//         return;
//       }

//     //   // DEV ONLY: remove once SendGrid is wired.
//     //   if (resData?.devCode) {
//     //     // eslint-disable-next-line no-alert
//     //     alert(`DEV CODE: ${resData.devCode}`);
//     //   }

//       const newSeconds = Number(resData?.expiresInSeconds || 300);
//       setSecondsLeft(newSeconds);

//       setStatus({ loading: false, error: null });
//     } catch (err) {
//       setStatus({ loading: false, error: "Network error: could not reach backend." });
//     }
//   }

//   if (!isOpen) return null;

//   return (
//     <div className={styles.backdrop}>
//       <div className={styles.modal}>    
//         <div className={styles.header}>
//         <div className={styles.titleWrap}>
//             <h2 className={styles.title}>Authentication needed</h2>
//             <p className={styles.subtitle}>
//             Check your email for the 6-digit verification code.
//             </p>
//         </div>

//         <button className={styles.xBtn} onClick={onClose} aria-label="Close">
//             ✕
//         </button>
//         </div>


//             <div className={styles.timerRow}>
//             <div className={styles.timerLabel}>Time left</div>
//             <div className={styles.timerValue}>{formatTime(secondsLeft)}</div>
//             </div>

//             {secondsLeft <= 0 && (
//             <div className={styles.expired}>
//                 Code expired. Click “Resend code” to get a new one.
//             </div>
//             )}

//             <div className="ev-timer" aria-live="polite">
//             {formatTime(secondsLeft)}
//             </div>
            
//           <h3 style={{ margin: 0 }}>Verify your email</h3>
//           <button onClick={onClose} className={styles.xBtn} aria-label="Close">
//             ✕
//           </button>
//         </div>

//         <p style={{ marginTop: 8 }}>
//           We sent a 6-digit code to: <b>{email}</b>
//         </p>

//         <div className={styles.timerRow}>
//           <span>Time left:</span>
//           <b style={{ marginLeft: 8 }}>{timeText}</b>
//         </div>

//         <div style={{ marginTop: 12 }}>
//           <label>6-digit code</label>
//           <input
//             className={styles.input}
//             inputMode="numeric"
//             value={code}
//             onChange={(e) => setCode(e.target.value)}
//             placeholder="123456"
//             autoComplete="one-time-code"
//           />
//         </div>

//         {status.error && <p className={styles.error}>{status.error}</p>}

//         <div className={styles.actions}>
//           <button onClick={verify} disabled={status.loading} className={styles.primaryBtn}>
//             {status.loading ? "Verifying..." : "Verify"}
//           </button>

//           <button onClick={resend} disabled={status.loading} className={styles.secondaryBtn}>
//             Resend code
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }



