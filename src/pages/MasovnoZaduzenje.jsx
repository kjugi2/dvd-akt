// src/pages/MasovnoZaduzenje.jsx
import { useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import DatePicker, { registerLocale } from "react-datepicker";
import hr from "date-fns/locale/hr";
registerLocale("hr", hr);

import { SkladisteAPI, ZaduzenjaAPI } from "../services/db";

/* datum -> "YYYY-MM-DD" */
function toYMD(date) {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Ako dobije prop `open={true}` -> rendera se kao drawer (popout).
 * Inače se ponaša kao obična stranica (unutarnji <div>).
 */
export default function MasovnoZaduzenje({
  clanovi = [],
  open,               // boolean | undefined
  onClose = () => {}, // callback kad se klikne zatvori/overlay
}) {
  const [skladiste, setSkladiste] = useState([]);
  const [zaduzenja, setZaduzenja] = useState([]);

  useEffect(() => {
    let unsubs = [];
    (async () => {
      unsubs.push(await SkladisteAPI.subscribe(setSkladiste));
      unsubs.push(await ZaduzenjaAPI.subscribe(setZaduzenja));
    })();
    return () => { unsubs.forEach(u => u && u()); };
  }, []);

  const safeClanovi   = Array.isArray(clanovi)   ? clanovi   : [];
  const safeSkladiste = Array.isArray(skladiste) ? skladiste : [];
  const safeZaduzenja = Array.isArray(zaduzenja) ? zaduzenja : [];

  // ---- helperi za “dostupno” ----
  const zauzetoCountByArtikal = useMemo(() => {
    const m = new Map();
    for (const z of safeZaduzenja) {
      m.set(z.artikalId, (m.get(z.artikalId) || 0) + 1);
    }
    return m;
  }, [safeZaduzenja]);

  const getDostupno = (artikalId) => {
    const a = safeSkladiste.find((x) => x.id === artikalId);
    if (!a) return 0;
    const zauzeto = zauzetoCountByArtikal.get(artikalId) || 0;
    return Math.max(0, (a.ukupno || 0) - zauzeto);
  };

  // ---- forma ----
  const [clanId, setClanId] = useState("");
  const [datum, setDatum]   = useState(null);
  const [rows, setRows]     = useState([{ id: uuidv4(), artikalId: "", kolicina: 1, oznaka: "" }]);

  const addRow    = () => setRows((r) => [...r, { id: uuidv4(), artikalId: "", kolicina: 1, oznaka: "" }]);
  const removeRow = (id) => setRows((r) => (r.length > 1 ? r.filter((x) => x.id !== id) : r));
  const updateRow = (id, patch) => setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  // validacije (ukupna tražena količina istog artikla <= dostupno)
  const requestedByArtikal = useMemo(() => {
    const m = new Map();
    for (const row of rows) {
      if (!row.artikalId) continue;
      const k = Math.max(0, parseInt(row.kolicina || 0, 10));
      m.set(row.artikalId, (m.get(row.artikalId) || 0) + k);
    }
    return m;
  }, [rows]);

  const validationErrors = useMemo(() => {
    const errs = {};
    for (const row of rows) {
      if (!row.artikalId) {
        errs[row.id] = "Odaberi artikl.";
        continue;
      }
      const req = Math.max(0, parseInt(row.kolicina || 0, 10));
      if (req < 1) {
        errs[row.id] = "Količina mora biti ≥ 1.";
        continue;
      }
      const free = getDostupno(row.artikalId);
      const totalReqForThis = requestedByArtikal.get(row.artikalId) || 0;
      if (totalReqForThis > free) {
        errs[row.id] = `Traženo ${totalReqForThis}, dostupno ${free}.`;
      }
    }
    return errs;
  }, [rows, requestedByArtikal, zauzetoCountByArtikal]);

  const canSubmit =
    !!clanId &&
    rows.length > 0 &&
    Object.keys(validationErrors).length === 0 &&
    rows.every((r) => r.artikalId && parseInt(r.kolicina || 0, 10) >= 1);

  const submit = async () => {
    if (!canSubmit) return;
    const dateYMD = toYMD(datum) || toYMD(new Date());
    const toInsert = [];
    for (const row of rows) {
      const k = Math.max(0, parseInt(row.kolicina || 0, 10));
      for (let i = 0; i < k; i++) {
        toInsert.push({
          clanId,
          artikalId: row.artikalId,
          oznaka: (row.oznaka || "").trim() || null,
          datumYMD: dateYMD,
        });
      }
    }
    try {
      for (const rec of toInsert) {
        await ZaduzenjaAPI.create(rec);
      }
      setClanId("");
      setDatum(null);
      setRows([{ id: uuidv4(), artikalId: "", kolicina: 1, oznaka: "" }]);
      onClose();
    } catch (err) {
      console.error("Greška masovnog zaduženja:", err);
      alert("Greška masovnog zaduženja: " + (err?.message || String(err)));
    }
  };

  const clanName = (id) => {
    const c = safeClanovi.find((x) => x.id === id);
    return c ? `${c.prezime} ${c.ime}` : "—";
  };

  // -------- SHELL: drawer ili stranica --------
  const Inner = (
    <div>
      <h2 style={{ marginTop: 0 }}>Masovno zaduženje</h2>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-header">
          <h3 style={{ margin: 0 }}>1) Odaberi člana i datum</h3>
        </div>
        <div className="form-row">
          <select value={clanId} onChange={(e) => setClanId(e.target.value)}>
            <option value="">Odaberi člana…</option>
            {safeClanovi.map((c) => (
              <option key={c.id} value={c.id}>
                {c.prezime} {c.ime}
              </option>
            ))}
          </select>

          <DatePicker
            selected={datum}
            onChange={(d) => setDatum(d)}
            dateFormat="dd.MM.yyyy"
            placeholderText="Datum zaduženja"
            locale="hr"
            isClearable
            withPortal
            portalId="root"
            popperClassName="react-datepicker-popper"
          />
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-header">
          <h3 style={{ margin: 0 }}>2) Dodaj stavke opreme</h3>
          <div className="card-actions">
            <button className="btn-secondary" onClick={addRow}>Dodaj stavku</button>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{minWidth: 240}}>Artikl</th>
                <th style={{width: 140}}>Količina</th>
                <th>Oznaka (opcionalno)</th>
                <th style={{width: 140}}>Dostupno</th>
                <th style={{width: 140}}>Akcije</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const free = row.artikalId ? getDostupno(row.artikalId) : 0;
                const err  = validationErrors[row.id];
                return (
                  <tr key={row.id}>
                    <td>
                      <select
                        value={row.artikalId}
                        onChange={(e) => updateRow(row.id, { artikalId: e.target.value })}
                      >
                        <option value="">Odaberi artikl…</option>
                        {safeSkladiste.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.naziv} — ukupno: {a.ukupno} / dostupno: {getDostupno(a.id)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        min={1}
                        value={row.kolicina}
                        onChange={(e) => updateRow(row.id, { kolicina: e.target.value })}
                        style={{ maxWidth: 120 }}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        placeholder="oznaka / inventarski br."
                        value={row.oznaka}
                        onChange={(e) => updateRow(row.id, { oznaka: e.target.value })}
                      />
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background: free > 0 ? "#eef7ee" : "#ffebee",
                          borderColor: free > 0 ? "#cde7cd" : "#f3c7c7",
                          color: free > 0 ? "#205520" : "#8a1313",
                          fontWeight: 600,
                        }}
                      >
                        {row.artikalId ? free : "—"}
                      </span>
                    </td>
                    <td>
                      <div className="actions">
                        <button
                          className="btn-danger"
                          onClick={() => removeRow(row.id)}
                          disabled={rows.length === 1}
                        >
                          Ukloni
                        </button>
                      </div>
                      {err && (
                        <div style={{ color: "#b3261e", fontSize: 12, marginTop: 6 }}>
                          {err}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan="5">Nema stavki. Dodaj barem jednu.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 style={{ margin: 0 }}>3) Potvrdi zaduženje</h3>
        </div>
        <div className="form-row">
          <button onClick={submit} disabled={!canSubmit}>
            Zaduži {clanId ? `— ${clanName(clanId)}` : ""}
          </button>
          {!canSubmit && (
            <span style={{ color: "#b3261e" }}>
              &nbsp;Popuni obavezna polja i provjeri količine.
            </span>
          )}
        </div>
      </div>
    </div>
  );

  // Ako `open` nije boolean => render kao stranica
  if (typeof open !== "boolean") {
    return <div>{Inner}</div>;
  }

  // Ako `open === false` => ništa (zatvoren drawer)
  if (!open) return null;

  // Drawer
  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div
        className="drawer-panel drawer-wide"
        style={{ width: "clamp(900px, 80vw, 1400px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="drawer-header">
          <h3 style={{ margin: 0 }}>Masovno zaduženje</h3>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="drawer-body">{Inner}</div>
        <div className="drawer-actions">
          <button className="btn-secondary" onClick={onClose}>Zatvori</button>
        </div>
      </div>
    </div>
  );
}
