// src/pages/Oprema.jsx
import { useState, useMemo } from "react";
import { makeId } from "../utils/id";

export default function Oprema({ oprema, setOprema, isAdmin }) {
  const [naziv, setNaziv] = useState("");
  const [kategorija, setKategorija] = useState("Zaštitna");
  const [inv, setInv] = useState("");
  const [editId, setEditId] = useState(null);
  const [q, setQ] = useState("");

  const resetForm = () => {
    setNaziv("");
    setKategorija("Zaštitna");
    setInv("");
    setEditId(null);
  };

  const dodaj = () => {
    if (!isAdmin || naziv.trim() === "") return;
    setOprema([...oprema, { id: makeId(), naziv, kategorija, inv }]);
    resetForm();
  };

  const spremi = () => {
    if (!isAdmin || !editId || naziv.trim() === "") return;
    const copy = oprema.map((o) =>
      o.id === editId ? { ...o, naziv, kategorija, inv } : o
    );
    setOprema(copy);
    resetForm();
  };

  const uredi = (id) => {
    const o = oprema.find((x) => x.id === id);
    if (!o) return;
    setEditId(id);
    setNaziv(o.naziv);
    setKategorija(o.kategorija);
    setInv(o.inv || "");
  };

  const obrisi = (id) => {
    if (!isAdmin) return;
    if (!window.confirm("Sigurno obrisati opremu?")) return;
    setOprema(oprema.filter((o) => o.id !== id));
    if (editId === id) resetForm();
  };

  const filtered = useMemo(
    () =>
      oprema.filter(
        (o) =>
          o.naziv.toLowerCase().includes(q.toLowerCase()) ||
          o.kategorija.toLowerCase().includes(q.toLowerCase()) ||
          (o.inv || "").toLowerCase().includes(q.toLowerCase())
      ),
    [oprema, q]
  );

  return (
    <div>
      <h2>Oprema</h2>

      {isAdmin ? (
        <div className="info">
          Ovu listu unosi/uređuje <b>samo admin</b>.
          Obični član kasnije bira opremu u Aktivnostima.
        </div>
      ) : (
        <div className="info">Read-only prikaz (Admin OFF)</div>
      )}

      <div className="form-row">
        <input
          type="text"
          placeholder="Naziv opreme"
          value={naziv}
          onChange={(e) => setNaziv(e.target.value)}
          disabled={!isAdmin && editId === null}
        />
        <select
          value={kategorija}
          onChange={(e) => setKategorija(e.target.value)}
          disabled={!isAdmin && editId === null}
        >
          <option>Zaštitna</option>
          <option>Sprave</option>
          <option>Crijevo</option>
          <option>Ostalo</option>
        </select>
        <input
          type="text"
          placeholder="Inventarski broj (opcionalno)"
          value={inv}
          onChange={(e) => setInv(e.target.value)}
          disabled={!isAdmin && editId === null}
        />

        {isAdmin && (
          <>
            {editId === null ? (
              <button onClick={dodaj}>Dodaj</button>
            ) : (
              <>
                <button className="btn-secondary" onClick={spremi}>
                  Spremi izmjene
                </button>
                <button className="btn-secondary" onClick={resetForm}>
                  Odustani
                </button>
              </>
            )}
          </>
        )}
      </div>

      <div className="list-header">
        <h3>Popis opreme</h3>
        <input
          className="search"
          type="text"
          placeholder="Pretraži opremu…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Naziv</th>
              <th>Kategorija</th>
              <th>Inventarski broj</th>
              <th>Akcije</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o, i) => (
              <tr key={o.id}>
                <td>{i + 1}</td>
                <td>{o.naziv}</td>
                <td>{o.kategorija}</td>
                <td>{o.inv || "—"}</td>
                <td>
                  {isAdmin ? (
                    <div className="actions">
                      <button className="btn-secondary" onClick={() => uredi(o.id)}>
                        Uredi
                      </button>
                      <button className="btn-danger" onClick={() => obrisi(o.id)}>
                        Obriši
                      </button>
                    </div>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan="5">Nema rezultata.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
