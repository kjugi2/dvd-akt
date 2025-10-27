// src/pages/DogadajiKategorije.jsx
import { useEffect, useMemo, useState } from "react";
import { AktivnostiAPI, AktivnostiKategorijeAPI } from "../services/db";

/* ===== helper za normalizaciju ===== */
const normalizeName = (s) =>
  (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

/* ===== Modal (isti stil kao u Kontrolnoj knjizi) ===== */
function Modal({ open, onClose, title, children, maxWidth = 600 }) {
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

export default function DogadajiKategorije() {
  /* ===== SVI STATE-OVI NA VRHU ===== */
  // kategorije
  const [kategorije, setKategorije] = useState([]);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [catEdit, setCatEdit] = useState(null);
  const [catName, setCatName] = useState("");

  // aktivnosti (po kategoriji)
  const [aktivnostiByCat, setAktivnostiByCat] = useState({}); // {catId: Array}
  const [expandedCatIds, setExpandedCatIds] = useState([]);   // otvorene kategorije

  // modal: aktivnost (single edit ili bulk add)
  const [actModalOpen, setActModalOpen] = useState(false);
  const [actEdit, setActEdit] = useState(null); // ako postoji -> single edit, inače bulk add
  const [actCatId, setActCatId] = useState("");

  // za single edit
  const [actName, setActName] = useState("");

  // za bulk add
  const [pendingActs, setPendingActs] = useState([]); // array stringova
  const [pendingInput, setPendingInput] = useState("");

  /* ===== SUBSCRIBE NA KATEGORIJE + ESC HANDLER ===== */
  useEffect(() => {
    let unsubCats = null;
    (async () => {
      try {
        unsubCats = await AktivnostiKategorijeAPI.subscribe(setKategorije);
      } catch (err) {
        console.error("Subscribe kategorije error:", err);
      }
    })();

    const onEsc = (e) => {
      if (e.key !== "Escape") return;
      if (catModalOpen) { setCatModalOpen(false); setCatEdit(null); return; }
      if (actModalOpen) {
        setActModalOpen(false);
        setActEdit(null);
        setPendingActs([]);
        setPendingInput("");
        return;
      }
      if (expandedCatIds.length) setExpandedCatIds([]); // skupi sve
    };
    window.addEventListener("keydown", onEsc);

    return () => {
      if (typeof unsubCats === "function") unsubCats();
      window.removeEventListener("keydown", onEsc);
    };
  }, [catModalOpen, actModalOpen, expandedCatIds.length]);

  /* ===== SUBSCRIBE NA AKTIVNOSTI ZA SVAKU OTVORENU KATEGORIJU ===== */
  useEffect(() => {
    const unsubs = {};
    (async () => {
      for (const catId of expandedCatIds) {
        try {
          unsubs[catId] = await AktivnostiAPI.subscribe(
            (rows) =>
              setAktivnostiByCat((prev) => ({
                ...prev,
                [catId]: rows.filter((r) => r.kategorijaId === catId),
              })),
            [["kategorijaId", "==", catId]]
          );
        } catch (err) {
          console.error(`Subscribe aktivnosti (${catId}) error:`, err);
        }
      }
    })();
    return () => Object.values(unsubs).forEach((u) => typeof u === "function" && u());
  }, [expandedCatIds]);

  const toggleExpand = (catId) => {
    setExpandedCatIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  /* ===== KATEGORIJE: dodaj/uredi/obriši ===== */
  const openAddCategory = () => { setCatEdit(null); setCatName(""); setCatModalOpen(true); };
  const openEditCategory = (cat) => { setCatEdit(cat); setCatName(cat.naziv || ""); setCatModalOpen(true); };

  const saveCategory = async () => {
    const naziv = (catName || "").trim();
    if (!naziv) return;
    const key = normalizeName(naziv);
    const dupe = kategorije.some((k) => normalizeName(k.naziv) === key && k.id !== catEdit?.id);
    if (dupe) { alert("Kategorija s tim imenom već postoji."); return; }
    try {
      if (catEdit) {
        await AktivnostiKategorijeAPI.update(catEdit.id, { naziv, naziv_ci: key });
      } else {
        await AktivnostiKategorijeAPI.create({ naziv, naziv_ci: key });
      }
      setCatModalOpen(false); setCatEdit(null); setCatName("");
    } catch (err) {
      console.error("Greška spremanja kategorije:", err);
      alert("Greška: " + (err?.message || String(err)));
    }
  };

  const deleteCategory = async (catId) => {
    if (!window.confirm("Obrisati kategoriju i sve njene aktivnosti?")) return;
    try {
      const toDelete = (aktivnostiByCat[catId] || []).map((a) => a.id);
      for (const actId of toDelete) await AktivnostiAPI.remove(actId);
      await AktivnostiKategorijeAPI.remove(catId);
      setAktivnostiByCat((prev) => { const copy = { ...prev }; delete copy[catId]; return copy; });
      setExpandedCatIds((prev) => prev.filter((id) => id !== catId));
    } catch (err) {
      console.error("Greška brisanja kategorije:", err);
      alert("Greška brisanja: " + (err?.message || String(err)));
    }
  };

  /* ===== AKTIVNOSTI: dodaj/uredi/obriši ===== */
  const openAddActivity = (catId) => {
    setActEdit(null);
    setActCatId(catId);
    setActName("");
    setPendingActs([]);
    setPendingInput("");
    setActModalOpen(true);
  };
  const openEditActivity = (catId, act) => {
    setActEdit(act);
    setActCatId(catId);
    setActName(act.naziv || "");
    setPendingActs([]); // nije bulk
    setPendingInput("");
    setActModalOpen(true);
  };

  // dodaj jedan naziv u pending listu (bulk)
  const addPendingOne = () => {
    const raw = (pendingInput || "").trim();
    if (!raw) return;
    const key = normalizeName(raw);
    // duplikat u listi?
    if (pendingActs.some((n) => normalizeName(n) === key)) {
      setPendingInput("");
      return;
    }
    // duplikat u postojećim aktivnostima kategorije?
    const exists = (aktivnostiByCat[actCatId] || []).some(
      (a) => normalizeName(a.naziv) === key
    );
    if (exists) {
      alert(`"${raw}" već postoji u ovoj kategoriji.`);
      setPendingInput("");
      return;
    }
    setPendingActs((prev) => [...prev, raw]);
    setPendingInput("");
  };

  // Enter za dodavanje u listu
  const onPendingKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addPendingOne();
    }
  };

  const removePendingAt = (idx) => {
    setPendingActs((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveActivity = async () => {
    // EDIT SINGLE
    if (actEdit) {
      const naziv = (actName || "").trim();
      const kategorijaId = actCatId;
      if (!naziv || !kategorijaId) return;

      const key = normalizeName(naziv);
      const dupe = (aktivnostiByCat[kategorijaId] || []).some(
        (a) => normalizeName(a.naziv) === key && a.id !== actEdit?.id
      );
      if (dupe) { alert("U ovoj kategoriji već postoji aktivnost s tim imenom."); return; }

      try {
        await AktivnostiAPI.update(actEdit.id, { naziv, naziv_ci: key, kategorijaId });
        setActModalOpen(false); setActEdit(null); setActName("");
      } catch (err) {
        console.error("Greška spremanja aktivnosti:", err);
        alert("Greška: " + (err?.message || String(err)));
      }
      return;
    }

    // BULK ADD
    const kategorijaId = actCatId;
    // ako je korisnik slučajno samo u "Naziv" polje nešto upisao, uzmi i to
    const allItems = [
      ...pendingActs,
      ...(pendingInput.trim() ? [pendingInput.trim()] : []),
    ];
    if (!kategorijaId || allItems.length === 0) return;

    // očisti i deduplikacija unutar liste
    const cleaned = [];
    const seen = new Set();
    for (const label of allItems) {
      const t = label.trim();
      if (!t) continue;
      const key = normalizeName(t);
      if (seen.has(key)) continue;
      seen.add(key);
      cleaned.push({ label: t, key });
    }

    // filtriraj one koji već postoje u bazi za tu kategoriju
    const existing = new Set(
      (aktivnostiByCat[kategorijaId] || []).map((a) => normalizeName(a.naziv))
    );
    const toCreate = cleaned.filter((x) => !existing.has(x.key));

    if (toCreate.length === 0) {
      alert("Sve navedene aktivnosti već postoje u ovoj kategoriji.");
      return;
    }

    try {
      // kreiraj redom; može i Promise.all, ali redom je lakše pratiti eventualnu grešku
      for (const item of toCreate) {
        await AktivnostiAPI.create({
          naziv: item.label,
          naziv_ci: item.key,
          kategorijaId,
        });
      }
      setActModalOpen(false);
      setPendingActs([]);
      setPendingInput("");
    } catch (err) {
      console.error("Greška pri masovnom dodavanju aktivnosti:", err);
      alert("Greška pri dodavanju: " + (err?.message || String(err)));
    }
  };

  const deleteActivity = async (actId) => {
    if (!window.confirm("Obrisati ovu aktivnost?")) return;
    try { await AktivnostiAPI.remove(actId); }
    catch (err) {
      console.error("Greška brisanja aktivnosti:", err);
      alert("Greška brisanja: " + (err?.message || String(err)));
    }
  };

  const grouped = useMemo(() => kategorije, [kategorije]);

  /* ===== UI ===== */
  return (
    <div style={{ padding: 20 }}>
      <h2>Događaji – kategorije i aktivnosti</h2>

      <button
        onClick={openAddCategory}
        style={{
          background: "#000", color: "#fff", padding: "10px 14px",
          borderRadius: 8, border: "1px solid #000", cursor: "pointer",
          fontWeight: 700, marginBottom: 16,
        }}
      >
        + Dodaj kategoriju
      </button>

      {grouped.length === 0 ? (
        <div style={{ color: "#777" }}>Nema kategorija.</div>
      ) : (
        grouped.map((cat) => {
          const catActs = aktivnostiByCat[cat.id] || [];
          const expanded = expandedCatIds.includes(cat.id);
          return (
            <div
              key={cat.id}
              style={{
                border: "1px solid #ccc", borderRadius: 12, marginBottom: 16,
                overflow: "hidden", background: "#fff",
              }}
            >
              <div
                style={{
                  padding: 12, background: "#f6f6f6",
                  display: "flex", alignItems: "center", gap: 8,
                }}
              >
                <b style={{ fontSize: 16 }}>{cat.naziv}</b>
                <span style={{ color: "#777" }}>{expanded ? `${catActs.length} aktivnosti` : ""}</span>
                <div style={{ flex: 1 }} />

                {/* PROŠIRI/SAKRIJ lijevo od Uredi */}
                <button
                  onClick={() => toggleExpand(cat.id)}
                  title={expanded ? "Sakrij aktivnosti" : "Prikaži aktivnosti"}
                  style={{
                    border: "1px solid #ccc",
                    background: "#fff",
                    borderRadius: 8,
                    padding: "6px 10px",
                    cursor: "pointer",
                    color: "#000",
                    fontWeight: 500,
                  }}
                >
                  {expanded ? "Sakrij ▴" : "Prikaži ▾"}
                </button>

                <button
                  className="btn-secondary"
                  style={{ marginLeft: 6 }}
                  onClick={() => openEditCategory(cat)}
                >
                  Uredi kategoriju
                </button>
                <button
                  className="btn-danger"
                  style={{ marginLeft: 6 }}
                  onClick={() => deleteCategory(cat.id)}
                >
                  Obriši
                </button>
                <button style={{ marginLeft: 6 }} onClick={() => openAddActivity(cat.id)}>
                  + Dodaj aktivnost
                </button>
              </div>

              {expanded && (
                <div style={{ padding: 12 }}>
                  {catActs.length === 0 ? (
                    <div style={{ color: "#777" }}>Nema aktivnosti u ovoj kategoriji.</div>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
                      <thead>
                        <tr style={{ background: "#eee" }}>
                          <th style={th}>#</th>
                          <th style={th}>Naziv aktivnosti</th>
                          <th style={thRight}>Akcije</th>
                        </tr>
                      </thead>
                      <tbody>
                        {catActs.map((a, i) => (
                          <tr key={a.id}>
                            <td style={td}>{i + 1}</td>
                            <td style={td}>{a.naziv}</td>
                            <td style={tdRight}>
                              <button
                                className="btn-secondary"
                                style={{ marginRight: 6 }}
                                onClick={() => openEditActivity(cat.id, a)}
                              >
                                Uredi
                              </button>
                              <button className="btn-danger" onClick={() => deleteActivity(a.id)}>
                                Obriši
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Modal: kategorija */}
      <Modal
        open={catModalOpen}
        onClose={() => { setCatModalOpen(false); setCatEdit(null); }}
        title={catEdit ? "Uredi kategoriju" : "Dodaj kategoriju"}
        maxWidth={520}
      >
        <div style={{ display: "grid", gap: 12 }}>
          <div style={field}>
            <label style={label}>Naziv kategorije</label>
            <input
              style={input}
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="npr. Operativne aktivnosti"
            />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button className="btn-secondary" onClick={() => setCatModalOpen(false)}>
              Odustani
            </button>
            <button onClick={saveCategory}>Spremi</button>
          </div>
        </div>
      </Modal>

      {/* Modal: aktivnost (single edit ili bulk add) */}
      <Modal
        open={actModalOpen}
        onClose={() => {
          setActModalOpen(false);
          setActEdit(null);
          setPendingActs([]);
          setPendingInput("");
        }}
        title={actEdit ? "Uredi aktivnost" : "Dodaj aktivnosti"}
        maxWidth={620}
      >
        {/* Odabir kategorije (i kod bulk i kod edit) */}
        <div style={{ display: "grid", gap: 12, marginBottom: 12 }}>
          <div style={field}>
            <label style={label}>Kategorija</label>
            <select
              style={input}
              value={actCatId}
              onChange={(e) => setActCatId(e.target.value)}
              disabled={!!actEdit} // kod editiranja ne mijenjamo kategoriju (ako treba, napravi “premjesti” kasnije)
            >
              <option value="">— Odaberi kategoriju —</option>
              {kategorije.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.naziv}
                </option>
              ))}
            </select>
          </div>
        </div>

        {actEdit ? (
          // === SINGLE EDIT ===
          <div style={{ display: "grid", gap: 12 }}>
            <div style={field}>
              <label style={label}>Naziv aktivnosti</label>
              <input
                style={input}
                value={actName}
                onChange={(e) => setActName(e.target.value)}
                placeholder="npr. Intervencija"
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button className="btn-secondary" onClick={() => { setActModalOpen(false); setActEdit(null); }}>
                Odustani
              </button>
              <button onClick={saveActivity}>Spremi</button>
            </div>
          </div>
        ) : (
          // === BULK ADD ===
          <div style={{ display: "grid", gap: 12 }}>
            <div style={field}>
              <label style={label}>Naziv aktivnosti</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  style={{ ...input, flex: 1 }}
                  value={pendingInput}
                  onChange={(e) => setPendingInput(e.target.value)}
                  onKeyDown={onPendingKeyDown}
                  placeholder="Upiši naziv i pritisni Enter ili klikni “+ Dodaj u listu”"
                />
                <button onClick={addPendingOne}>+ Dodaj u listu</button>
              </div>
              <small style={{ color: "#666" }}>
                Tip: možeš brzo dodati više — upiši naziv → Enter; ponovi za svaki.
              </small>
            </div>

            {pendingActs.length > 0 && (
              <div style={field}>
                <label style={label}>Za dodati ({pendingActs.length})</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {pendingActs.map((label, idx) => (
                    <span
                      key={`${label}-${idx}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "6px 10px",
                        border: "1px solid #ddd",
                        borderRadius: 999,
                        background: "#fafafa",
                        fontSize: 13,
                      }}
                    >
                      {label}
                      <button
                        onClick={() => removePendingAt(idx)}
                        title="Ukloni"
                        style={{
                          border: "1px solid #ccc",
                          background: "#fff",
                          borderRadius: 6,
                          padding: "0 6px",
                          cursor: "pointer",
                          color: "#000",
                        }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                className="btn-secondary"
                onClick={() => {
                  setActModalOpen(false);
                  setPendingActs([]);
                  setPendingInput("");
                }}
              >
                Odustani
              </button>
              <button onClick={saveActivity}>Spremi {pendingActs.length > 0 || pendingInput.trim() ? "sve" : ""}</button>
            </div>
          </div>
        )}
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
