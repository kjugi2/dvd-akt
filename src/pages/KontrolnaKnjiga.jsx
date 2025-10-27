// src/pages/KontrolnaKnjiga.jsx
import { useEffect, useMemo, useState } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import hr from "date-fns/locale/hr";
import "react-datepicker/dist/react-datepicker.css";
import { KontrolnaKnjigaAPI } from "../services/db";

registerLocale("hr", hr);

/* ===== Helperi ===== */
function toYMD(date) {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function fromYMD(str) {
  if (!str) return null;
  const [y, m, d] = String(str).split("-").map((n) => parseInt(n, 10));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}
function timeToMinutes(str) {
  if (!str) return 0;
  const [h, m] = str.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return 0;
  return h * 60 + m;
}
function minutesToHhMm(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}
function parseLiters(val) {
  if (!val) return 0;
  const s = String(val).replace(",", ".").trim();
  const num = parseFloat(s.replace(/[^\d.]+/g, ""));
  return isNaN(num) ? 0 : num;
}

/* ===== Modal ===== */
function Modal({ open, onClose, title, children, maxWidth = 900 }) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth,
          background: "#fff",
          color: "#000",
          borderRadius: 12,
          boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid #eee",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{title}</h3>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "1px solid #ccc",
              color: "#000",
              padding: "6px 10px",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: 18 }}>{children}</div>
      </div>
    </div>
  );
}

/* ===== Glavna stranica ===== */
export default function KontrolnaKnjiga({ clanovi = [] }) {
  // podatke čitamo iz Firestore-a (kontrolnaKnjiga)
  const [oprema, setOprema] = useState([]);

  const [addEquipOpen, setAddEquipOpen] = useState(false);
  const [editEquip, setEditEquip] = useState(null);
  const [newEquipName, setNewEquipName] = useState("");
  const [newEquipCat, setNewEquipCat] = useState("");

  const [activeEquipId, setActiveEquipId] = useState(null);
  const [addEntryOpen, setAddEntryOpen] = useState(false);
  const [editEntry, setEditEntry] = useState(null);

  const [fNaziv, setFNaziv] = useState("");
  const [fDatum, setFDatum] = useState(new Date());
  const [fTimeFrom, setFTimeFrom] = useState("");
  const [fTimeTo, setFTimeTo] = useState("");
  const [fOpis, setFOpis] = useState("");
  const [fGorivo, setFGorivo] = useState("");
  const [fKorisnik, setFKorisnik] = useState("");

  // Realtime subscribe + ESC zatvaranje
  useEffect(() => {
    let unsub;
    (async () => {
      unsub = await KontrolnaKnjigaAPI.subscribe(setOprema);
    })();
    return () => unsub && unsub();
  }, []);

  useEffect(() => {
    const onEsc = (e) => {
      if (e.key === "Escape") {
        setAddEquipOpen(false);
        setAddEntryOpen(false);
        setEditEquip(null);
        setEditEntry(null);
      }
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, []);

  const kategorije = [
    "Motorne pile",
    "Agregati - generatori struje",
    "Agregati - hidraulike",
    "Pumpe",
  ];

  /* ==== OPREMA (Firestore) ==== */
  async function addOrUpdateEquipment() {
    const naziv = newEquipName.trim();
    if (!naziv || !newEquipCat) return;

    try {
      if (editEquip) {
        await KontrolnaKnjigaAPI.update(editEquip.id, {
          naziv,
          kategorija: newEquipCat,
          // unosi ostaju kakvi jesu (ne diramo ih ovdje)
        });
      } else {
        await KontrolnaKnjigaAPI.create({
          naziv,
          kategorija: newEquipCat,
          unosi: [], // start empty
        });
      }
      setNewEquipName("");
      setNewEquipCat("");
      setEditEquip(null);
      setAddEquipOpen(false);
    } catch (err) {
      console.error("Greška spremanja opreme:", err);
      alert("Greška spremanja opreme: " + (err?.message || String(err)));
    }
  }

  async function deleteEquipment(id) {
    if (!confirm("Obrisati ovu opremu i sve unose?")) return;
    try {
      await KontrolnaKnjigaAPI.remove(id);
    } catch (err) {
      console.error("Greška brisanja opreme:", err);
      alert("Greška brisanja: " + (err?.message || String(err)));
    }
  }

  /* ==== UNOSI (kao array na dokumentu) ==== */
  function openAddEntry(equipId, entry = null) {
    setActiveEquipId(equipId);
    if (entry) {
      setEditEntry(entry);
      setFNaziv(entry.naziv);
      setFDatum(fromYMD(entry.datumYMD));
      setFTimeFrom(entry.vrijemeOd);
      setFTimeTo(entry.vrijemeDo);
      setFOpis(entry.opis);
      setFGorivo(entry.dodanoGorivo);
      setFKorisnik(entry.korisnik);
    } else {
      setEditEntry(null);
      setFNaziv("");
      setFDatum(new Date());
      setFTimeFrom("");
      setFTimeTo("");
      setFOpis("");
      setFGorivo("");
      setFKorisnik("");
    }
    setAddEntryOpen(true);
  }

  async function saveEntry() {
    if (!activeEquipId) return;
    const minutes =
      fTimeFrom && fTimeTo
        ? timeToMinutes(fTimeTo) - timeToMinutes(fTimeFrom)
        : 0;
    const entry = {
      // id je timestamp + random suffix da izbjegnemo kolizije
      id: editEntry?.id || `e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      naziv: fNaziv,
      datumYMD: toYMD(fDatum),
      vrijemeOd: fTimeFrom,
      vrijemeDo: fTimeTo,
      trajanje: minutes > 0 ? minutesToHhMm(minutes) : "—",
      opis: fOpis.trim(),
      dodanoGorivo: fGorivo.trim(),
      korisnik: fKorisnik,
    };
    if (!entry.datumYMD || !entry.korisnik) {
      alert("Popuni obavezna polja (datum i korisnik).");
      return;
    }

    try {
      const equip = oprema.find((o) => o.id === activeEquipId);
      if (!equip) return;

      const newUnosi = editEntry
        ? equip.unosi.map((u) => (u.id === entry.id ? entry : u))
        : [entry, ...(equip.unosi || [])];

      await KontrolnaKnjigaAPI.update(activeEquipId, { unosi: newUnosi });

      setAddEntryOpen(false);
      setEditEntry(null);
    } catch (err) {
      console.error("Greška spremanja unosa:", err);
      alert("Greška spremanja unosa: " + (err?.message || String(err)));
    }
  }

  async function deleteEntry(equipId, entryId) {
    if (!confirm("Obrisati ovaj unos?")) return;
    try {
      const equip = oprema.find((o) => o.id === equipId);
      if (!equip) return;
      const newUnosi = (equip.unosi || []).filter((u) => u.id !== entryId);
      await KontrolnaKnjigaAPI.update(equipId, { unosi: newUnosi });
    } catch (err) {
      console.error("Greška brisanja unosa:", err);
      alert("Greška brisanja unosa: " + (err?.message || String(err)));
    }
  }

  /* Grupiranje po kategorijama + statistika */
  const grouped = useMemo(() => {
    const res = {};
    kategorije.forEach((k) => (res[k] = { items: [], stats: { count: 0, min: 0, lit: 0 } }));
    oprema.forEach((o) => {
      const key = o.kategorija || "Ostalo";
      if (!res[key]) res[key] = { items: [], stats: { count: 0, min: 0, lit: 0 } };
      res[key].items.push(o);
      (o.unosi || []).forEach((u) => {
        res[key].stats.count += 1;
        res[key].stats.min += timeToMinutes(u.vrijemeDo) - timeToMinutes(u.vrijemeOd);
        res[key].stats.lit += parseLiters(u.dodanoGorivo);
      });
    });
    return res;
  }, [oprema]);

  return (
    <div style={{ padding: 20 }}>
      <h2>Kontrolna knjiga</h2>

      <button
        onClick={() => {
          setEditEquip(null);
          setNewEquipName("");
          setNewEquipCat("");
          setAddEquipOpen(true);
        }}
        style={{
          background: "#000",
          color: "#fff",
          padding: "10px 14px",
          borderRadius: 8,
          border: "1px solid #000",
          cursor: "pointer",
          fontWeight: 700,
          marginBottom: 16,
        }}
      >
        + Dodaj opremu
      </button>

      {/* Prikaz po kategorijama */}
      {Object.keys(grouped).map((cat) => {
        const st = grouped[cat].stats;
        return (
          <div key={cat} style={{ marginBottom: 32 }}>
            <h3 style={{ margin: "12px 0" }}>{cat}</h3>
            <div style={{ color: "#555", marginBottom: 8, fontSize: 14 }}>
              {st.count} unosa • {minutesToHhMm(st.min)} • {st.lit.toFixed(2)} L
            </div>
            {grouped[cat].items.length ? (
              grouped[cat].items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    border: "1px solid #ccc",
                    borderRadius: 12,
                    marginBottom: 16,
                    overflow: "hidden",
                    background: "#fff",
                  }}
                >
                  <div
                    style={{
                      padding: 12,
                      background: "#f6f6f6",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <b>{item.naziv}</b>
                    <span style={{ color: "#777" }}>
                      {(item.unosi || []).length} unosa
                    </span>
                    <div style={{ flex: 1 }} />
                    <button onClick={() => openAddEntry(item.id)}>+ Dodaj unos</button>
                    <button
                      onClick={() => {
                        setEditEquip(item);
                        setNewEquipName(item.naziv);
                        setNewEquipCat(item.kategorija || "");
                        setAddEquipOpen(true);
                      }}
                      className="btn-secondary"
                      style={{ marginLeft: 6 }}
                    >
                      Uredi opremu
                    </button>
                    <button
                      onClick={() => deleteEquipment(item.id)}
                      className="btn-danger"
                      style={{ marginLeft: 6 }}
                    >
                      Obriši
                    </button>
                  </div>

                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 920 }}>
                      <thead>
                        <tr style={{ background: "#eee" }}>
                          <th style={th}>Vrsta rada</th>
                          <th style={th}>Datum</th>
                          <th style={th}>Vrijeme od</th>
                          <th style={th}>Vrijeme do</th>
                          <th style={th}>Trajanje</th>
                          <th style={th}>Opis</th>
                          <th style={th}>Dodano gorivo</th>
                          <th style={th}>Korisnik</th>
                          <th style={thRight}>Akcije</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(item.unosi || []).length ? (
                          (item.unosi || []).map((u) => (
                            <tr key={u.id}>
                              <td style={td}>{u.naziv || "—"}</td>
                              <td style={td}>{u.datumYMD || "—"}</td>
                              <td style={td}>{u.vrijemeOd || "—"}</td>
                              <td style={td}>{u.vrijemeDo || "—"}</td>
                              <td style={td}>{u.trajanje || "—"}</td>
                              <td style={td}>{u.opis || "—"}</td>
                              <td style={td}>{u.dodanoGorivo || "—"}</td>
                              <td style={td}>{u.korisnik || "—"}</td>
                              <td style={tdRight}>
                                <button
                                  onClick={() => openAddEntry(item.id, u)}
                                  className="btn-secondary"
                                  style={{ marginRight: 6 }}
                                >
                                  Uredi
                                </button>
                                <button
                                  onClick={() => deleteEntry(item.id, u.id)}
                                  className="btn-danger"
                                >
                                  Obriši
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={9} style={{ padding: 12, color: "#777" }}>
                              Nema unosa.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ color: "#777", marginLeft: 6 }}>Nema opreme.</div>
            )}
          </div>
        );
      })}

      {/* Modal: dodaj/uredi opremu */}
      <Modal
        open={addEquipOpen}
        onClose={() => {
          setAddEquipOpen(false);
          setEditEquip(null);
        }}
        title={editEquip ? "Uredi opremu" : "Dodaj opremu"}
        maxWidth={520}
      >
        <div style={{ display: "grid", gap: 12 }}>
          <div style={field}>
            <label style={label}>Kategorija</label>
            <select
              value={newEquipCat}
              onChange={(e) => setNewEquipCat(e.target.value)}
              style={input}
            >
              <option value="">— Odaberi kategoriju —</option>
              {kategorije.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </div>
          <div style={field}>
            <label style={label}>Naziv</label>
            <input
              value={newEquipName}
              onChange={(e) => setNewEquipName(e.target.value)}
              placeholder="npr. Stihl"
              style={input}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button className="btn-secondary" onClick={() => setAddEquipOpen(false)}>
              Odustani
            </button>
            <button onClick={addOrUpdateEquipment}>Spremi</button>
          </div>
        </div>
      </Modal>

      {/* Modal: dodaj/uredi unos */}
      <Modal
        open={addEntryOpen}
        onClose={() => {
          setAddEntryOpen(false);
          setEditEntry(null);
        }}
        title={editEntry ? "Uredi unos" : "Dodaj unos"}
        maxWidth={820}
      >
        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          <div style={field}>
            <label style={label}>Vrsta rada</label>
            <select
              value={fNaziv}
              onChange={(e) => setFNaziv(e.target.value)}
              style={input}
            >
              <option value="">— Odaberi —</option>
              <option>Probni rad</option>
              <option>Intervencija</option>
              <option>Vježba</option>
              <option>Ostalo</option>
            </select>
          </div>

          <div style={field}>
            <label style={label}>Datum</label>
            <DatePicker
              selected={fDatum}
              onChange={(d) => setFDatum(d)}
              dateFormat="dd.MM.yyyy."
              locale="hr"
            />
          </div>

          <div style={field}>
            <label style={label}>Vrijeme od</label>
            <input
              type="time"
              value={fTimeFrom}
              onChange={(e) => setFTimeFrom(e.target.value)}
              style={input}
            />
          </div>

          <div style={field}>
            <label style={label}>Vrijeme do</label>
            <input
              type="time"
              value={fTimeTo}
              onChange={(e) => setFTimeTo(e.target.value)}
              style={input}
            />
          </div>

          <div style={{ ...field, gridColumn: "1 / -1" }}>
            <label style={label}>Opis</label>
            <textarea
              value={fOpis}
              onChange={(e) => setFOpis(e.target.value)}
              rows={3}
              style={{ ...input, resize: "vertical" }}
            />
          </div>

          <div style={field}>
            <label style={label}>Dodano gorivo (L)</label>
            <input
              value={fGorivo}
              onChange={(e) => setFGorivo(e.target.value)}
              placeholder="npr. 0.5"
              style={input}
            />
          </div>

          <div style={field}>
            <label style={label}>Tko je koristio</label>
            <select
              value={fKorisnik}
              onChange={(e) => setFKorisnik(e.target.value)}
              style={input}
            >
              <option value="">— Odaberi člana —</option>
              {clanovi.map((c) => (
                <option key={c.id} value={`${c.ime} ${c.prezime}`}>
                  {c.ime} {c.prezime}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
          <button
            className="btn-secondary"
            onClick={() => {
              setAddEntryOpen(false);
              setEditEntry(null);
            }}
          >
            Odustani
          </button>
          <button onClick={saveEntry}>Spremi</button>
        </div>
      </Modal>
    </div>
  );
}

/* ===== UI sitnice ===== */
const th = {
  textAlign: "left",
  padding: "10px 12px",
  fontWeight: 700,
  borderBottom: "1px solid #e4e7eb",
};
const thRight = { ...th, textAlign: "right" };
const td = {
  padding: "10px 12px",
  borderBottom: "1px solid #f0f0f0",
  verticalAlign: "top",
  fontSize: 14,
};
const tdRight = { ...td, textAlign: "right" };

const field = { display: "grid", gap: 6 };
const label = { fontSize: 13, color: "#333" };
const input = {
  padding: "10px 12px",
  border: "1px solid #ccc",
  background: "#fff",
  color: "#000",
  borderRadius: 10,
  outline: "none",
};
