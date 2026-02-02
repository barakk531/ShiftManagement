import { useContext, useState } from "react";
import { OpinionsContext } from "../../store/opinions-context";
import Submit from "./Submit";

export function NewOpinion() {
  const { addOpinion, isLoading, error } = useContext(OpinionsContext);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [localError, setLocalError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLocalError(null);

    if (title.trim().length < 3) {
      setLocalError("Title must be at least 3 characters");
      return;
    }

    if (body.trim().length < 5) {
      setLocalError("Opinion must be at least 5 characters");
      return;
    }

    try {
      await addOpinion({
        title: title.trim(),
        body: body.trim(),
      });

      setTitle("");
      setBody("");
    } catch (err) {
      console.error("Failed to submit opinion:", err);
      setLocalError("Failed to submit opinion. Please try again.");
    }
  }

  return (
    <section>
      <h2 className="forum-title">Share your opinion!</h2>

      <form onSubmit={handleSubmit}>
        <label htmlFor="title">TITLE</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Write a title..."
        />

        <label htmlFor="body">YOUR OPINION</label>
        <textarea
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your opinion..."
        />

        <Submit disabled={isLoading} />

        {(localError || error) && (
          <p style={{ marginTop: 10, color: "orange", textAlign: "center" }}>
            {localError || error}
          </p>
        )}
      </form>
    </section>
  );
}
