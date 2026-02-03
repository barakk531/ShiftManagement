import { useEffect, useState } from "react";
import { Navigate, useRouteLoaderData } from "react-router-dom";
import {
  listShiftTemplates,
  createShiftTemplate,
  updateShiftTemplate,
  deleteShiftTemplate,
} from "../../api/shiftTemplates";


function decodeJwt(token) {
  if (!token || token === "EXPIRED") return null;
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

export default function AdminShiftTemplates() {
  const token = useRouteLoaderData("root");
  const user = decodeJwt(token);
  const role = user?.role;

  const [templates, setTemplates] = useState([]);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    startTime: "09:00",
    endTime: "17:00",
    sortOrder: 0,
    requiredCount: "",
    isActive: true,
  });

  useEffect(() => {
    if (!token || role !== "admin") return;

    listShiftTemplates()
      .then(setTemplates)
      .catch((e) => setErr(e?.response?.data?.message || "Failed to load templates"));
  }, [token, role]);

  if (!token) return <Navigate to="/auth?mode=login" />;
  if (role !== "admin") return <Navigate to="/" />;

  async function onCreate(e) {
    e.preventDefault();
    setErr("");
    setSaving(true);
    try {
      const created = await createShiftTemplate(form);
      setTemplates((prev) => [...prev, created].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)));
      setForm((p) => ({ ...p, name: "" }));
    } catch (e2) {
      setErr(e2?.response?.data?.message || "Failed to create template");
    } finally {
      setSaving(false);
    }
  }

  async function onToggleActive(t) {
    setErr("");
    try {
      const updated = await updateShiftTemplate(t.id, { isActive: !t.is_active });
      setTemplates((prev) => prev.map((x) => (x.id === t.id ? updated : x)));
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to update");
    }
  }

  async function onDelete(id) {
    setErr("");
    if (!window.confirm("Delete this template?")) return;
    try {
      await deleteShiftTemplate(id);
      setTemplates((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to delete");
    }
  }

  return (
    <div style={{ padding: 16, maxWidth: 900 }}>
      <h2>Manage Shift Templates</h2>

      {err && <div style={{ color: "crimson", marginBottom: 12 }}>{err}</div>}

      <form onSubmit={onCreate} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr", gap: 8, alignItems: "end" }}>
        <div>
          <label>Name</label>
          <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
        </div>

        <div>
          <label>Start</label>
          <input type="time" value={form.startTime} onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))} />
        </div>

        <div>
          <label>End</label>
          <input type="time" value={form.endTime} onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))} />
        </div>

        <div>
          <label>Order</label>
          <input type="number" value={form.sortOrder} onChange={(e) => setForm((p) => ({ ...p, sortOrder: e.target.value }))} />
        </div>

        <div>
          <label>Required</label>
          <input type="number" placeholder="optional" value={form.requiredCount} onChange={(e) => setForm((p) => ({ ...p, requiredCount: e.target.value }))} />
        </div>

        <button disabled={saving || !form.name.trim()} type="submit">
          {saving ? "Saving..." : "Add"}
        </button>
      </form>

      <div style={{ marginTop: 16, borderTop: "1px solid #333", paddingTop: 12 }}>
        {templates.length === 0 ? (
          <div>No templates yet.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Name</th>
                <th style={th}>Start</th>
                <th style={th}>End</th>
                <th style={th}>Order</th>
                <th style={th}>Required</th>
                <th style={th}>Active</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id}>
                  <td style={td}><b>{t.name}</b></td>
                  <td style={td}>{t.start_time}</td>
                  <td style={td}>{t.end_time}</td>
                  <td style={td}>{t.sort_order ?? 0}</td>
                  <td style={td}>{t.required_count ?? "-"}</td>
                  <td style={td}>
                    <button type="button" onClick={() => onToggleActive(t)}>
                      {t.is_active ? "ON" : "OFF"}
                    </button>
                  </td>
                  <td style={td}>
                    <button type="button" onClick={() => onDelete(t.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const th = { textAlign: "left", padding: 8, borderBottom: "1px solid #333" };
const td = { padding: 8, borderBottom: "1px solid #222" };
