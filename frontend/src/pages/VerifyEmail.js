import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

// Uses localStorage key "pendingEmailVerificationEmail" set during signup.
export default function VerifyEmail() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState({ loading: false, error: null, success: false });

  useEffect(() => {
    const storedEmail = localStorage.getItem("pendingEmailVerificationEmail") || "";
    setEmail(storedEmail);
  }, []);

  async function onSubmit(e) {
    e.preventDefault();

    const trimmedEmail = String(email || "").trim();
    const trimmedCode = String(code || "").trim();

    if (!trimmedEmail) {
      setStatus({ loading: false, error: "Missing email. Please sign up again.", success: false });
      return;
    }

    if (!/^\d{6}$/.test(trimmedCode)) {
      setStatus({ loading: false, error: "Code must be exactly 6 digits.", success: false });
      return;
    }

    setStatus({ loading: true, error: null, success: false });

    try {
      const response = await fetch("http://127.0.0.1:8080/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, code: trimmedCode }),
      });

      const resData = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus({
          loading: false,
          error: resData?.message || "Verification failed.",
          success: false,
        });
        return;
      }

      const token = resData?.token;
      if (token) {
        localStorage.setItem("token", token);
        const expiration = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        localStorage.setItem("expiration", expiration);
      }

      // Cleanup pending state after success.
      localStorage.removeItem("pendingEmailVerificationEmail");

      setStatus({ loading: false, error: null, success: true });
    } catch (err) {
      setStatus({ loading: false, error: "Network error: could not reach backend.", success: false });
    }
  }

  async function resendCode() {
    const trimmedEmail = String(email || "").trim();
    if (!trimmedEmail) {
      setStatus({ loading: false, error: "Missing email. Please sign up again.", success: false });
      return;
    }

    setStatus({ loading: true, error: null, success: false });

    try {
      const response = await fetch("http://127.0.0.1:8080/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const resData = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus({
          loading: false,
          error: resData?.message || "Resend failed.",
          success: false,
        });
        return;
      }

      // In dev you return devCode - show it so you can test quickly.
    //   if (resData?.devCode) {
    //     // eslint-disable-next-line no-alert
    //     alert(`DEV CODE: ${resData.devCode}`);
    //   }

      setStatus({ loading: false, error: null, success: false });
    } catch (err) {
      setStatus({ loading: false, error: "Network error: could not reach backend.", success: false });
    }
  }

  if (status.success) {
    return (
      <div style={{ maxWidth: 520, margin: "40px auto", padding: 16 }}>
        <h2>Email verified ✅</h2>
        <p>You can continue to the app.</p>
        <p>
          <Link to="/">Go Home</Link>
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 520, margin: "40px auto", padding: 16 }}>
      <h2>Verify Email</h2>

      <form onSubmit={onSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label>Email</label>
          <input
            style={{ width: "100%", padding: 8, marginTop: 6 }}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>6-digit code</label>
          <input
            style={{ width: "100%", padding: 8, marginTop: 6 }}
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
            autoComplete="one-time-code"
          />
        </div>

        {status.error && <p style={{ color: "crimson" }}>{status.error}</p>}

        <button type="submit" disabled={status.loading} style={{ padding: "10px 14px" }}>
          {status.loading ? "Verifying..." : "Verify"}
        </button>

        <button
          type="button"
          onClick={resendCode}
          disabled={status.loading}
          style={{ padding: "10px 14px", marginLeft: 10 }}
        >
          Resend code
        </button>
      </form>
    </div>
  );
}
