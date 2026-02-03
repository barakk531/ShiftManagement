import http from "./http";

export async function getNextWeekAvailability() {
  const res = await http.get("/availability/next-week");
  return res.data;
}

export async function saveNextWeekAvailability(payload) {
  const res = await http.post("/availability/next-week", payload);
  return res.data;
}
