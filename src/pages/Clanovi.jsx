// src/pages/Clanovi.jsx
import { useState, useMemo } from "react";
import { makeId } from "../utils/id";
import DatePicker from "react-datepicker";
import { registerLocale } from "react-datepicker";
import hr from "date-fns/locale/hr";

// HR lokalizacija
registerLocale("hr", hr);

// utili: konverzija datuma
function toYMD(date) {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function fromYMD(ymd) {
  if (!ymd) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export default function Clanovi({ clanovi, setClanovi }) {
  const [showForm, setShowForm] = useState(false);

  // polja forme
  const [ime, setIme] = useState("");
  const [prezime, setPrezime] = useState("");
  const [uloga, setUloga] = useState("");
  const [telefon, setTelefon] = useState("");
  const [email, setEmail] = useState("");
  // u UI radimo s Date objektima
  const [datumRodenjaDate, setDatumRodenjaDate] = useState(null);
  const [oib, setOib] = useState("");
  const [lijecnickiDate, setLijecnickiDate] = useState(null);

  const [editId, setEditId] = useState(null);

  const resetForm = () => {
    setIme("");
    setPrezime("");
    setUloga("");
    setTelefon("");
    setEmail("");
    setDatumRodenjaDate(null);
    setOib("");
    setLijecnickiDate(null);
    setEditId(null);
  };

  const dodajClana = () => {
    if (!ime.trim() || !prezime.trim() || !uloga) return;
    setClanovi([
      ...clanovi,
      {
        id: makeId(),
        ime,
        prezime,
        uloga,
        telefon,
        email,
        datumRodenja: toYMD(datumRodenjaDate), // spremamo "YYYY-MM-DD"
        oib,
        lijecnicki: toYMD(lijecnickiDate),     // spremamo "YYYY-MM-DD"
      },
    ]);
    resetForm();
    setShowForm(false);
  };

  const spremiClana = () => {
    if (!editId || !ime.trim() || !prezime.trim() || !uloga) return;
    const copy = clanovi.map((c) =>
      c.id === editId
        ? {
            ...c,
            ime,
            prezime,
            uloga,
            telefon,
            email,
            datumRodenja: toYMD(datumRodenjaDate),
            oib,
            lijecnicki: toYMD(lijecnickiDate),
          }
        : c
    );
    setClanovi(copy);
    resetForm();
    setShowForm(false);
  };

  const uredi = (id) => {
    const c = clanovi.find((x) => x.id === id);
    if (!c) return;
    setEditId(id);
    setIme(c.ime || "");
    setPrezime(c.prezime || "");
    setUloga(c.uloga || "");
    setTelefon(c.telefon || "");
    setEmail(c.email || "");
    setDatumRodenjaDate(fromYMD(c.datumRodenja || ""));
    setOib(c.oib || "");
    setLijecnickiDate(fromYMD(c.lijecnicki || ""));
    setShowForm(true);
  };

  const obrisi = (id) => {
    if (!window.confirm("Sigurno obrisati člana?")) return;
    setClanovi(clanovi.filter((c) => c.id !== id));
  };

  const filtered = useMemo(() => clanovi, [clanovi]);

  return (
    <div>
      <h2>Članovi</h2>

      {clanovi.length === 0 && (
        <div className="info">
          Nema članova u bazi. Klikni <b>Dodaj člana</b> za unos prvog.
        </div>
      )}

      <button onClick={() => setShowForm(true)}>Dodaj člana</button>

      <div className="table-wrap" style={{ marginTop: "12px" }}>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Ime</th>
              <th>Prezime</th>
              <th>Uloga</th>
              <th>Telefon</th>
              <th>Email</th>
              <th>Datum rođenja</th>
              <th>OIB</th>
              <th>Liječnički</th>
              <th>Akcije</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => (
              <tr key={c.id}>
                <td>{i + 1}</td>
                <td>{c.ime}</td>
                <td>{c.prezime}</td>
                <td>{c.uloga}</td>
                <td>{c.telefon || "—"}</td>
                <td>{c.email || "—"}</td>
                <td>{c.datumRodenja || "—"}</td>
                <td>{c.oib || "—"}</td>
                <td>{c.lijecnicki || "—"}</td>
                <td>
                  <div className="actions">
                    <button className="btn-secondary" onClick={() => uredi(c.id)}>
                      Uredi
                    </button>
                    <button className="btn-danger" onClick={() => obrisi(c.id)}>
                      Obriši
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan="10">Nema unosa.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal forma */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>{editId ? "Uredi člana" : "Dodaj člana"}</h3>

            {/* preporuka: ako ti modal reže popup, omotaj polja u .modal-body koja skrola */}
            <div className="modal-body">
              <div className="form-col">
                <label>Ime</label>
                <input
                  type="text"
                  placeholder="Ime"
                  value={ime}
                  onChange={(e) => setIme(e.target.value)}
                />
              </div>

              <div className="form-col">
                <label>Prezime</label>
                <input
                  type="text"
                  placeholder="Prezime"
                  value={prezime}
                  onChange={(e) => setPrezime(e.target.value)}
                />
              </div>

              <div className="form-col">
                <label>Uloga</label>
                <select value={uloga} onChange={(e) => setUloga(e.target.value)}>
                  <option value="">Odaberi ulogu…</option>
                  <option>Član</option>
                  <option>Zapovjednik</option>
                  <option>Tajnik</option>
                  <option>Ostalo</option>
                </select>
              </div>

              <div className="form-col">
                <label>Telefon</label>
                <input
                  type="text"
                  placeholder="npr. 0911234567"
                  value={telefon}
                  onChange={(e) => setTelefon(e.target.value)}
                />
              </div>

              <div className="form-col">
                <label>Email</label>
                <input
                  type="email"
                  placeholder="ime.prezime@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="form-col">
                <label>Datum rođenja</label>
                <DatePicker
                  selected={datumRodenjaDate}
                  onChange={(d) => setDatumRodenjaDate(d)}
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
                <label>OIB</label>
                <input
                  type="text"
                  placeholder="11 znamenki"
                  value={oib}
                  onChange={(e) => setOib(e.target.value)}
                />
              </div>

              <div className="form-col">
                <label>Liječnički pregled</label>
                <DatePicker
                  selected={lijecnickiDate}
                  onChange={(d) => setLijecnickiDate(d)}
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

              <div className="form-row">
                {editId ? (
                  <button onClick={spremiClana}>Spremi izmjene</button>
                ) : (
                  <button onClick={dodajClana}>Spremi</button>
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
    </div>
  );
}
