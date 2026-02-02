import { redirect } from "react-router-dom";
import { getAuthToken } from "./auth";

export function requireAuth() {
  const token = getAuthToken();

  if (!token || token === "EXPIRED") {
    localStorage.removeItem("token");
    localStorage.removeItem("expiration");
    throw redirect("/auth?mode=login");
  }

  return token;
}
