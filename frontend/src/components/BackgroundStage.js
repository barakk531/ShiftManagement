import { useEffect, useRef, useState } from "react";
import classes from "./BackgroundStage.module.css";

const HISTORY_KEY = "history_bg_url";

const DEFAULT_BG =
  "https://images.unsplash.com/photo-1520975958225-9bcd6d0d2f0a?auto=format&fit=crop&w=2400&q=80";

export default function BackgroundStage({
  children,
  allowPicker = true,
  storageKey,              // NEW
  defaultBgUrl,            // optional
  title = "Background",
}) {
  const KEY = storageKey || HISTORY_KEY;
  const fallback = defaultBgUrl || DEFAULT_BG;
  const rootRef = useRef(null);
  const [bgUrl, setBgUrl] = useState(fallback);
  const [draftUrl, setDraftUrl] = useState(fallback);


  useEffect(() => {
    // Read-only mode: always use fallback and ignore localStorage
    if (!allowPicker) {
      setBgUrl(fallback);
      setDraftUrl(fallback);
      return;
    }

    const saved = localStorage.getItem(KEY);
    const chosen = saved || fallback;

    setBgUrl(chosen);
    setDraftUrl(chosen);
  }, [KEY, fallback, allowPicker]);

  // History has its own background, independent from Home
  // useEffect(() => {
  //   const saved = localStorage.getItem(KEY);
  //   const chosen = saved || DEFAULT_BG;

  //   setBgUrl(chosen);
  //   setDraftUrl(chosen);
  // }, [KEY]);

//   function onMouseMove(e) {
//     const el = rootRef.current;
//     if (!el) return;

//     const rect = el.getBoundingClientRect();
//     const x = ((e.clientX - rect.left) / rect.width) * 100;
//     const y = ((e.clientY - rect.top) / rect.height) * 100;

//     el.style.setProperty("--mx", `${x}%`);
//     el.style.setProperty("--my", `${y}%`);
//   }

  function saveBackground() {
    const trimmed = String(draftUrl || "").trim();
    if (!trimmed) return;

    setBgUrl(trimmed);
    localStorage.setItem(KEY, trimmed);
  }

  function resetBackground() {
    localStorage.removeItem(KEY);
    setBgUrl(fallback);
    setDraftUrl(fallback);
  }

  return (
    <section
      ref={rootRef}
      className={classes.stage}
    //   onMouseMove={onMouseMove}
      style={{ ["--bg-url"]: `url("${bgUrl}")` }}
    >
      <div className={classes.bg} />
      <div className={classes.overlay} />
      {/* <div className={classes.spotlight} /> */}

      <div className={classes.inner}>{children}</div>

      {allowPicker && (
        <div className={classes.picker}>
          <div className={classes.pickerTitle}>{title}</div>
          <div className={classes.pickerRow}>
            <input
              className={classes.input}
              type="url"
              value={draftUrl}
              onChange={(e) => setDraftUrl(e.target.value)}
              placeholder="Paste image URL (https://...)"
            />
            <button className={classes.btn} type="button" onClick={saveBackground}>
              Save
            </button>
            <button className={classes.btnGhost} type="button" onClick={resetBackground}>
              Reset
            </button>
          </div>
          <div className={classes.hint}>
            Tip: any direct image URL works. This page uses its own background.
          </div>
        </div>
      )}
    </section>
  );
}
