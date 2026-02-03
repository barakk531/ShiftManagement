import { useEffect } from "react";

const ALL_THEME_CLASSES = [
  "forum-theme",
  "newsletter-theme",
  "events-theme",
  "submission-shifts-theme",
];

export function useBodyClass(className) {
  useEffect(() => {
    // Remove other theme classes to avoid conflicts and accidental cleanups
    for (const c of ALL_THEME_CLASSES) {
      if (c !== className) document.body.classList.remove(c);
    }

    document.body.classList.add(className);

    // Debug: verify class is actually applied
    console.log("[useBodyClass] after add:", document.body.className);

    return () => {
      document.body.classList.remove(className);
      console.log("[useBodyClass] after remove:", document.body.className);
    };
  }, [className]);
}
