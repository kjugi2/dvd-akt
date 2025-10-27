// src/pages/DogadajiOprema.jsx
import { useEffect, useState } from "react";
import { OpremaAPI } from "../services/db";

// isto normaliziraj i u komponenti (drži u sync s API helperom)
const normalizeName = (s) =>
  (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

export default function DogadajiOprema() {
  const [oprema, setOprema] = useState([]);
  const [novoIme, setNovoIme] = useState("");

  // stanje uređivanja
  const [editId, setEditId] = useState(null);
  const [editNaziv, setEditNaziv] = useState("");

  // realtime subscribe
  useEffect(() => {
    let unsub;
    (async () => {
      unsub = await OpremaAPI.subscribe(setOprema);
    })();
    return () => unsub && unsub();
  }, []);

  const postojiDuplikat = (name, ignoreId = null) => {
    const key = normalizeName(name);
    return oprema.some(
      (it) => normalizeName(it.naziv) === key && it.id !== ignoreId
    );
  };

  const dodaj = async () => {
    const val = (novoIme || "").trim();
    if (!val) return;

    // lokalna provjera
    if (postojiDuplikat(val)) {
      alert("Ta oprema već postoji.");
      return;
    }

    // backend provjera + kreiraj-ili-vrati
    try {
      await OpremaAPI.createIfNotExists(val);
      setNovoIme("");
    } catch (err) {
      console.error(err);
      alert("Ne mogu dodati opremu.");
    }
  };

  const obrisi = async (id) => {
    if (!window.confirm("Obrisati ovu opremu?")) return;
    await OpremaAPI.remove(id);
    if (editId === id) {
      setEditId(null);
      setEditNaziv("");
    }
  };

  const startEdit = (it) => {
    setEditId(it.id);
    setEditNaziv(it.naziv || "");
  };

  const odustaniEdit = () => {
    setEditId(null);
    setEditNaziv("");
  };

  const spremiEdit = async () => {
    const val = (editNaziv || "").trim();
    if (!editId || !val) return;

    // spriječi preimenovanje u već postojeće ime (case-insensitive)
    if (postojiDuplikat(val, editId)) {
      alert("Već postoji oprema s tim imenom.");
      return;
    }

    try {
      await OpremaAPI.updateName(editId, val);
      setEditId(null);
      setEditNaziv("");
    } catch (err) {
      console.error(err);
      alert("Ne mogu spremiti promjenu.");
    }
  };

  const onInputKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      dodaj();
    }
  };

  const onEditKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      spremiEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      odustaniEdit();
    }
  };

  return (
    <div className="oprema-wrap">
      <h2>Događaji – oprema</h2>

      <div className="oprema-form">
        <input
          type="text"
          placeholder="Naziv nove opreme"
          value={novoIme}
          onChange={(e) => setNovoIme(e.target.value)}
          onKeyDown={onInputKeyDown}
        />
        <button onClick={dodaj}>Dodaj</button>
      </div>

      {oprema.length === 0 ? (
        <p>Nema opreme na popisu.</p>
      ) : (
        <table className="oprema-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Naziv</th>
              <th style={{ width: 180 }}>Akcije</th>
            </tr>
          </thead>
          <tbody>
            {oprema.map((it, i) => {
              const isEditing = editId === it.id;
              return (
                <tr key={it.id}>
                  <td>{i + 1}</td>
                  <td onDoubleClick={() => startEdit(it)} title="Dvoklik za uređivanje">
                    {isEditing ? (
                      <input
                        autoFocus
                        type="text"
                        value={editNaziv}
                        onChange={(e) => setEditNaziv(e.target.value)}
                        onKeyDown={onEditKeyDown}
                        style={{ width: "100%", padding: "6px 8px" }}
                      />
                    ) : (
                      it.naziv
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <div className="actions" style={{ display: "flex", gap: 8 }}>
                        <button onClick={spremiEdit}>Spremi</button>
                        <button className="btn-secondary" onClick={odustaniEdit}>
                          Odustani
                        </button>
                      </div>
                    ) : (
                      <div className="actions" style={{ display: "flex", gap: 8 }}>
                        <button className="btn-secondary" onClick={() => startEdit(it)}>
                          Uredi
                        </button>
                        <button className="btn-danger" onClick={() => obrisi(it.id)}>
                          Obriši
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
