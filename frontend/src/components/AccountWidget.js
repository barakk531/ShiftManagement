import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import classes from "./AccountWidget.module.css";
import { useLocation } from "react-router-dom";

const AVATAR_KEY = "profile_avatar";



function safeParseJwt(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload || {};
  } catch {
    return {};
  }
}

// function getUserFromToken() {
//   const token = localStorage.getItem("token");
//   if (!token) return { email: null };

//   const p = safeParseJwt(token);
//   const email = p.email || null;
//   return { email };
// }

function getUserFromToken() {
  const token = localStorage.getItem("token");
  if (!token) return { email: null, firstName: "", lastName: "" };

  const p = safeParseJwt(token);

  const email = p.email || null;

  // Try common payload keys (depends on how your backend signs JWT)
  const firstName = p.firstName || p.first_name || "";
  const lastName = p.lastName || p.last_name || "";

  return { email, firstName, lastName };
}


export default function AccountWidget() {
  const location = useLocation();
  const hideOnShiftSwaps = location.pathname.startsWith("/shift-swaps");
  const hideAccountWidget = location.pathname.startsWith("/submission-shifts");

  const user = useMemo(() => getUserFromToken(), []);
  const [avatar, setAvatar] = useState(null);

  useEffect(() => {
    if (hideOnShiftSwaps) return; 
    const savedAvatar = localStorage.getItem(AVATAR_KEY);
    if (savedAvatar) setAvatar(savedAvatar);
  }, [hideOnShiftSwaps]);

  // Not rendering this AccountWidget
  if (hideOnShiftSwaps || hideAccountWidget) {
    return null;
  }

  function onPickAvatar(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Image too large (max 2MB).");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      setAvatar(dataUrl);
      localStorage.setItem(AVATAR_KEY, dataUrl);
    };
    reader.readAsDataURL(file);
  }

  function removeAvatar() {
    setAvatar(null);
    localStorage.removeItem(AVATAR_KEY);
  }

  const initials = (user.email?.[0] || "U").toUpperCase();
  const fullName = `${user.firstName} ${user.lastName}`.trim();

  return (
    <aside className={classes.widget} aria-label="Account widget">
      <div className={classes.topRow}>
        <div className={classes.title}>Account</div>
        <Link className={classes.link} to="/newsletter">
          App
        </Link>
      </div>

      <div className={classes.userRow}>
        <div className={classes.avatarWrap}>
          {avatar ? (
            <img className={classes.avatar} src={avatar} alt="avatar" />
          ) : (
            <div className={classes.avatarFallback}>{initials}</div>
          )}
        </div>
          <div className={classes.userInfo}>
            {fullName ? <div className={classes.name}>{fullName}</div> : null}
            <div className={classes.meta}>{user.email ? user.email : "Logged in"}</div>
          </div>
      </div>

      <div className={classes.bottomRow}>
        <label className={classes.uploadBtn}>
          Upload photo
          <input className={classes.file} type="file" accept="image/*" onChange={onPickAvatar} />
        </label>

        {avatar ? (
          <button className={classes.btnGhost} type="button" onClick={removeAvatar}>
            Remove
          </button>
        ) : null}
      </div>
    </aside>
  );
}
