const API_BASE = "http://localhost:3001";
async function apiFetch(path, init) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers }
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return void 0;
  }
  return res.json();
}
async function getSharedLoadout(slug) {
  return apiFetch(`/share/${slug}`);
}
async function getUserLoadouts(steamId) {
  return apiFetch(`/users/${steamId}/loadouts`);
}
export {
  apiFetch as a,
  getUserLoadouts as b,
  getSharedLoadout as g
};
