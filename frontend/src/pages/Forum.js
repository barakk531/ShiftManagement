
// src/pages/Forum.js
import { useEffect } from "react";
import "../components/forum/Forum.css";
import { NewOpinion } from "../components/forum/NewOpinion";
import { Opinions } from "../components/forum/Opinions";
import { OpinionsContextProvider } from "../store/opinions-context";

import { requireAuth } from "../util/requireAuth";

export default function ForumPage() {
  useEffect(() => {
    // Enable forum-only theme on mount
    document.body.classList.add("forum-theme");
    // Cleanup on unmount
    return () => document.body.classList.remove("forum-theme");
  }, []);

  return (
    <OpinionsContextProvider>
      <div className="forum-container">
        <NewOpinion />
        <Opinions />
      </div>
    </OpinionsContextProvider>
  );
}

export function forumLoader() {
  requireAuth(); // not logged-in -> redirects to /auth?mode=login
  return null;
}





// import "../components/forum/Forum.css";
// import { NewOpinion } from "../components/forum/NewOpinion";
// import { Opinions } from "../components/forum/Opinions";
// import { OpinionsContextProvider } from "../store/opinions-context";

// import { requireAuth } from "../util/requireAuth";

// export default function ForumPage() {
//   return (
//     <OpinionsContextProvider>
//       <div className="forum-container">
//         <NewOpinion />
//         <Opinions />
//       </div>
//     </OpinionsContextProvider>
//   );
// }

// export function forumLoader() {
//   requireAuth(); // not logged-in -> redirects to /auth?mode=login
//   return null;
// }
