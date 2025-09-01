// src/pages/oprema_cijevi.jsx
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useLocalArray } from "../hooks/useLocalStorage";
import { makeId } from "../utils/id";

/* --- Drawer (pop-out s desne strane) --- */
function Drawer({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <h3>{title}</h3>
          <button className="btn-icon" onClick={onClose} aria-label="Zatvori">✕</button>
        </div>
        <div className="drawer-body">{children}</div>
      </aside>
    </div>
  );
}

/* --- konstante --- */
const TIP_OPCIJE = ["Tlačna", "Usisna"];
const PROMJER_OPCIJE = ["A", "B", "C", "D"];

export default function OpremaCijevi() {
  const [items, setItems] = useLocalArray("oprema_cijevi", []);
  const [q, setQ] = useState("");

  // drawer/form state
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);

  const [tip, setTip] = useState("Tlačna");
  const [promjer, setPromjer] = useState("C");
  const [duljina, setDuljina] = useState("");     // broj u metrima (opcionalno)
  const [inv, setInv] = useState("");             // inventarski (opcionalno)
  const [nabavljeno, setNabavljeno] = useState(""); // yyyy-mm-dd (opcionalno)

  const resetForm = () => {
    setEditId(null);
    setTip("Tlačna");
    setPromjer("C");
    setDuljina("");
    setInv("");
    setNabavljeno("");
  };

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return items.filter((x) =>
      [x.naziv, x.tip, x.promjer, x.duljina, x.inv, x.nabavljeno]
        .map((v) => (v ?? "").toString().toLowerCase())
        .some((v) => v.includes(s))
    );
  }, [items, q]);

  const openAdd = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (id) => {
    const x = items.find((i) => i.id === id);
    if (!x) return;
    setEditId(x.id);
    setTip(x.tip || "Tlačna");
    setPromjer(x.promjer || "C");
    setDuljina(x.duljina || "");
    setInv(x.inv || "");
    setNabavljeno(x.nabavljeno || "");
    setOpen(true);
  };

  const save = () => {
    const payload = {
      id: editId || makeId(),
      naziv: "Vatrogasna cijev", // fiksno
      tip,
      promjer,
      duljina: duljina === "" ? "" : String(duljina),
      inv: inv.trim(),
      nabavljeno, // može ostati "" (nije obavezno)
    };

    if (editId) {
      setItems(items.map((i) => (i.id === editId ? payload : i)));
    } else {
      setItems([...items, payload]);
    }
    setOpen(false);
    resetForm();
  };

  const removeItem = (id) => {
    if (!window.confirm("Sigurno obrisati cijev?")) return;
    setItems(items.filter((i) => i.id !== id));
    if (editId === id) resetForm();
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>Oprema — Vatrogasne cijevi</h2>
      <div className="breadcrumbs">
        <Link to="/oprema">← Sve kategorije</Link>
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, margin: "16px 0" }}>
        <button onClick={openAdd}>➕ Dodaj cijev</button>
        <input
          className="search"
          placeholder="Pretraži…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ maxWidth: 260 }}
        />
      </div>

      {/* Tablica */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Naziv</th>
              <th>Tip</th>
              <th>Promjer</th>
              <th>Duljina (m)</th>
              <th>Inventarski</th>
              <th>Nabavljeno</th>
              <th>Akcije</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((x, i) => (
              <tr key={x.id}>
                <td>{i + 1}</td>
                <td>{x.naziv}</td>
                <td>{x.tip || "—"}</td>
                <td>{x.promjer || "—"}</td>
                <td>{x.duljina || "—"}</td>
                <td>{x.inv || "—"}</td>
                <td>{x.nabavljeno || "—"}</td>
                <td>
                  <div className="actions">
                    <button className="btn-secondary" onClick={() => openEdit(x.id)}>Uredi</button>
                    <button className="btn-danger" onClick={() => removeItem(x.id)}>Obriši</button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan="8">Nema rezultata.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Drawer (pop-out) */}
      <Drawer
        open={open}
        onClose={() => { setOpen(false); resetForm(); }}
        title={editId ? "Uredi vatrogasnu cijev" : "Dodaj vatrogasnu cijev"}
      >
        <div className="drawer-form">
          <div className="field">
            <label>Naziv (fiksno)</label>
            <input value="Vatrogasna cijev" disabled />
          </div>

          <div className="field">
            <label>Tip</label>
            <select value={tip} onChange={(e) => setTip(e.target.value)}>
              {TIP_OPCIJE.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Promjer</label>
            <select value={promjer} onChange={(e) => setPromjer(e.target.value)}>
              {PROMJER_OPCIJE.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Duljina (m)</label>
            <input
              type="number"
              value={duljina}
              onChange={(e) => setDuljina(e.target.value)}
              inputMode="numeric"
            />
          </div>

          <div className="field">
            <label>Inventarski broj</label>
            <input value={inv} onChange={(e) => setInv(e.target.value)} />
          </div>

          <div className="field">
            <label>Nabavljeno (datum)</label>
            <input type="date" value={nabavljeno} onChange={(e) => setNabavljeno(e.target.value)} />
          </div>

          <div className="drawer-actions">
            <button
              className="btn-secondary"
              onClick={() => { setOpen(false); resetForm(); }}
            >
              Odustani
            </button>
            <button onClick={save}>
              {editId ? "Spremi" : "Dodaj"}
            </button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
