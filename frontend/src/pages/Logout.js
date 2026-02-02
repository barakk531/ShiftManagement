import { redirect } from "react-router-dom";

export function action() {
  localStorage.removeItem("token");
  localStorage.removeItem("expiration");

  localStorage.removeItem("user");
  localStorage.removeItem("firstName");
  localStorage.removeItem("lastName");
  localStorage.removeItem("userId");

  return redirect("/");
}
