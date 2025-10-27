// src/pages/Dogadaji.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { makeId } from "../utils/id";
import DatePicker from "react-datepicker";
import { format, parseISO, isValid, differenceInMinutes } from "date-fns";
import hr from "date-fns/locale/hr";
import "react-datepicker/dist/react-datepicker.css";

import { OpremaAPI, AktivnostiAPI, AktivnostiKategorijeAPI } from "../services/db";

export default function Dogadaji({ dogadaji, setDogadaji, clanovi, vozila }) {
  // UI
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  // Time editor
  const [showTimeEditor, setShowTimeEditor] = useState(false);
  const [timeEditEvent, setTimeEditEvent] = useState(null);
  const [timeEditSelectedIds, setTimeEditSelectedIds] = useState([]);

  // žive liste
  const [opremaList, setOpremaList] = useState([]);
  const [katList, setKatList] = useState([]);
  const [vrsteList, setVrsteList] = useState([]);

  // forma
  const [naziv, setNaziv] = useState("");
  const [pocetak, setPocetak] = useState(null);
  const [kraj, setKraj] = useState(null);
  const [lokacija, setLokacija] = useState("");
  const [katId, setKatId] = useState("");
  const [vrstaId, setVrstaId] = useState("");
  const [voditelj, setVoditelj] = useState("");
  const [opis, setOpis] = useState("");

  const [selVozila, setSelVozila] = useState([]);
  const [selOprema, setSelOprema] = useState([]);
  const [selClanovi, setSelClanovi] = useState([]);

  const [qVoz, setQVoz] = useState("");
  const [qOpr, setQOpr] = useState("");
  const [qClan, setQClan] = useState("");

  const [editId, setEditId] = useState(null);

  const formTopRef = useRef(null);

  /* === SUBSCRIBE: oprema === */
  useEffect(() => {
    let unsub;
    (async () => {
      unsub = await OpremaAPI.subscribe((list) => {
        const norm = list
          .map((o) => ({ id: o.id, naziv: (o.naziv || "").trim() }))
          .filter((o) => o.naziv);
        setOpremaList(norm);
      });
    })();
    return () => unsub && unsub();
  }, []);

  /* === SUBSCRIBE: kategorije === */
  useEffect(() => {
    let unsub;
    (async () => {
      unsub = await AktivnostiKategorijeAPI.subscribe((rows) =>
        setKatList(rows.map((r) => ({ id: r.id, naziv: r.naziv || "" })))
      );
    })();
    return () => unsub && unsub();
  }, []);

  /* === SUBSCRIBE: vrste po kategoriji === */
  useEffect(() => {
    if (!katId) {
      setVrsteList([]);
      setVrstaId("");
      return;
    }
    let unsub;
    (async () => {
      unsub = await AktivnostiAPI.subscribe(
        (rows) =>
          setVrsteList(
            rows
              .filter((r) => r.kategorijaId === katId)
              .map((r) => ({ id: r.id, naziv: r.naziv || "" }))
          ),
        [["kategorijaId", "==", katId]]
      );
    })();
    return () => unsub && unsub();
  }, [katId]);

  /* === helpers === */
  const fmt = (iso) => {
    if (!iso) return "—";
    const d = typeof iso === "string" ? parseISO(iso) : iso;
    if (!isValid(d)) return "—";
    return format(d, "dd.MM.yyyy HH:mm", { locale: hr });
  };

  const katNazivById = (id) => (katList.find((k) => k.id === id)?.naziv || "");
  const vrstaNazivById = (id) => (vrsteList.find((v) => v.id === id)?.naziv || "");

  const resetForm = () => {
    setNaziv(""); setPocetak(null); setKraj(null); setLokacija("");
    setKatId(""); setVrstaId(""); setVoditelj(""); setOpis("");
    setSelVozila([]); setSelOprema([]); setSelClanovi([]);
    setQVoz(""); setQOpr(""); setQClan("");
    setEditId(null);
  };
  const closeModal = () => { resetForm(); setShowForm(false); };

  const totalMinutes = useMemo(() => {
    if (!pocetak || !kraj) return 0;
    const mins = Math.max(0, differenceInMinutes(kraj, pocetak));
    return isNaN(mins) ? 0 : mins;
  }, [pocetak, kraj]);

  const mmToHHMM = (min) => {
    const m = Math.max(0, Number(min) || 0);
    const h = Math.floor(m / 60);
    const r = m % 60;
    return `${String(h).padStart(1, "0")}:${String(r).padStart(2, "0")}`;
  };

  // filteri
  const fltVoz = useMemo(
    () =>
      (vozila || [])
        .filter(
          (v) =>
            (v.model || "").toLowerCase().includes(qVoz.toLowerCase()) ||
            (v.registracija || "").toLowerCase().includes(qVoz.toLowerCase()) ||
            (v.tip || "").toLowerCase().includes(qVoz.toLowerCase())
        )
        .sort((a, b) => (a.model || "").localeCompare(b.model || "", "hr")),
    [vozila, qVoz]
  );

  const fltOpr = useMemo(
    () =>
      opremaList
        .slice()
        .sort((a, b) => a.naziv.localeCompare(b.naziv, "hr"))
        .filter((o) => (o.naziv || "").toLowerCase().includes(qOpr.toLowerCase())),
    [opremaList, qOpr]
  );

  const fltClan = useMemo(
    () =>
      (clanovi || [])
        .filter(
          (c) =>
            (c.ime + " " + c.prezime).toLowerCase().includes(qClan.toLowerCase()) ||
            (c.uloga || "").toLowerCase().includes(qClan.toLowerCase())
        )
        .sort((a, b) => (a.prezime || "").localeCompare(b.prezime || "", "hr")),
    [clanovi, qClan]
  );

  // === toggleri (chips) ===
  const toggleSelMember = (id) => {
    setSelClanovi((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };
  const toggleSelVozilo = (id) => {
    setSelVozila((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };
  const removeSelOprema = (id) => {
    setSelOprema((prev) => prev.filter((x) => x !== id));
  };

  // === Oprema: Enter doda postojeću ili kreira novu ===
  const onOpremaSearchKeyDown = async (e) => {
    if (e.key !== "Enter") return;
    const val = qOpr.trim();
    if (!val) return;
    try {
      // ako postoji egzaktan naziv, uzmi taj id
      const exact = opremaList.find(
        (o) => (o.naziv || "").toLowerCase() === val.toLowerCase()
      );
      const newId = exact ? exact.id : await OpremaAPI.createIfNotExists(val);
      setSelOprema((prev) => (prev.includes(newId) ? prev : [...prev, newId]));
      setQOpr("");
    } catch (err) {
      console.error(err);
      alert("Ne mogu dodati opremu.");
    }
  };
  const pickOpremaSuggestion = (id) => {
    setSelOprema((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setQOpr("");
  };

  /* === CRUD === */
  const requiredOk = naziv.trim();

  const dodajDogadaj = () => {
    if (!requiredOk) return;

    const kategorijaNaziv = katId ? katNazivById(katId) : "";
    const aktivnostNaziv = vrstaId ? vrstaNazivById(vrstaId) : "";

    const novi = {
      id: makeId(),
      naziv,
      pocetak: pocetak ? pocetak.toISOString() : "",
      kraj: kraj ? kraj.toISOString() : "",
      lokacija,
      aktivnostKategorijaId: katId || "",
      aktivnostKategorijaNaziv: kategorijaNaziv,
      aktivnostId: vrstaId || "",
      aktivnostNaziv: aktivnostNaziv,
      voditelj,
      opis,
      clanSudjelovanje: [],            // vremena kasnije
      clanovi: selClanovi.slice(),     // samo ID-jevi
      vozila: selVozila.slice(),
      oprema: selOprema.slice(),
      tip: aktivnostNaziv || kategorijaNaziv || "",
    };

    setDogadaji([...(dogadaji || []), novi]);
    closeModal();
  };

  const spremiDogadaj = () => {
    if (!requiredOk || !editId) return;

    const kategorijaNaziv = katId ? katNazivById(katId) : "";
    const aktivnostNaziv = vrstaId ? vrstaNazivById(vrstaId) : "";

    const copy = (dogadaji || []).map((d) =>
      d.id === editId
        ? {
            ...d,
            naziv,
            pocetak: pocetak ? pocetak.toISOString() : "",
            kraj: kraj ? kraj.toISOString() : "",
            lokacija,
            aktivnostKategorijaId: katId || "",
            aktivnostKategorijaNaziv: kategorijaNaziv,
            aktivnostId: vrstaId || "",
            aktivnostNaziv: aktivnostNaziv,
            voditelj,
            opis,
            vozila: selVozila.slice(),
            oprema: selOprema.slice(),
            clanovi: selClanovi.slice(),  // ID-jevi samo
            tip: aktivnostNaziv || kategorijaNaziv || "",
          }
        : d
    );
    setDogadaji(copy);
    closeModal();
  };

  const uredi = (id) => {
    const d = (dogadaji || []).find((x) => x.id === id);
    if (!d) return;
    setEditId(id);
    setNaziv(d.naziv || "");
    setPocetak(d.pocetak ? new Date(d.pocetak) : null);
    setKraj(d.kraj ? new Date(d.kraj) : null);
    setLokacija(d.lokacija || "");
    setKatId(d.aktivnostKategorijaId || "");
    setVrstaId(d.aktivnostId || "");
    setVoditelj(d.voditelj || "");
    setOpis(d.opis || "");
    setSelVozila(d.vozila || []);
    setSelOprema(d.oprema || []);

    // normalize clanovi -> čisti ID-jevi
    const idsFromSudj = Array.isArray(d.clanSudjelovanje) ? d.clanSudjelovanje.map((r) => r.id) : [];
    let idsFromClanovi = [];
    if (Array.isArray(d.clanovi)) {
      idsFromClanovi = typeof d.clanovi[0] === "object" ? d.clanovi.map((c) => c?.id).filter(Boolean) : d.clanovi;
    }
    const uniq = Array.from(new Set([...(idsFromClanovi || []), ...(idsFromSudj || [])])).filter(Boolean);
    setSelClanovi(uniq);

    setShowForm(true);
    formTopRef.current?.scrollTo?.(0, 0);
  };

  const obrisi = (id) => {
    if (!window.confirm("Sigurno obrisati događaj?")) return;
    setDogadaji((dogadaji || []).filter((d) => d.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  // ESC zatvara modal
  useEffect(() => {
    if (!showForm) return;
    const onKey = (e) => { if (e.key === "Escape") { e.preventDefault(); closeModal(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showForm]);

  const filtered = useMemo(() => dogadaji || [], [dogadaji]);

  /* === TIME EDITOR: otvori s eksplicitnim selectedIds === */
  const openTimeEditor = (eventId) => {
    const ev = (dogadaji || []).find((e) => e.id === eventId);
    if (!ev) return;
    const ids =
      Array.isArray(ev.clanovi)
        ? (typeof ev.clanovi[0] === "object" ? ev.clanovi.map((c) => c?.id).filter(Boolean) : ev.clanovi.slice())
        : [];
    const idsWithTimes = Array.isArray(ev.clanSudjelovanje) ? ev.clanSudjelovanje.map((r) => r.id) : [];
    const selected = Array.from(new Set([...(ids || []), ...(idsWithTimes || [])])).filter(Boolean);

    setTimeEditEvent(ev);
    setTimeEditSelectedIds(selected);
    setShowTimeEditor(true);
  };
  const closeTimeEditor = () => {
    setShowTimeEditor(false);
    setTimeEditEvent(null);
    setTimeEditSelectedIds([]);
  };

  /* === PDF IZVJEŠTAJ === */
  const generatePdf = async (evt) => {
    try {
      const mod = await import("jspdf");
      const jsPDF = mod.jsPDF || mod.default;
      const doc = new jsPDF({ unit: "pt", format: "a4" });

      const M = 40; let y = M;
      const addLine = (text, size = 11, bold = false) => {
        doc.setFont("helvetica", bold ? "bold" : "normal");
        doc.setFontSize(size);
        const lines = doc.splitTextToSize(text, 515);
        lines.forEach((ln) => { if (y > 780) { doc.addPage(); y = M; } doc.text(ln, M, y); y += size + 6; });
      };
      const fmtDate = (iso) => {
        if (!iso) return "—";
        const d = typeof iso === "string" ? parseISO(iso) : iso;
        if (!isValid(d)) return "—";
        return format(d, "dd.MM.yyyy HH:mm", { locale: hr });
      };
      const mmToHHMM_local = (min) => `${Math.floor((Number(min)||0)/60)}:${String((Number(min)||0)%60).padStart(2,"0")}`;

      // Naslov
      doc.setFont("helvetica", "bold"); doc.setFontSize(18);
      doc.text(evt.naziv || "Događaj", M, y); y += 26;

      addLine(`Aktivnost: ${evt.aktivnostNaziv || evt.tip || "—"}${evt.aktivnostKategorijaNaziv ? ` (${evt.aktivnostKategorijaNaziv})` : ""}`, 12, true);
      addLine(`Početak: ${fmtDate(evt.pocetak)}   Kraj: ${evt.kraj ? fmtDate(evt.kraj) : "—"}`);
      addLine(`Lokacija: ${evt.lokacija || "—"}`);
      if (evt.voditelj) addLine(`Voditelj / Izvjestitelj: ${evt.voditelj}`);
      if (evt.opis) { y += 4; addLine("Opis:", 12, true); addLine(evt.opis); }

      if (Array.isArray(evt.vozila) && evt.vozila.length) {
        y += 6; addLine("Vozila:", 12, true);
        evt.vozila.forEach((id) => {
          const v = (vozila || []).find((x) => x.id === id);
          const lbl = v ? `${v.model}${v.registracija ? ` (${v.registracija})` : ""}` : id;
          addLine(`• ${lbl}`);
        });
      }

      if (Array.isArray(evt.oprema) && evt.oprema.length) {
        y += 6; addLine("Oprema:", 12, true);
        evt.oprema.forEach((id) => {
          const o = (opremaList || []).find((x) => x.id === id);
          addLine(`• ${o ? o.naziv : id}`);
        });
      }

      y += 6; addLine("Članovi:", 12, true);
      const hasTimes = Array.isArray(evt.clanSudjelovanje) && evt.clanSudjelovanje.length > 0;
      if (hasTimes) {
        evt.clanSudjelovanje.forEach((r) => {
          const c = (clanovi || []).find((x) => x.id === r.id);
          const ime = c ? `${c.ime} ${c.prezime}${c.uloga ? ` (${c.uloga})` : ""}` : r.id;
          addLine(`• ${ime} — ${mmToHHMM_local(r.minutes)} h`);
        });
      } else if (Array.isArray(evt.clanovi) && evt.clanovi.length) {
        evt.clanovi.forEach((idOrObj) => {
          const id = typeof idOrObj === "object" ? idOrObj?.id : idOrObj;
          const c = (clanovi || []).find((x) => x.id === id);
          const ime = c ? `${c.ime} ${c.prezime}${c.uloga ? ` (${c.uloga})` : ""}` : (id || "");
          addLine(`• ${ime}`);
        });
      } else {
        addLine("—");
      }

      doc.save(`${(evt.naziv || "dogadaj").replace(/\s+/g, "_")}.pdf`);
      return;
    } catch (e) {
      // fallback na print-friendly HTML
      const w = window.open("", "_blank", "noopener,noreferrer,width=900,height=1200");
      if (!w) return;
      const esc = (s) => String(s || "").replace(/[&<>"']/g, (m) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[m]));
      const fmtDate = (iso) => {
        if (!iso) return "—";
        const d = typeof iso === "string" ? parseISO(iso) : iso;
        if (!isValid(d)) return "—";
        return format(d, "dd.MM.yyyy HH:mm", { locale: hr });
      };
      const memberRows = (() => {
        const hasTimes = Array.isArray(evt.clanSudjelovanje) && evt.clanSudjelovanje.length > 0;
        if (hasTimes) {
          return evt.clanSudjelovanje.map((r) => {
            const c = (clanovi || []).find((x) => x.id === r.id);
            const ime = c ? `${c.ime} ${c.prezime}${c.uloga ? ` (${c.uloga})` : ""}` : r.id;
            const mm = Number(r.minutes) || 0;
            const h = `${Math.floor(mm/60)}:${String(mm%60).padStart(2,"0")}`;
            return `<tr><td>${esc(ime)}</td><td style="text-align:right">${h}</td></tr>`;
          }).join("");
        }
        if (Array.isArray(evt.clanovi) && evt.clanovi.length) {
          return evt.clanovi.map((idOrObj) => {
            const id = typeof idOrObj === "object" ? idOrObj?.id : idOrObj;
            const c = (clanovi || []).find((x) => x.id === id);
            const ime = c ? `${c.ime} ${c.prezime}${c.uloga ? ` (${c.uloga})` : ""}` : (id || "");
            return `<tr><td>${esc(ime)}</td><td></td></tr>`;
          }).join("");
        }
        return `<tr><td colspan="2">—</td></tr>`;
      })();

      const vozRows = (evt.vozila || []).map((id) => {
        const v = (vozila || []).find((x) => x.id === id);
        const lbl = v ? `${v.model}${v.registracija ? ` (${v.registracija})` : ""}` : id;
        return `<li>${esc(lbl)}</li>`;
      }).join("");
      const oprRows = (evt.oprema || []).map((id) => {
        const o = (opremaList || []).find((x) => x.id === id);
        return `<li>${esc(o ? o.naziv : id)}</li>`;
      }).join("");

      w.document.write(`<!doctype html>
<html lang="hr"><head><meta charset="utf-8" />
<title>Izvještaj — ${esc(evt.naziv || "Događaj")}</title>
<style>
  body { font-family: Arial, sans-serif; color:#111; margin: 24px; }
  h1 { margin: 0 0 8px 0; font-size: 22px; }
  .meta { margin: 0 0 14px 0; color:#444; }
  .box { border: 1px solid #e5e5e5; border-radius:8px; padding:12px; margin: 12px 0; }
  table { width:100%; border-collapse: collapse; }
  td, th { padding: 6px 8px; border-bottom: 1px solid #eee; }
  th { text-align:left; }
  ul { margin: 6px 0 0 18px; }
  .small { color:#666; font-size:12px; margin-top:10px; }
  @media print { button { display:none; } .box { break-inside: avoid-page; } }
</style>
</head>
<body>
  <button onclick="window.print()" style="float:right;margin:6px 0 12px 12px;">Ispiši / PDF</button>
  <h1>${esc(evt.naziv || "Događaj")}</h1>
  <div class="meta"><b>Aktivnost:</b> ${esc(evt.aktivnostNaziv || evt.tip || "—")}${evt.aktivnostKategorijaNaziv ? ` (${esc(evt.aktivnostKategorijaNaziv)})` : ""}</div>
  <div class="box">
    <div><b>Početak:</b> ${esc(fmtDate(evt.pocetak))} &nbsp; <b>Kraj:</b> ${esc(evt.kraj ? fmtDate(evt.kraj) : "—")}</div>
    <div><b>Lokacija:</b> ${esc(evt.lokacija || "—")}</div>
    ${evt.voditelj ? `<div><b>Voditelj / Izvjestitelj:</b> ${esc(evt.voditelj)}</div>` : ""}
    ${evt.opis ? `<div style="margin-top:6px;"><b>Opis:</b> ${esc(evt.opis)}</div>` : ""}
  </div>
  ${(evt.vozila||[]).length ? `<div class="box"><b>Vozila</b><ul>${vozRows}</ul></div>` : ""}
  ${(evt.oprema||[]).length ? `<div class="box"><b>Oprema</b><ul>${oprRows}</ul></div>` : ""}
  <div class="box">
    <b>Članovi</b>
    <table>
      <thead><tr><th>Ime i prezime</th><th style="text-align:right">Vrijeme (h)</th></tr></thead>
      <tbody>${memberRows}</tbody>
    </table>
  </div>
  <div class="small">Generirano: ${esc(format(new Date(), "dd.MM.yyyy HH:mm", { locale: hr }))}</div>
</body></html>`);
      w.document.close(); w.focus();
    }
  };

  return (
    <div>
      <h2>Događaji</h2>

      {(dogadaji || []).length === 0 && (
        <div className="info">
          Nema događaja u bazi. Klikni <b>Dodaj događaj</b> za unos prvog.
        </div>
      )}

      <button type="button" onClick={() => setShowForm(true)}>Dodaj događaj</button>

      <div className="table-wrap" style={{ marginTop: 12 }}>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Naziv</th>
              <th>Aktivnost</th>
              <th>Datum</th>
              <th>Lokacija</th>
              <th>Akcije</th>
            </tr>
          </thead>
          <tbody>
            {(filtered).map((d, i) => (
              <FragmentRow
                key={d.id}
                d={d}
                i={i}
                fmt={fmt}
                expandedId={expandedId}
                setExpandedId={setExpandedId}
                uredi={uredi}
                obrisi={obrisi}
                openTimeEditor={openTimeEditor}
                onPrintPDF={generatePdf}
                clanovi={clanovi}
                vozila={vozila}
                oprema={opremaList}
              />
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6}>Nema unosa.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL: unos/uredi */}
      {showForm && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" ref={formTopRef}>
            <div className="modal-header">
              <h3 style={{ marginRight: "auto" }}>{editId ? "Uredi događaj" : "Dodaj događaj"}</h3>
              <div className="pill" style={{ marginLeft: "auto" }}>
                {pocetak || kraj ? `Trajanje: ${totalMinutes ? mmToHHMM(totalMinutes) : "—"}` : ""}
              </div>
            </div>

            <div className="modal-body modal-scroll">
              {/* Osnovno */}
              <section className="card">
                <div className="card-title">Osnovno</div>
                <div className="grid-2">
                  <div className="form-col">
                    <label>Naziv događaja</label>
                    <input type="text" value={naziv} onChange={(e) => setNaziv(e.target.value)} />
                  </div>
                  <div className="form-col">
                    <label>Lokacija</label>
                    <input type="text" value={lokacija} onChange={(e) => setLokacija(e.target.value)} />
                  </div>
                  <div className="form-col">
                    <label>Početak</label>
                    <DatePicker selected={pocetak} onChange={(d) => setPocetak(d)} showTimeSelect timeFormat="HH:mm" timeIntervals={15} dateFormat="dd.MM.yyyy HH:mm" placeholderText="Odaberi datum i vrijeme" locale={hr} className="input-like" />
                  </div>
                  <div className="form-col">
                    <label>Kraj</label>
                    <DatePicker selected={kraj} onChange={(d) => setKraj(d)} showTimeSelect timeFormat="HH:mm" timeIntervals={15} dateFormat="dd.MM.yyyy HH:mm" placeholderText="Odaberi datum i vrijeme (opcija)" locale={hr} className="input-like" minDate={pocetak || undefined} />
                  </div>
                </div>
              </section>

              {/* Aktivnost */}
              <section className="card">
                <div className="card-title">Aktivnost</div>
                <div className="grid-2">
                  <div className="form-col">
                    <label>Kategorija aktivnosti</label>
                    <select value={katId} onChange={(e) => { setKatId(e.target.value); setVrstaId(""); }}>
                      <option value="">— Odaberi kategoriju —</option>
                      {katList.map((k) => <option key={k.id} value={k.id}>{k.naziv}</option>)}
                    </select>
                  </div>
                  <div className="form-col">
                    <label>Vrsta</label>
                    <select value={vrstaId} onChange={(e) => setVrstaId(e.target.value)} disabled={!katId}>
                      <option value="">{katId ? "— Odaberi vrstu —" : "Prvo odaberi kategoriju"}</option>
                      {vrsteList.map((v) => <option key={v.id} value={v.id}>{v.naziv}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid-2">
                  <div className="form-col">
                    <label>Voditelj / Izvjestitelj</label>
                    <input type="text" value={voditelj} onChange={(e) => setVoditelj(e.target.value)} />
                  </div>
                  <div className="form-col">
                    <label>Opis</label>
                    <textarea value={opis} onChange={(e) => setOpis(e.target.value)} />
                  </div>
                </div>
              </section>

              {/* Članovi — CHIPS */}
              <section className="card">
                <div className="card-title">Članovi koji su bili</div>

                <div className="form-col">
                  <input
                    className="picker-search"
                    placeholder="Pretraži članove…"
                    value={qClan}
                    onChange={(e) => setQClan(e.target.value)}
                  />
                </div>

                <div className="chips-grid">
                  {fltClan.map((c) => {
                    const selected = selClanovi.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        className={`chip ${selected ? "is-selected" : ""}`}
                        onClick={() => toggleSelMember(c.id)}
                        aria-pressed={selected}
                        title={c.uloga ? `${c.ime} ${c.prezime} (${c.uloga})` : `${c.ime} ${c.prezime}`}
                      >
                        {c.ime} {c.prezime}
                        {c.uloga ? <span className="chip-sub"> · {c.uloga}</span> : null}
                      </button>
                    );
                  })}
                  {fltClan.length === 0 && (
                    <div className="picker-empty" style={{ width: "100%" }}>
                      Nema rezultata.
                    </div>
                  )}
                </div>

                <div style={{ marginTop: 6, fontSize: 12, color: "#666" }}>
                  Detaljna vremena svakog člana uredi nakon spremanja kroz <b>“Vrijeme članova”</b>.
                </div>
              </section>

              {/* Vozila — CHIPS */}
              <section className="card">
                <div className="card-title">Vozila</div>
                <div className="form-col">
                  <input
                    className="picker-search"
                    placeholder="Pretraži vozila…"
                    value={qVoz}
                    onChange={(e) => setQVoz(e.target.value)}
                  />
                </div>

                <div className="chips-grid">
                  {fltVoz.map((v) => {
                    const selected = selVozila.includes(v.id);
                    const label = `${v.model}${v.registracija ? ` (${v.registracija})` : ""}`;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        className={`chip ${selected ? "is-selected" : ""}`}
                        onClick={() => toggleSelVozilo(v.id)}
                        aria-pressed={selected}
                        title={label}
                      >
                        {label}
                      </button>
                    );
                  })}
                  {fltVoz.length === 0 && (
                    <div className="picker-empty" style={{ width: "100%" }}>
                      Nema rezultata.
                    </div>
                  )}
                </div>
              </section>

              {/* Oprema — samo search + odabrane stavke kao čipovi + prijedlozi kad tipkaš */}
              <section className="card" style={{ position: "relative" }}>
                <div className="card-title">Oprema</div>

                {/* Odabrano */}
                {selOprema.length > 0 && (
                  <div className="chips-grid" style={{ marginBottom: 8 }}>
                    {selOprema.map((id) => {
                      const o = opremaList.find((x) => x.id === id);
                      return (
                        <button
                          key={id}
                          type="button"
                          className="chip is-selected"
                          onClick={() => removeSelOprema(id)}
                          title="Ukloni"
                        >
                          {o ? o.naziv : id} &nbsp;×
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Search box */}
                <div className="form-col">
                  <input
                    className="picker-search"
                    placeholder="Upiši naziv opreme i Enter…"
                    value={qOpr}
                    onChange={(e) => setQOpr(e.target.value)}
                    onKeyDown={onOpremaSearchKeyDown}
                  />
                </div>

                {/* Prijedlozi (samo kad ima query) */}
                {qOpr.trim() && (
                  <div className="picker-list" style={{ maxHeight: 220 }}>
                    {fltOpr.slice(0, 12).map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        className="picker-item"
                        onClick={() => pickOpremaSuggestion(o.id)}
                        title={o.naziv}
                        style={{ textAlign: "left" }}
                      >
                        {o.naziv}
                      </button>
                    ))}
                    {fltOpr.length === 0 && (
                      <div className="picker-empty">
                        Nema rezultata. Pritisni <b>Enter</b> za dodati “{qOpr.trim()}”.
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>

            <div className="modal-footer">
              {editId ? (
                <button type="button" onClick={spremiDogadaj} disabled={!requiredOk}>Spremi izmjene</button>
              ) : (
                <button type="button" onClick={dodajDogadaj} disabled={!requiredOk}>Spremi</button>
              )}
              <button type="button" className="btn-secondary" onClick={closeModal}>Odustani</button>
            </div>
          </div>
        </div>
      )}

      {/* TIME EDITOR */}
      {showTimeEditor && (
        <TimeEditor
          event={timeEditEvent}
          selectedIds={timeEditSelectedIds}
          onClose={closeTimeEditor}
          onSave={(updated) => {
            setDogadaji((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
            closeTimeEditor();
          }}
          clanovi={clanovi}
        />
      )}
    </div>
  );
}

/* ========== Redak ========== */
function FragmentRow({
  d, i, fmt, expandedId, setExpandedId, uredi, obrisi, openTimeEditor, onPrintPDF,
  clanovi, vozila, oprema
}) {
  const activityBadge = d.aktivnostNaziv || d.tip || "—";
  const categorySmall = d.aktivnostKategorijaNaziv || "";

  const clanName = (id) => {
    const c = (clanovi || []).find((x) => x.id === id);
    return c ? `${c.ime} ${c.prezime}` : id;
  };

  const totalMemberMinutes = Array.isArray(d.clanSudjelovanje)
    ? d.clanSudjelovanje.reduce((acc, r) => acc + (Number(r.minutes) || 0), 0)
    : 0;
  const mmToHHMM = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;

  return (
    <>
      <tr>
        <td>{i + 1}</td>
        <td>{d.naziv}</td>
        <td>
          <span className="badge">{activityBadge}</span>
          {categorySmall && <span style={{ marginLeft: 8, color: "#777", fontSize: 12 }}>({categorySmall})</span>}
        </td>
        <td>{d.pocetak ? fmt(d.pocetak) : "—"}</td>
        <td>{d.lokacija || "—"}</td>
        <td>
          <div className="actions" style={{ flexWrap: "wrap" }}>
            <button className="btn-secondary" type="button" onClick={() => uredi(d.id)}>Uredi</button>
            <button className="btn-secondary" type="button" onClick={() => setExpandedId(expandedId === d.id ? null : d.id)}>
              {expandedId === d.id ? "Sakrij" : "Detalji"}
            </button>
            <button className="btn-secondary" type="button" onClick={() => openTimeEditor(d.id)} title="Uredi vrijeme članova">
              Vrijeme članova{totalMemberMinutes ? ` (${mmToHHMM(totalMemberMinutes)})` : ""}
            </button>
            <button
              className="btn-secondary"
              type="button"
              onClick={() => onPrintPDF(d)}
              title="Izvještaj PDF"
            >
              Izvještaj (PDF)
            </button>
            <button className="btn-danger" type="button" onClick={() => obrisi(d.id)}>Obriši</button>
          </div>
        </td>
      </tr>

      {expandedId === d.id && (
        <tr>
          <td colSpan={6} className="details-cell">
            <div className="details-grid">
              <div>
                <div className="details-title">Opis</div>
                <div className="details-text">{d.opis || "—"}</div>
              </div>
              <div>
                <div className="details-title">Voditelj / Izvjestitelj</div>
                <div className="details-text">{d.voditelj || "—"}</div>
              </div>
              <div>
                <div className="details-title">Vremenski raspon</div>
                <div className="details-text">
                  {d.pocetak ? fmt(d.pocetak) : "—"}{d.kraj ? ` → ${fmt(d.kraj)}` : ""}
                </div>
              </div>

              <div>
                <div className="details-title">Članovi</div>
                <div>
                  {Array.isArray(d.clanSudjelovanje) && d.clanSudjelovanje.length > 0 ? (
                    d.clanSudjelovanje.map((r, idx) => (
                      <span key={idx} className="tag">
                        {clanName(r.id)} — {formatMinutes(r.minutes)}
                      </span>
                    ))
                  ) : (
                    (d.clanovi || []).map((idOrObj, idx) => {
                      const id = typeof idOrObj === "object" ? idOrObj?.id : idOrObj;
                      return <span key={idx} className="tag">{clanName(id)}</span>;
                    })
                  )}
                  {(!d.clanSudjelovanje || d.clanSudjelovanje.length === 0) &&
                    (!d.clanovi || d.clanovi.length === 0) && <span>—</span>}
                </div>
              </div>

              <div>
                <div className="details-title">Vozila</div>
                <div>
                  {(d.vozila || []).map((id, idx) => {
                    const v = (vozila || []).find((x) => x.id === id);
                    const lbl = v ? v.model : id;
                    return <span key={idx} className="tag">{lbl}</span>;
                  })}
                  {(d.vozila || []).length === 0 && <span>—</span>}
                </div>
              </div>

              <div>
                <div className="details-title">Oprema</div>
                <div>
                  {(d.oprema || []).map((id, idx) => {
                    const o = (oprema || []).find((x) => x.id === id);
                    const lbl = o ? o.naziv : id;
                    return <span key={idx} className="tag">{lbl}</span>;
                  })}
                  {(d.oprema || []).length === 0 && <span>—</span>}
                </div>
              </div>

              <div>
                <div className="details-title">Izvoz</div>
                <div>
                  <button className="btn-secondary" type="button" onClick={() => onPrintPDF(d)}>
                    Izvještaj (PDF)
                  </button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/* ========== TimeEditor (samo odabrani) ========== */
function TimeEditor({ event, selectedIds, onClose, onSave, clanovi }) {
  const [query, setQuery] = useState("");

  const allowSet = useMemo(() => new Set(selectedIds || []), [selectedIds]);

  const initialMap = useMemo(() => {
    const init = {};
    if (Array.isArray(event?.clanSudjelovanje) && event.clanSudjelovanje.length) {
      event.clanSudjelovanje.forEach((r) => (init[r.id] = Number(r.minutes) || 0));
    } else {
      (selectedIds || []).forEach((id) => (init[id] = 0));
    }
    return init;
  }, [event, selectedIds]);

  const [mapMM, setMapMM] = useState(initialMap);
  useEffect(() => setMapMM(initialMap), [initialMap]);

  const list = useMemo(() => {
    return (clanovi || [])
      .filter((c) => allowSet.has(c.id))
      .filter(
        (c) =>
          (c.ime + " " + c.prezime).toLowerCase().includes((query || "").toLowerCase()) ||
          (c.uloga || "").toLowerCase().includes((query || "").toLowerCase())
      )
      .sort((a, b) => (a.prezime || "").localeCompare(b.prezime || "", "hr"));
  }, [clanovi, allowSet, query]);

  const mmToHHMM = (m) => `${Math.floor((Number(m)||0) / 60)}:${String((Number(m)||0) % 60).padStart(2, "0")}`;
  const hhmmToMM = (str) => {
    if (!str) return 0;
    const p = String(str).split(":");
    if (p.length === 2) {
      const h = Number(p[0]) || 0;
      const m = Number(p[1]) || 0;
      return Math.max(0, h * 60 + m);
    }
    return Math.max(0, Number(str) || 0);
  };

  const totalEvt = useMemo(() => {
    if (!event?.pocetak || !event?.kraj) return 0;
    try {
      return Math.max(0, differenceInMinutes(new Date(event.kraj), new Date(event.pocetak)));
    } catch { return 0; }
  }, [event]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-header">
          <h3 style={{ marginRight: "auto" }}>
            Vrijeme članova — {event?.naziv || "Događaj"}
          </h3>
          <div className="pill">Trajanje događaja: {totalEvt ? mmToHHMM(totalEvt) : "—"}</div>
        </div>

        <div className="modal-body modal-scroll">
          <div className="toolbar" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              className="picker-search"
              placeholder="Pretraži članove…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ flex: "1 1 auto" }}
            />
            {totalEvt > 0 && list.length > 0 && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  const copy = { ...mapMM };
                  list.forEach((c) => { copy[c.id] = totalEvt; });
                  setMapMM(copy);
                }}
              >
                Svim prikazanim: {mmToHHMM(totalEvt)}
              </button>
            )}
          </div>

          {(selectedIds || []).length === 0 && (
            <div className="info" style={{ marginTop: 10 }}>
              Nema odabranih članova u događaju. Dodaj članove pa ponovno uredi vrijeme.
            </div>
          )}

          <div className="member-grid" style={{ marginTop: 10 }}>
            {list.map((c) => {
              const val = Number(mapMM[c.id]) || 0;
              return (
                <div key={c.id} className={`member-row ${val > 0 ? "is-selected" : ""}`}>
                  <div className="member-label">
                    {c.ime} {c.prezime}{c.uloga ? ` (${c.uloga})` : ""}
                  </div>
                  <div className="time-edit">
                    <input
                      type="text"
                      className="time-input"
                      placeholder="hh:mm ili minute"
                      value={val ? mmToHHMM(val) : ""}
                      onChange={(e) => setMapMM((p) => ({ ...p, [c.id]: hhmmToMM(e.target.value) }))}
                    />
                    <button type="button" className="btn-secondary small" onClick={() => setMapMM((p) => ({ ...p, [c.id]: totalEvt }))} disabled={!totalEvt}>
                      = trajanje
                    </button>
                    <button type="button" className="btn-secondary small" onClick={() => setMapMM((p) => ({ ...p, [c.id]: 0 }))}>
                      0:00
                    </button>
                  </div>
                </div>
              );
            })}
            {list.length === 0 && (selectedIds || []).length > 0 && (
              <div className="picker-empty">Nema rezultata za traženi pojam.</div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            onClick={() => {
              const arr = Object.entries(mapMM)
                .filter(([, mm]) => (Number(mm) || 0) > 0)
                .map(([id, mm]) => ({ id, minutes: Number(mm) }));
              const legacyIds = Array.from(new Set([...(selectedIds || []), ...arr.map((r) => r.id)]));
              onSave({ ...event, clanSudjelovanje: arr, clanovi: legacyIds });
            }}
          >
            Spremi
          </button>
          <button type="button" className="btn-secondary" onClick={onClose}>Zatvori</button>
        </div>
      </div>
    </div>
  );
}

function formatMinutes(min) {
  const m = Math.max(0, Number(min) || 0);
  const h = Math.floor(m / 60);
  const r = m % 60;
  return `${h}:${String(r).padStart(2, "0")}`;
}
