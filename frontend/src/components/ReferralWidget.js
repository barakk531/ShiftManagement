import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import classes from "./ReferralWidget.module.css";

function safeParseJwt(token) {
  try {
    return JSON.parse(atob(token.split(".")[1])) || {};
  } catch {
    return {};
  }
}

function getUserFromToken() {
  const token = localStorage.getItem("token");
  if (!token) return { isLoggedIn: false, fullName: null, referralCode: null };

  const p = safeParseJwt(token);

  const firstName = p.firstName || p.first_name || "";
  const lastName = p.lastName || p.last_name || "";
  const fullName = `${firstName} ${lastName}`.trim() || null;

  // Prefer a stable identifier if present
  const raw = p.userId || p.user_id || p.id || p.sub || p.email || "user";

  // Short code (8 chars) – good enough for small-scale usage
  const referralCode = String(raw).replace(/[^a-zA-Z0-9]/g, "").slice(0, 8);

  return { isLoggedIn: true, fullName, referralCode };
}

export default function ReferralWidget() {
  const user = useMemo(() => getUserFromToken(), []);
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  // As requested: link goes to the Login page
  const inviteLink = user.referralCode
    ? `${origin}/create-account&ref=${encodeURIComponent(user.referralCode)}`
    : "";

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // Fallback: user can copy manually
    }
  }

  if (!user.isLoggedIn) {
    return (
      <div className={classes.shell}>
        <div className={classes.card}>
          <div className={classes.badge}>Invite</div>
          <h1 className={classes.title}>Refer a Friend</h1>
          <p className={classes.subtitle}>
            To get your personal invite link, you need to be logged in.
          </p>

          <div className={classes.actions}>
            <Link className={classes.btnPrimary} to="/auth?mode=login">
              Login
            </Link>
            <Link className={classes.btnGhost} to="/create-account">
              Create account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={classes.shell}>
      <div className={classes.card}>
        <div className={classes.badge}>Referral</div>

        <h1 className={classes.title}>Refer a Friend</h1>
        <p className={classes.subtitle}>
          Share this link. Your friend will land directly on your Login page.
        </p>

        <div className={classes.userLine}>
          <span className={classes.userLabel}>Invited by:</span>
          <span className={classes.userName}>{user.fullName || "User"}</span>
        </div>

        <div className={classes.linkBlock}>
          <div className={classes.linkTitle}>Invite link</div>
          <div className={classes.linkRow}>
            <input className={classes.input} value={inviteLink} readOnly />
            <button className={classes.btnPrimary} type="button" onClick={copyLink}>
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <div className={classes.hint}>
            Tip: send it via WhatsApp/Telegram. The receiver will open the Login screen.
          </div>
        </div>

        <div className={classes.smallActions}>
          <Link className={classes.btnGhost} to="/auth?mode=login">
            Open Login
          </Link>
          <Link className={classes.btnGhost} to="/auth?mode=signup">
            Open Signup
          </Link>
        </div>
      </div>
    </div>
  );
}
