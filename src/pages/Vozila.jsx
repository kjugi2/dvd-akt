// src/pages/Vozila.jsx
import { useState, useMemo, useEffect } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import hr from "date-fns/locale/hr";
registerLocale("hr", hr);

import { VozilaAPI } from "../services/db";

/* ===== Helperi: datum <-> "YYYY-MM-DD" ===== */
function toYMD(date) {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function fromYMD(ymd) {
  if (!ymd) return null;
  const [y, m, d] = (ymd || "").split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export default function Vozila() {
  // === LOKALNO STANJE (kao u Clanovi.jsx) ===
  const [vozila, setVozila] = useState([]);
  const [lastError, setLastError] = useState("");

  const [showForm, setShowForm] = useState(false);

  // polja forme
  const [tip, setTip] = useState("");
  const [model, setModel] = useState("");
  const [registracija, setRegistracija] = useState("");
  const [tehnickiDate, setTehnickiDate] = useState(null);
  const [servisDate, setServisDate] = useState(null);
  const [status, setStatus] = useState("");

  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  // custom confirm modal za brisanje
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmId, setConfirmId] = useState(null);

  /* === UČITAVANJE IZ BAZE (REALTIME) === */
  useEffect(() => {
    let unsub;
    (async () => {
      try {
        unsub = await VozilaAPI.subscribe(setVozila);
      } catch (err) {
        console.error("Greška pri subscribe-u na vozila:", err);
        setLastError(err?.message || String(err));
      }
    })();
    // ESC zatvaranje forma/confirm
    const onEsc = (e) => {
      if (e.key === "Escape") {
        if (confirmOpen) {
          setConfirmOpen(false);
          setConfirmId(null);
        } else if (showForm) {
          resetForm();
          setShowForm(false);
        }
      }
    };
    window.addEventListener("keydown", onEsc);
    return () => {
      unsub && unsub();
      window.removeEventListener("keydown", onEsc);
    };
  }, [showForm, confirmOpen]);

  const resetForm = () => {
    setTip("");
    setModel("");
    setRegistracija("");
    setTehnickiDate(null);
    setServisDate(null);
    setStatus("");
    setEditId(null);
    setSaving(false);
    setLastError("");
  };

  // Dodavanje u Firestore
  const dodajVozilo = async () => {
    if (!tip || !model.trim() || !registracija.trim() || !status) {
      alert("Tip, model, registracija i status su obavezni.");
      return;
    }
    setSaving(true);
    setLastError("");
    try {
      const payload = {
        tip,
        model: model.trim(),
        registracija: registracija.trim().toUpperCase(),
        tehnicki: toYMD(tehnickiDate) || "",
        servis: toYMD(servisDate) || "",
        status,
      };
      console.log("[Vozila] create payload:", payload);
      await VozilaAPI.create(payload);
      resetForm();
      setShowForm(false); // subscribe će donijeti novi zapis
    } catch (err) {
      console.error("Greška pri dodavanju vozila:", err);
      setLastError(err?.message || String(err));
      setSaving(false);
    }
  };

  // Spremanje izmjena u Firestore
  const spremiVozilo = async () => {
    if (!editId || !tip || !model.trim() || !registracija.trim() || !status) {
      alert("Tip, model, registracija i status su obavezni.");
      return;
    }
    setSaving(true);
    setLastError("");
    try {
      const payload = {
        tip,
        model: model.trim(),
        registracija: registracija.trim().toUpperCase(),
        tehnicki: toYMD(tehnickiDate) || "",
        servis: toYMD(servisDate) || "",
        status,
      };
      console.log("[Vozila] update payload:", editId, payload);
      await VozilaAPI.update(editId, payload);
      resetForm();
      setShowForm(false);
    } catch (err) {
      console.error("Greška pri spremanju vozila:", err);
      setLastError(err?.message || String(err));
      setSaving(false);
    }
  };

  // Uređivanje
  const uredi = (id) => {
    const v = vozila.find((x) => x.id === id);
    if (!v) return;
    setEditId(id);
    setTip(v.tip || "");
    setModel(v.model || "");
    setRegistracija(v.registracija || "");
    setTehnickiDate(fromYMD(v.tehnicki || ""));
    setServisDate(fromYMD(v.servis || ""));
    setStatus(v.status || "");
    setShowForm(true);
  };

  // Klik na "Obriši" -> otvori custom confirm
  const potvrdiBrisanje = (id) => {
    setConfirmId(id);
    setConfirmOpen(true);
  };

  // Brisanje (iz confirm modala)
  const obrisiPotvrdjeno = async () => {
    const id = confirmId;
    setConfirmOpen(false);
    setConfirmId(null);
    if (!id) return;
    try {
      await VozilaAPI.remove(id);
    } catch (err) {
      console.error("Greška pri brisanju vozila:", err);
      setLastError(err?.message || String(err));
    }
  };

  const filtered = useMemo(() => vozila, [vozila]);

  const voziloZaPotvrdu = useMemo(() => {
    if (!confirmId) return null;
    return filtered.find((v) => v.id === confirmId) || null;
  }, [confirmId, filtered]);

  return (
    <div className="main-content">
      <h2>Vozila</h2>

      {/* Error banner ako nešto pođe po zlu (rules, offline, sl.) */}
      {lastError && (
        <div
          style={{
            background: "#ffe6e6",
            border: "1px solid #ffb3b3",
            color: "#900",
            padding: "8px 12px",
            borderRadius: 6,
            marginBottom: 12,
          }}
        >
          <b>Greška:</b> {lastError}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="info">
          Nema vozila u bazi. Klikni <b>Dodaj vozilo</b> za unos prvog.
        </div>
      )}

      <button onClick={() => setShowForm(true)}>Dodaj vozilo</button>

      <div className="table-wrap" style={{ marginTop: 12 }}>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Tip</th>
              <th>Model</th>
              <th>Registracija</th>
              <th>Tehnički</th>
              <th>Servis</th>
              <th>Status</th>
              <th>Akcije</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((v, i) => (
              <tr key={v.id || i}>
                <td>{i + 1}</td>
                <td>{v.tip || "—"}</td>
                <td>{v.model || "—"}</td>
                <td>{v.registracija || "—"}</td>
                <td>{v.tehnicki || "—"}</td>
                <td>{v.servis || "—"}</td>
                <td>{v.status || "—"}</td>
                <td>
                  <div className="actions">
                    <button className="btn-secondary" onClick={() => uredi(v.id)}>
                      Uredi
                    </button>
                    <button className="btn-danger" onClick={() => potvrdiBrisanje(v.id)}>
                      Obriši
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8}>Nema unosa.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal forma */}
      {showForm && (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => { resetForm(); setShowForm(false); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editId ? "Uredi vozilo" : "Dodaj vozilo"}</h3>

            <div className="modal-body">
              <div className="form-col">
                <label>Tipizacija vozila</label>
                <select value={tip} onChange={(e) => setTip(e.target.value)}>
                  <option value="">Odaberi tip…</option>
                  <option value="Navalno vozilo">Navalno vozilo</option>
                  <option value="Kombi">Kombi</option>
                  <option value="Ostalo">Ostalo</option>
                </select>
              </div>

              <div className="form-col">
                <label>Model</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                />
              </div>

              <div className="form-col">
                <label>Registracija</label>
                <input
                  type="text"
                  value={registracija}
                  onChange={(e) => setRegistracija(e.target.value)}
                />
              </div>

              <div className="form-col">
                <label>Tehnički</label>
                <DatePicker
                  selected={tehnickiDate}
                  onChange={(d) => setTehnickiDate(d)}
                  dateFormat="dd.MM.yyyy"
                  placeholderText="Odaberi datum"
                  locale="hr"
                  showMonthDropdown
                  showYearDropdown
                  dropdownMode="select"
                  isClearable
                  withPortal
                  portalId="root"
                  popperClassName="react-datepicker-popper"
                />
              </div>

              <div className="form-col">
                <label>Servis</label>
                <DatePicker
                  selected={servisDate}
                  onChange={(d) => setServisDate(d)}
                  dateFormat="dd.MM.yyyy"
                  placeholderText="Odaberi datum"
                  locale="hr"
                  showMonthDropdown
                  showYearDropdown
                  dropdownMode="select"
                  isClearable
                  withPortal
                  portalId="root"
                  popperClassName="react-datepicker-popper"
                />
              </div>

              <div className="form-col">
                <label>Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="">Odaberi status…</option>
                  <option value="Operativno">Operativno</option>
                  <option value="U servisu">U servisu</option>
                  <option value="Neispravno">Neispravno</option>
                </select>
              </div>

              <div className="form-row">
                {editId ? (
                  <button disabled={saving} onClick={spremiVozilo}>
                    {saving ? "Spremam..." : "Spremi izmjene"}
                  </button>
                ) : (
                  <button disabled={saving} onClick={dodajVozilo}>
                    {saving ? "Spremam..." : "Spremi"}
                  </button>
                )}
                <button
                  className="btn-secondary"
                  onClick={() => {
                    resetForm();
                    setShowForm(false);
                  }}
                >
                  Odustani
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom confirm modal za brisanje */}
      {confirmOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => { setConfirmOpen(false); setConfirmId(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Potvrda brisanja</h3>
            <div className="modal-body">
              <p style={{ marginBottom: 16 }}>
                Sigurno obrisati vozilo{" "}
                <b>
                  {voziloZaPotvrdu
                    ? `${voziloZaPotvrdu.model || "bez modela"} (${voziloZaPotvrdu.registracija || "bez registracije"})`
                    : "?"}
                </b>
                ?
              </p>
              <div className="form-row">
                <button className="btn-danger" onClick={obrisiPotvrdjeno}>
                  Da, obriši
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setConfirmOpen(false);
                    setConfirmId(null);
                  }}
                >
                  Odustani
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
