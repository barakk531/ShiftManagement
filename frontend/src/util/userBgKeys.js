export function getUserIdFromToken() {
  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.userId || payload.user_id || payload.id || payload.sub || payload.email || null;
  } catch {
    return null;
  }
}

export function getHomeBgStorageKey() {
  const userId = getUserIdFromToken();
  if (!userId) return "home_bg_guest";
  return `home_bg_user_${String(userId)}`;
}
