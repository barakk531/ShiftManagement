import "../components/forum/Forum.css";
import { NewOpinion } from "../components/forum/NewOpinion";
import { Opinions } from "../components/forum/Opinions";
import { OpinionsContextProvider } from "../store/opinions-context";

import { requireAuth } from "../util/requireAuth";

export default function ForumPage() {
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
