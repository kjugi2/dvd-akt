import { useEffect, useState, useMemo } from "react";
import { makeId } from "../utils/id";
import DatePicker from "react-datepicker";
import { format, parseISO, isValid } from "date-fns";
import { hr } from "date-fns/locale";
import "react-datepicker/dist/react-datepicker.css";

export default function Dogadaji({ dogadaji, setDogadaji, clanovi, vozila, oprema }) {
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  // polja forme
  const [naziv, setNaziv] = useState("");
  const [pocetak, setPocetak] = useState(null);   // Date ili null
  const [kraj, setKraj] = useState(null);         // Date ili null
  const [lokacija, setLokacija] = useState("");
  const [tip, setTip] = useState("");
  const [voditelj, setVoditelj] = useState("");
  const [opis, setOpis] = useState("");

  // odabiri
  const [selClanovi, setSelClanovi] = useState([]);
  const [selVozila, setSelVozila] = useState([]);
  const [selOprema, setSelOprema] = useState([]);

  // search unutar pickera
  const [qClan, setQClan] = useState("");
  const [qVoz, setQVoz] = useState("");
  const [qOpr, setQOpr] = useState("");

  const [editId, setEditId] = useState(null);

  const resetForm = () => {
    setNaziv(""); setPocetak(null); setKraj(null); setLokacija(""); setTip("");
    setVoditelj(""); setOpis("");
    setSelClanovi([]); setSelVozila([]); setSelOprema([]);
    setQClan(""); setQVoz(""); setQOpr("");
    setEditId(null);
  };

  const closeModal = () => { resetForm(); setShowForm(false); };

  const fmt = (iso) => {
    if (!iso) return "—";
    const d = typeof iso === "string" ? parseISO(iso) : iso;
    if (!isValid(d)) return "—";
    return format(d, "dd.MM.yyyy HH:mm", { locale: hr });
  };

  const dodajDogadaj = () => {
    if (!naziv.trim() || !pocetak || !tip) return;
    setDogadaji([
      ...dogadaji,
      {
        id: makeId(),
        naziv,
        pocetak: pocetak.toISOString(),
        kraj: kraj ? kraj.toISOString() : "",
        lokacija,
        tip,
        voditelj,
        opis,
        clanovi: selClanovi,
        vozila: selVozila,
        oprema: selOprema,
      },
    ]);
    closeModal();
  };

  const spremiDogadaj = () => {
    if (!editId || !naziv.trim() || !pocetak || !tip) return;
    const copy = dogadaji.map((d) =>
      d.id === editId
        ? {
            ...d,
            naziv,
            pocetak: pocetak.toISOString(),
            kraj: kraj ? kraj.toISOString() : "",
            lokacija,
            tip,
            voditelj,
            opis,
            clanovi: selClanovi,
            vozila: selVozila,
            oprema: selOprema,
          }
        : d
    );
    setDogadaji(copy);
    closeModal();
  };

  const uredi = (id) => {
    const d = dogadaji.find((x) => x.id === id);
    if (!d) return;
    setEditId(id);
    setNaziv(d.naziv);
    setPocetak(d.pocetak ? new Date(d.pocetak) : null);
    setKraj(d.kraj ? new Date(d.kraj) : null);
    setLokacija(d.lokacija || "");
    setTip(d.tip);
    setVoditelj(d.voditelj || "");
    setOpis(d.opis || "");
    setSelClanovi(d.clanovi || []);
    setSelVozila(d.vozila || []);
    setSelOprema(d.oprema || []);
    setShowForm(true);
  };

  const obrisi = (id) => {
    if (!window.confirm("Sigurno obrisati događaj?")) return;
    setDogadaji(dogadaji.filter((d) => d.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  // ESC zatvara modal
  useEffect(() => {
    if (!showForm) return;
    const onKey = (e) => { if (e.key === "Escape") { e.preventDefault(); closeModal(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showForm]);

  const filtered = useMemo(() => dogadaji, [dogadaji]);

  const labelList = (ids, list, keyFn) =>
    ids.map((id) => list.find((x) => x.id === id)).filter(Boolean).map(keyFn);

  // checkbox pickeri – pomoćne
  const toggleId = (id, arr, setter) => {
    if (arr.includes(id)) setter(arr.filter((x) => x !== id));
    else setter([...arr, id]);
  };

  const fltClan = useMemo(
    () =>
      clanovi.filter(
        (c) =>
          (c.ime + " " + c.prezime).toLowerCase().includes(qClan.toLowerCase()) ||
          (c.uloga || "").toLowerCase().includes(qClan.toLowerCase())
      ),
    [clanovi, qClan]
  );
  const fltVoz = useMemo(
    () =>
      vozila.filter(
        (v) =>
          (v.model || "").toLowerCase().includes(qVoz.toLowerCase()) ||
          (v.registracija || "").toLowerCase().includes(qVoz.toLowerCase()) ||
          (v.tip || "").toLowerCase().includes(qVoz.toLowerCase())
      ),
    [vozila, qVoz]
  );
  const fltOpr = useMemo(
    () =>
      oprema.filter(
        (o) =>
          (o.naziv || "").toLowerCase().includes(qOpr.toLowerCase()) ||
          (o.kategorija || "").toLowerCase().includes(qOpr.toLowerCase()) ||
          (o.inv || "").toLowerCase().includes(qOpr.toLowerCase())
      ),
    [oprema, qOpr]
  );

  return (
    <div>
      <h2>Događaji</h2>

      {dogadaji.length === 0 && (
        <div className="info">
          Nema događaja u bazi. Klikni <b>Dodaj događaj</b> za unos prvog.
        </div>
      )}

      <button onClick={() => setShowForm(true)}>Dodaj događaj</button>

      <div className="table-wrap" style={{ marginTop: 12 }}>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Naziv</th>
              <th>Tip</th>
              <th>Datum</th>
              <th>Lokacija</th>
              <th>Akcije</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d, i) => (
              <>
                <tr key={d.id}>
                  <td>{i + 1}</td>
                  <td>{d.naziv}</td>
                  <td><span className="badge">{d.tip}</span></td>
                  <td>{fmt(d.pocetak)}</td>
                  <td>{d.lokacija || "—"}</td>
                  <td>
                    <div className="actions">
                      <button className="btn-secondary" onClick={() => uredi(d.id)}>Uredi</button>
                      <button className="btn-secondary" onClick={() => setExpandedId(expandedId === d.id ? null : d.id)}>
                        {expandedId === d.id ? "Sakrij" : "Detalji"}
                      </button>
                      <button className="btn-danger" onClick={() => obrisi(d.id)}>Obriši</button>
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
                            {fmt(d.pocetak)}{d.kraj ? ` → ${fmt(d.kraj)}` : ""}
                          </div>
                        </div>

                        <div>
                          <div className="details-title">Članovi</div>
                          <div>
                            {labelList(d.clanovi || [], clanovi, (c) => `${c.ime} ${c.prezime}`).map((lbl, idx) => (
                              <span key={idx} className="tag">{lbl}</span>
                            ))}
                            {(d.clanovi || []).length === 0 && <span>—</span>}
                          </div>
                        </div>

                        <div>
                          <div className="details-title">Vozila</div>
                          <div>
                            {labelList(d.vozila || [], vozila, (v) => v.model).map((lbl, idx) => (
                              <span key={idx} className="tag">{lbl}</span>
                            ))}
                            {(d.vozila || []).length === 0 && <span>—</span>}
                          </div>
                        </div>

                        <div>
                          <div className="details-title">Oprema</div>
                          <div>
                            {labelList(d.oprema || [], oprema, (o) => o.naziv).map((lbl, idx) => (
                              <span key={idx} className="tag">{lbl}</span>
                            ))}
                            {(d.oprema || []).length === 0 && <span>—</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6}>Nema unosa.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal forma */}
      {showForm && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
            <h3>{editId ? "Uredi događaj" : "Dodaj događaj"}</h3>

            <div className="form-col">
              <label>Naziv događaja</label>
              <input type="text" value={naziv} onChange={(e) => setNaziv(e.target.value)} />
            </div>

            <div className="form-col">
              <label>Početak</label>
              <DatePicker
                selected={pocetak}
                onChange={(d) => setPocetak(d)}
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                dateFormat="dd.MM.yyyy HH:mm"
                placeholderText="Odaberi datum i vrijeme"
                locale={hr}
                className="input-like"
              />
            </div>

            <div className="form-col">
              <label>Kraj</label>
              <DatePicker
                selected={kraj}
                onChange={(d) => setKraj(d)}
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                dateFormat="dd.MM.yyyy HH:mm"
                placeholderText="Odaberi datum i vrijeme (opcija)"
                locale={hr}
                className="input-like"
                minDate={pocetak || undefined}
              />
            </div>

            <div className="form-col">
              <label>Lokacija</label>
              <input type="text" value={lokacija} onChange={(e) => setLokacija(e.target.value)} />
            </div>

            <div className="form-col">
              <label>Tip</label>
              <select value={tip} onChange={(e) => setTip(e.target.value)}>
                <option value="">Odaberi tip…</option>
                <option>Intervencija</option>
                <option>Vježba</option>
                <option>Dežurstvo</option>
                <option>Djeca/mladež</option>
                <option>Ostalo</option>
              </select>
            </div>

            <div className="form-col">
              <label>Voditelj / Izvjestitelj</label>
              <input type="text" value={voditelj} onChange={(e) => setVoditelj(e.target.value)} />
            </div>

            <div className="form-col">
              <label>Opis</label>
              <textarea value={opis} onChange={(e) => setOpis(e.target.value)} />
            </div>

            {/* PICKER: Članovi */}
            <div className="form-col">
              <label>Sudionici (članovi)</label>
              <div className="picker">
                <input
                  className="picker-search"
                  placeholder="Pretraži članove…"
                  value={qClan}
                  onChange={(e) => setQClan(e.target.value)}
                />
                <div className="picker-list">
                  {fltClan.map((c) => (
                    <label key={c.id} className="picker-item">
                      <input
                        type="checkbox"
                        checked={selClanovi.includes(c.id)}
                        onChange={() => toggleId(c.id, selClanovi, setSelClanovi)}
                      />
                      <span>{c.ime} {c.prezime} {c.uloga ? `(${c.uloga})` : ""}</span>
                    </label>
                  ))}
                  {fltClan.length === 0 && <div className="picker-empty">Nema rezultata.</div>}
                </div>
              </div>
            </div>

            {/* PICKER: Vozila */}
            <div className="form-col">
              <label>Vozila</label>
              <div className="picker">
                <input
                  className="picker-search"
                  placeholder="Pretraži vozila…"
                  value={qVoz}
                  onChange={(e) => setQVoz(e.target.value)}
                />
                <div className="picker-list">
                  {fltVoz.map((v) => (
                    <label key={v.id} className="picker-item">
                      <input
                        type="checkbox"
                        checked={selVozila.includes(v.id)}
                        onChange={() => toggleId(v.id, selVozila, setSelVozila)}
                      />
                      <span>{v.model} {v.registracija ? `(${v.registracija})` : ""}</span>
                    </label>
                  ))}
                  {fltVoz.length === 0 && <div className="picker-empty">Nema rezultata.</div>}
                </div>
              </div>
            </div>

            {/* PICKER: Oprema */}
            <div className="form-col">
              <label>Oprema</label>
              <div className="picker">
                <input
                  className="picker-search"
                  placeholder="Pretraži opremu…"
                  value={qOpr}
                  onChange={(e) => setQOpr(e.target.value)}
                />
                <div className="picker-list">
                  {fltOpr.map((o) => (
                    <label key={o.id} className="picker-item">
                      <input
                        type="checkbox"
                        checked={selOprema.includes(o.id)}
                        onChange={() => toggleId(o.id, selOprema, setSelOprema)}
                      />
                      <span>
                        {o.naziv}
                        {o.inv ? ` (#${o.inv})` : ""}
                        {o.kategorija ? ` – ${o.kategorija}` : ""}
                      </span>
                    </label>
                  ))}
                  {fltOpr.length === 0 && <div className="picker-empty">Nema rezultata.</div>}
                </div>
              </div>
            </div>

            <div className="form-row">
              {editId ? (
                <button onClick={spremiDogadaj}>Spremi izmjene</button>
              ) : (
                <button onClick={dodajDogadaj}>Spremi</button>
              )}
              <button className="btn-secondary" onClick={closeModal}>Odustani</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
