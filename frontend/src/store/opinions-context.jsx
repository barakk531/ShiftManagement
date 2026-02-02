



import React, { createContext, useCallback, useEffect, useState } from "react";

export const OpinionsContext = createContext({
  opinions: [],
  isLoading: false,
  error: null,
  reload: async () => {},
  addOpinion: async () => {},
});

async function fetchWithAuth(url, options = {}) {
  const token = localStorage.getItem("token");
  const headers = {
    ...(options.headers || {}),
    Authorization: "Bearer " + token,
  };
  const res = await fetch(url, { ...options, headers });
  return res;
}

export function OpinionsContextProvider({ children }) {
  const [opinions, setOpinions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await fetchWithAuth("http://localhost:8080/forum");
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to load forum posts");
      }

      const data = await res.json(); // { posts: [...] }
      setOpinions(data.posts || []);
    } catch (e) {
      setError(e.message || "Failed to load");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // When you enter /forum, provider mounts -> load from DB
    reload();
  }, [reload]);

  const addOpinion = useCallback(async ({ title, body }) => {
    try {
      setError(null);

      const res = await fetchWithAuth("http://localhost:8080/forum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to create post");
      }

      // Option A (reliable): reload from DB so it never "disappears"
      await reload();
    } catch (e) {
      setError(e.message || "Failed to create post");
      throw e;
    }
  }, [reload]);

  return (
    <OpinionsContext.Provider value={{ opinions, isLoading, error, reload, addOpinion }}>
      {children}
    </OpinionsContext.Provider>
  );
}
