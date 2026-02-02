

// Opinion.jsx
import { use, useActionState, useOptimistic } from "react";
import { OpinionsContext } from "../../store/opinions-context";
import "./Forum.css";

export function Opinion({
  opinion: { id, title, body, votes, first_name, last_name, userName },
}) {
  // Reads actions from context
  const { upvoteOpinion, downvoteOpinion } = use(OpinionsContext);

  // Optimistic UI votes update
  const [optimisticVotes, setVotesOptimistically] = useOptimistic(
    votes,
    (prevVotes, mode) => (mode === "up" ? prevVotes + 1 : prevVotes - 1)
  );

  // Upvote flow
  async function upvoteAction() {
    setVotesOptimistically("up");
    await upvoteOpinion(id);
  }

  // Downvote flow
  async function downvoteAction() {
    setVotesOptimistically("down");
    await downvoteOpinion(id);
  }

  // Server action wrappers (React 19 style)
  const [, upvoteFormAction, upvotePending] = useActionState(upvoteAction);
  const [, downvoteFormAction, downvotePending] = useActionState(downvoteAction);

  // Display name: prefer DB names, fallback to userName, fallback to 'Unknown'
  const displayName =
    first_name || last_name
      ? `${first_name ?? ""} ${last_name ?? ""}`.trim()
      : userName || "Unknown";

  return (
    <article className="opinion">
      <header>
        <h3 className="post-title">{title}</h3>

        <p className="sharedBy">Shared by {displayName}</p>
      </header>

      <p className="post-content">{body}</p>

      <form className="votes vote-container">
        <button
          className="vote-btn"
          formAction={upvoteFormAction}
          disabled={upvotePending || downvotePending}
          aria-label="Upvote"
          type="submit"
        >
          {/* Upvote icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="m16 12-4-4-4 4" />
            <path d="M12 16V8" />
          </svg>
        </button>

        <span>{optimisticVotes}</span>

        <button
          className="vote-btn"
          formAction={downvoteFormAction}
          disabled={upvotePending || downvotePending}
          aria-label="Downvote"
          type="submit"
        >
          {/* Downvote icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M12 8v8" />
            <path d="m8 12 4 4 4-4" />
          </svg>
        </button>
      </form>
    </article>
  );
}


