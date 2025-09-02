// src/pages/KnjigaZaduzenja.jsx
import { useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import DatePicker, { registerLocale } from "react-datepicker";
import hr from "date-fns/locale/hr";
registerLocale("hr", hr);

/* datum -> "YYYY-MM-DD" */
function toYMD(date) {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function KnjigaZaduzenja({
  clanovi = [],
  skladiste,
  setSkladiste = () => {},
  zaduzenja,
  setZaduzenja = () => {},
}) {
  /* ===== Sigurni nizovi ===== */
  const safeClanovi   = Array.isArray(clanovi)   ? clanovi   : [];
  const safeSkladiste = Array.isArray(skladiste) ? skladiste : [];
  const safeZaduzenja = Array.isArray(zaduzenja) ? zaduzenja : [];

  /* ===== Nabava ===== */
  const [nazivArtikla, setNazivArtikla] = useState("");
  const [kolicina, setKolicina] = useState(1);

  const dodajUNabavu = () => {
    const naziv = nazivArtikla.trim();
    const kol = Number(kolicina);
    if (!naziv || !kol || kol < 1) return;

    const postoji = safeSkladiste.find(
      (a) => a.naziv.toLowerCase() === naziv.toLowerCase()
    );
    if (postoji) {
      const updated = safeSkladiste.map((a) =>
        a.id === postoji.id ? { ...a, ukupno: (a.ukupno || 0) + kol } : a
      );
      setSkladiste(updated);
    } else {
      setSkladiste([...safeSkladiste, { id: uuidv4(), naziv, ukupno: kol }]);
    }

    setNazivArtikla("");
    setKolicina(1);
  };

  /* ===== Izračuni dostupnosti ===== */
  const countZaduzenjaByArtikal = useMemo(() => {
    const map = new Map();
    for (const z of safeZaduzenja) {
      map.set(z.artikalId, (map.get(z.artikalId) || 0) + 1);
    }
    return map;
  }, [safeZaduzenja]);

  const artikliSDostupnim = useMemo(
    () =>
      safeSkladiste.map((a) => ({
        ...a,
        dostupno: (a.ukupno || 0) - (countZaduzenjaByArtikal.get(a.id) || 0),
      })),
    [safeSkladiste, countZaduzenjaByArtikal]
  );

  const getDostupno = (artikalId) => {
    const a = safeSkladiste.find((x) => x.id === artikalId);
    if (!a) return 0;
    const zauzeto = safeZaduzenja.filter((z) => z.artikalId === artikalId).length;
    return (a.ukupno || 0) - zauzeto;
  };
  const getDostupnoExcluding = (artikalId, excludeZadId) => {
    const a = safeSkladiste.find((x) => x.id === artikalId);
    if (!a) return 0;
    const zauzeto = safeZaduzenja.filter(
      (z) => z.id !== excludeZadId && z.artikalId === artikalId
    ).length;
    return (a.ukupno || 0) - zauzeto;
  };

  /* ===== Sažeci zalihe ===== */
  const stockSummary = useMemo(() => {
    const totalItems = artikliSDostupnim.length;
    const totalPieces = artikliSDostupnim.reduce((s, a) => s + (a.ukupno || 0), 0);
    const totalAvailable = artikliSDostupnim.reduce((s, a) => s + (a.dostupno || 0), 0);
    const kriticni = artikliSDostupnim.filter((a) => (a.dostupno || 0) <= 0);
    return { totalItems, totalPieces, totalAvailable, kriticni };
  }, [artikliSDostupnim]);

  /* ===== Zaduži člana (pojedinačno) ===== */
  const [clanId, setClanId] = useState("");
  const [artikalId, setArtikalId] = useState("");
  const [oznaka, setOznaka] = useState("");
  const [datumZad, setDatumZad] = useState(null);

  const odabraniArtikal = artikliSDostupnim.find((a) => a.id === artikalId);
  const mozeZaduziti =
    !!clanId && !!artikalId && odabraniArtikal && odabraniArtikal.dostupno > 0;

  const zaduzi = () => {
    if (!mozeZaduziti) return;
    const novi = {
      id: uuidv4(),
      clanId,
      artikalId,
      oznaka: oznaka.trim() || null,
      datumYMD: toYMD(datumZad) || toYMD(new Date()),
    };
    setZaduzenja([...safeZaduzenja, novi]);
    setClanId("");
    setArtikalId("");
    setOznaka("");
    setDatumZad(null);
  };

  /* ===== Filteri / pretraga / export ===== */
  const [fltClanId, setFltClanId] = useState("");
  const [fltArtikalId, setFltArtikalId] = useState("");
  const [search, setSearch] = useState("");

  const clanPoId    = (id) => safeClanovi.find((c) => c.id === id);
  const artikalPoId = (id) => safeSkladiste.find((a) => a.id === id);

  const zaduzenjaSortFilt = useMemo(() => {
    let list = [...safeZaduzenja];

    if (fltClanId)    list = list.filter((z) => z.clanId === fltClanId);
    if (fltArtikalId) list = list.filter((z) => z.artikalId === fltArtikalId);

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((z) => {
        const c = clanPoId(z.clanId);
        const a = artikalPoId(z.artikalId);
        return (
          (c && (`${c.ime} ${c.prezime}`.toLowerCase().includes(q) ||
                 `${c.prezime} ${c.ime}`.toLowerCase().includes(q))) ||
          (a && a.naziv.toLowerCase().includes(q)) ||
          (z.oznaka && z.oznaka.toLowerCase().includes(q)) ||
          (z.datumYMD && z.datumYMD.includes(q))
        );
      });
    }

    list.sort((a, b) => (b.datumYMD || "").localeCompare(a.datumYMD || ""));
    return list;
  }, [safeZaduzenja, fltClanId, fltArtikalId, search, safeClanovi, safeSkladiste]);

  const downloadCSV = (filename, rows) => {
    if (!Array.isArray(rows) || rows.length === 0) return;
    const esc = (v) => {
      if (v == null) return "";
      const s = String(v).replace(/"/g, '""');
      return /[",\n;]/.test(s) ? `"${s}"` : s;
    };
    const header = Object.keys(rows[0]);
    const csv = [
      header.map(esc).join(";"),
      ...rows.map((r) => header.map((h) => esc(r[h])).join(";")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    const rows = zaduzenjaSortFilt.map((z, i) => {
      const c = clanPoId(z.clanId);
      const a = artikalPoId(z.artikalId);
      return {
        Rbr: i + 1,
        Clan: c ? `${c.prezime} ${c.ime}` : "",
        Artikl: a ? a.naziv : "",
        Oznaka: z.oznaka || "",
        Datum: z.datumYMD || "",
      };
    });
    downloadCSV("knjiga_zaduzenja.csv", rows);
  };

  const resetFiltere = () => {
    setFltClanId("");
    setFltArtikalId("");
    setSearch("");
  };

  /* ===== Uređivanje zalihe (artikl) ===== */
  const [editArtikal, setEditArtikal] = useState(null); // {id, naziv, ukupno}
  const openEditArtikal = (a) => setEditArtikal({ id: a.id, naziv: a.naziv, ukupno: a.ukupno ?? 0 });
  const closeEditArtikal = () => setEditArtikal(null);

  const saveEditArtikal = () => {
    if (!editArtikal) return;
    const { id, naziv, ukupno } = editArtikal;
    const trimmed = (naziv || "").trim();
    const broj = Number(ukupno);
    if (!trimmed || !Number.isFinite(broj) || broj < 0) return;

    const vecZaduzeno = safeZaduzenja.filter((z) => z.artikalId === id).length;
    if (broj < vecZaduzeno) {
      alert(`Ukupna količina (${broj}) ne može biti manja od već zaduženih (${vecZaduzeno}).`);
      return;
    }
    const updated = safeSkladiste.map((a) => (a.id === id ? { ...a, naziv: trimmed, ukupno: broj } : a));
    setSkladiste(updated);
    closeEditArtikal();
  };

  const obrisiArtikal = (id) => {
    const imaZaduzenja = safeZaduzenja.some((z) => z.artikalId === id);
    if (imaZaduzenja) {
      alert("Ne možeš obrisati artikl koji je zadužen. Prvo obriši/izmijeni zaduženja.");
      return;
    }
    if (!window.confirm("Obrisati ovaj artikl iz skladišta?")) return;
    setSkladiste(safeSkladiste.filter((a) => a.id !== id));
  };

  /* ===== Uređivanje zaduženja ===== */
  const [editZad, setEditZad] = useState(null); // {id, clanId, artikalId, oznaka, datumYMD}
  const openEditZad = (z) => setEditZad({ id: z.id, clanId: z.clanId, artikalId: z.artikalId, oznaka: z.oznaka || "", datumYMD: z.datumYMD || "" });
  const closeEditZad = () => setEditZad(null);

  const saveEditZad = () => {
    if (!editZad) return;
    const { id, clanId: ecid, artikalId: eaid, oznaka, datumYMD } = editZad;
    if (!ecid || !eaid) return;
    const dostupno = getDostupnoExcluding(eaid, id);
    if (dostupno < 1) {
      alert("Nema dostupnih komada odabranog artikla za ovo zaduženje.");
      return;
    }
    const updated = safeZaduzenja.map((z) =>
      z.id === id
        ? {
            ...z,
            clanId: ecid,
            artikalId: eaid,
            oznaka: (oznaka || "").trim() || null,
            datumYMD: datumYMD || toYMD(new Date()),
          }
        : z
    );
    setZaduzenja(updated);
    closeEditZad();
  };

  /* ===== Masovno zaduživanje (modal) ===== */
  const [massOpen, setMassOpen] = useState(false);
  const [massClanId, setMassClanId] = useState("");
  const [massDatum, setMassDatum] = useState(null);
  const [massRows, setMassRows] = useState([{ id: uuidv4(), artikalId: "", kolicina: 1, oznaka: "" }]);

  const massAddRow = () => setMassRows((r) => [...r, { id: uuidv4(), artikalId: "", kolicina: 1, oznaka: "" }]);
  const massRemoveRow = (id) => setMassRows((r) => (r.length > 1 ? r.filter((x) => x.id !== id) : r));
  const massUpdateRow = (id, patch) => setMassRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const massRequestedByArtikal = useMemo(() => {
    const m = new Map();
    for (const row of massRows) {
      if (!row.artikalId) continue;
      const k = Math.max(0, parseInt(row.kolicina || 0, 10));
      m.set(row.artikalId, (m.get(row.artikalId) || 0) + k);
    }
    return m;
  }, [massRows]);

  const massErrors = useMemo(() => {
    const errs = {};
    for (const row of massRows) {
      if (!row.artikalId) {
        errs[row.id] = "Odaberi artikl.";
        continue;
      }
      const k = Math.max(0, parseInt(row.kolicina || 0, 10));
      if (k < 1) {
        errs[row.id] = "Količina mora biti ≥ 1.";
        continue;
      }
      const free = getDostupno(row.artikalId);
      const totalReq = massRequestedByArtikal.get(row.artikalId) || 0;
      if (totalReq > free) {
        errs[row.id] = `Traženo ${totalReq}, dostupno ${free}.`;
      }
    }
    return errs;
  }, [massRows, massRequestedByArtikal, safeZaduzenja]);

  const massCanSubmit =
    !!massClanId &&
    massRows.length > 0 &&
    Object.keys(massErrors).length === 0 &&
    massRows.every((r) => r.artikalId && parseInt(r.kolicina || 0, 10) >= 1);

  const massSubmit = () => {
    if (!massCanSubmit) return;
    const dateYMD = toYMD(massDatum) || toYMD(new Date());
    const toInsert = [];
    for (const row of massRows) {
      const k = Math.max(0, parseInt(row.kolicina || 0, 10));
      for (let i = 0; i < k; i++) {
        toInsert.push({
          id: uuidv4(),
          clanId: massClanId,
          artikalId: row.artikalId,
          oznaka: (row.oznaka || "").trim() || null,
          datumYMD: dateYMD,
        });
      }
    }
    setZaduzenja([...safeZaduzenja, ...toInsert]);
    // reset
    setMassClanId("");
    setMassDatum(null);
    setMassRows([{ id: uuidv4(), artikalId: "", kolicina: 1, oznaka: "" }]);
    setMassOpen(false);
  };

  /* ===== UI state: sklopive zalihe + brza pretraga ===== */
  const [stockOpen, setStockOpen] = useState(true);
  const [quickSearch, setQuickSearch] = useState("");

  const artikliFiltrirani = useMemo(() => {
    if (!quickSearch.trim()) return artikliSDostupnim;
    const q = quickSearch.trim().toLowerCase();
    return artikliSDostupnim.filter((a) => a.naziv.toLowerCase().includes(q));
  }, [quickSearch, artikliSDostupnim]);

  return (
    <div>
      <h2>Knjiga zaduženja</h2>

      {/* ====== ZALIHE (SKLOPIVO) ====== */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-header">
          <h3 style={{ margin: 0 }}>Zalihe</h3>
          <div className="card-actions" style={{ display: "flex", gap: 8 }}>
            <button className="btn-secondary" onClick={() => setStockOpen((s) => !s)}>
              {stockOpen ? "Sakrij zalihe" : "Prikaži zalihe"}
            </button>
          </div>
        </div>

        {!stockOpen ? (
          <div style={{ display: "grid", gap: 8 }}>
            <div className="stats-tiles" style={{ marginBottom: 0 }}>
              <div className="tile tile-gray">
                <div className="tile-big">{stockSummary.totalItems}</div>
                <div className="tile-sub">artikala</div>
              </div>
              <div className="tile tile-yellow">
                <div className="tile-big">{stockSummary.totalPieces}</div>
                <div className="tile-sub">ukupno komada</div>
              </div>
              <div className="tile tile-red">
                <div className="tile-big">{stockSummary.totalAvailable}</div>
                <div className="tile-sub">dostupno</div>
              </div>
            </div>

            {stockSummary.kriticni.length > 0 && (
              <div>
                <div style={{ fontSize: 13, color: "#666", marginBottom: 6 }}>Kritični (0 dostupno):</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {stockSummary.kriticni.map((a) => (
                    <span key={a.id} className="badge" style={{ background: "#ffebee", borderColor: "#f3c7c7", color: "#8a1313" }}>
                      {a.naziv}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="form-row">
              <input
                className="search"
                type="text"
                placeholder="Brza pretraga po nazivu…"
                value={quickSearch}
                onChange={(e) => setQuickSearch(e.target.value)}
              />
              <button className="btn-secondary" onClick={() => setStockOpen(true)}>
                Prikaži detalje
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Nabava */}
            <div className="form-row">
              <input
                type="text"
                placeholder="Naziv artikla (npr. Kaciga)"
                value={nazivArtikla}
                onChange={(e) => setNazivArtikla(e.target.value)}
              />
              <input
                type="number"
                min={1}
                value={kolicina}
                onChange={(e) => setKolicina(e.target.value)}
                style={{ maxWidth: 120 }}
              />
              <button onClick={dodajUNabavu}>Dodaj u zalihu</button>
            </div>

            {/* Tablica zaliha */}
            <div className="form-row" style={{ marginTop: 4, marginBottom: 8 }}>
              <input
                className="search"
                type="text"
                placeholder="Filtriraj zalihe po nazivu…"
                value={quickSearch}
                onChange={(e) => setQuickSearch(e.target.value)}
              />
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Artikl</th>
                    <th>Ukupno</th>
                    <th>Dostupno</th>
                    <th>Akcije</th>
                  </tr>
                </thead>
                <tbody>
                  {artikliFiltrirani.map((a, i) => (
                    <tr key={a.id}>
                      <td>{i + 1}</td>
                      <td>{a.naziv}</td>
                      <td>{a.ukupno}</td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            background: a.dostupno > 0 ? "#eef7ee" : "#ffebee",
                            borderColor: a.dostupno > 0 ? "#cde7cd" : "#f3c7c7",
                            color: a.dostupno > 0 ? "#205520" : "#8a1313",
                            fontWeight: 600,
                          }}
                        >
                          {a.dostupno}
                        </span>
                      </td>
                      <td>
                        <div className="actions">
                          <button className="btn-secondary" onClick={() => openEditArtikal(a)}>
                            Uredi
                          </button>
                          <button className="btn-danger" onClick={() => obrisiArtikal(a.id)}>
                            Obriši
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {artikliFiltrirani.length === 0 && (
                    <tr>
                      <td colSpan="5">Nema artikala za prikaz.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ====== ZADUŽI ČLANA (pojedinačno) + MASOVNO ====== */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-header">
          <h3 style={{ margin: 0 }}>Zaduži člana</h3>
          <div className="card-actions">
            <button className="btn-secondary" onClick={() => setMassOpen(true)}>
              Masovno zaduživanje
            </button>
          </div>
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

          <select value={artikalId} onChange={(e) => setArtikalId(e.target.value)}>
            <option value="">Odaberi artikl…</option>
            {artikliSDostupnim.map((a) => (
              <option key={a.id} value={a.id} disabled={a.dostupno < 1}>
                {a.naziv} {a.dostupno < 1 ? "(nema dostupnih)" : `- dostupno: ${a.dostupno}`}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Oznaka / Inventarski br. (opcionalno)"
            value={oznaka}
            onChange={(e) => setOznaka(e.target.value)}
          />

          <DatePicker
            selected={datumZad}
            onChange={(d) => setDatumZad(d)}
            dateFormat="dd.MM.yyyy"
            placeholderText="Datum zaduženja"
            locale="hr"
            isClearable
            withPortal
            portalId="root"
            popperClassName="react-datepicker-popper"
          />

          <button onClick={zaduzi} disabled={!mozeZaduziti}>
            Zaduži
          </button>
        </div>
      </div>

      {/* ====== FILTERI / AKCIJE ====== */}
      <div className="list-header">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select
            value={fltClanId}
            onChange={(e) => setFltClanId(e.target.value)}
            className="search"
          >
            <option value="">Filter po članu…</option>
            {safeClanovi.map((c) => (
              <option key={c.id} value={c.id}>
                {c.prezime} {c.ime}
              </option>
            ))}
          </select>

          <select
            value={fltArtikalId}
            onChange={(e) => setFltArtikalId(e.target.value)}
            className="search"
          >
            <option value="">Filter po artiklu…</option>
            {safeSkladiste.map((a) => (
              <option key={a.id} value={a.id}>
                {a.naziv}
              </option>
            ))}
          </select>

          <input
            className="search"
            type="text"
            placeholder="Pretraži (član, artikl, oznaka, datum)…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-secondary" onClick={resetFiltere}>
            Reset filtera
          </button>
          <button onClick={exportCSV}>Export CSV</button>
        </div>
      </div>

      {/* ====== POPIS ZADUŽENJA ====== */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Član</th>
              <th>Artikl</th>
              <th>Oznaka</th>
              <th>Datum</th>
              <th>Akcije</th>
            </tr>
          </thead>
          <tbody>
            {zaduzenjaSortFilt.map((z, i) => {
              const c = clanPoId(z.clanId);
              const a = artikalPoId(z.artikalId);
              return (
                <tr key={z.id}>
                  <td>{i + 1}</td>
                  <td>{c ? `${c.prezime} ${c.ime}` : "—"}</td>
                  <td>{a ? a.naziv : "—"}</td>
                  <td>{z.oznaka || "—"}</td>
                  <td>{z.datumYMD || "—"}</td>
                  <td>
                    <div className="actions">
                      <button className="btn-secondary" onClick={() => openEditZad(z)}>
                        Uredi
                      </button>
                      <button className="btn-danger" onClick={() => {
                        if (!window.confirm("Obrisati ovaj zapis zaduženja?")) return;
                        setZaduzenja(safeZaduzenja.filter((x) => x.id !== z.id));
                      }}>
                        Obriši
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {zaduzenjaSortFilt.length === 0 && (
              <tr>
                <td colSpan="6">Nema zaduženja.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ===== MODAL: Uredi artikl ===== */}
      {editArtikal && (
        <div className="modal-overlay" onMouseDown={(e) => e.stopPropagation()}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <h3>Uredi artikl</h3>
            <div className="form-col">
              <label>Naziv</label>
              <input
                type="text"
                value={editArtikal.naziv}
                onChange={(e) => setEditArtikal((s) => ({ ...s, naziv: e.target.value }))}
              />
            </div>
            <div className="form-col">
              <label>Ukupno</label>
              <input
                type="number"
                min={0}
                value={editArtikal.ukupno}
                onChange={(e) => setEditArtikal((s) => ({ ...s, ukupno: e.target.value }))}
              />
            </div>

            <div className="form-row">
              <button onClick={saveEditArtikal}>Spremi</button>
              <button className="btn-secondary" onClick={closeEditArtikal}>Odustani</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: Uredi zaduženje ===== */}
      {editZad && (
        <div className="modal-overlay" onMouseDown={(e) => e.stopPropagation()}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <h3>Uredi zaduženje</h3>

            <div className="form-col">
              <label>Član</label>
              <select
                value={editZad.clanId}
                onChange={(e) => setEditZad((s) => ({ ...s, clanId: e.target.value }))}
              >
                <option value="">Odaberi člana…</option>
                {safeClanovi.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.prezime} {c.ime}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-col">
              <label>Artikl</label>
              <select
                value={editZad.artikalId}
                onChange={(e) => setEditZad((s) => ({ ...s, artikalId: e.target.value }))}
              >
                <option value="">Odaberi artikl…</option>
                {safeSkladiste.map((a) => {
                  const dostupno = getDostupnoExcluding(a.id, editZad.id);
                  const disabled = dostupno < 1 && a.id !== editZad.artikalId;
                  const suffix =
                    a.id === editZad.artikalId
                      ? " (trenutno dodijeljen)"
                      : disabled
                      ? " (nema dostupnih)"
                      : ` - dostupno: ${dostupno}`;
                  return (
                    <option key={a.id} value={a.id} disabled={disabled}>
                      {a.naziv}{suffix}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="form-col">
              <label>Oznaka (opcionalno)</label>
              <input
                type="text"
                value={editZad.oznaka || ""}
                onChange={(e) => setEditZad((s) => ({ ...s, oznaka: e.target.value }))}
              />
            </div>

            <div className="form-col">
              <label>Datum zaduženja</label>
              <DatePicker
                selected={editZad.datumYMD ? new Date(editZad.datumYMD) : null}
                onChange={(d) => setEditZad((s) => ({ ...s, datumYMD: toYMD(d) }))}
                dateFormat="dd.MM.yyyy"
                placeholderText="Datum"
                locale="hr"
                isClearable
                withPortal
                portalId="root"
                popperClassName="react-datepicker-popper"
              />
            </div>

            <div className="form-row">
              <button onClick={saveEditZad}>Spremi</button>
              <button className="btn-secondary" onClick={closeEditZad}>Odustani</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: Masovno zaduživanje (ŠIROKO) ===== */}
      {massOpen && (
        <div className="modal-overlay" onMouseDown={(e) => e.stopPropagation()}>
          <div
            className="modal"
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              width: "min(1100px, 96vw)",   // <<<<<< OVDJE GA ŠIRIMO
            }}
          >
            <h3>Masovno zaduživanje</h3>

            <div className="form-row">
              <select value={massClanId} onChange={(e) => setMassClanId(e.target.value)}>
                <option value="">Odaberi člana…</option>
                {safeClanovi.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.prezime} {c.ime}
                  </option>
                ))}
              </select>

              <DatePicker
                selected={massDatum}
                onChange={(d) => setMassDatum(d)}
                dateFormat="dd.MM.yyyy"
                placeholderText="Datum zaduženja"
                locale="hr"
                isClearable
                withPortal
                portalId="root"
                popperClassName="react-datepicker-popper"
              />
            </div>

            <div className="table-wrap" style={{ marginTop: 8 }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ minWidth: 260 }}>Artikl</th>
                    <th style={{ width: 140 }}>Količina</th>
                    <th>Oznaka (opcionalno)</th>
                    <th style={{ width: 160 }}>Dostupno</th>
                    <th style={{ width: 140 }}>Akcije</th>
                  </tr>
                </thead>
                <tbody>
                  {massRows.map((row) => {
                    const free = row.artikalId ? getDostupno(row.artikalId) : 0;
                    let err = "";
                    if (!row.artikalId) err = "Odaberi artikl.";
                    const k = Math.max(0, parseInt(row.kolicina || 0, 10));
                    if (!err && k < 1) err = "Količina mora biti ≥ 1.";

                    return (
                      <tr key={row.id}>
                        <td>
                          <select
                            value={row.artikalId}
                            onChange={(e) => massUpdateRow(row.id, { artikalId: e.target.value })}
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
                            onChange={(e) => massUpdateRow(row.id, { kolicina: e.target.value })}
                            style={{ maxWidth: 130 }}
                          />
                        </td>

                        <td>
                          <input
                            type="text"
                            placeholder="oznaka / inventarski br."
                            value={row.oznaka}
                            onChange={(e) => massUpdateRow(row.id, { oznaka: e.target.value })}
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
                              onClick={() => massRemoveRow(row.id)}
                              disabled={massRows.length === 1}
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
                  {massRows.length === 0 && (
                    <tr><td colSpan="5">Dodaj barem jednu stavku.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="drawer-actions" style={{ borderTop: "none", paddingTop: 0 }}>
              <button className="btn-secondary" onClick={massAddRow}>Dodaj stavku</button>
              <div style={{ flex: 1 }} />
              <button onClick={massSubmit} disabled={!massCanSubmit}>
                Zaduži odabrane
              </button>
              <button className="btn-secondary" onClick={() => setMassOpen(false)}>
                Zatvori
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
