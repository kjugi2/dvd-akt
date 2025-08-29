import { useState, useMemo } from "react";
import { makeId } from "../utils/id";

export default function Clanovi({ clanovi, setClanovi }) {
  const [showForm, setShowForm] = useState(false);

  // polja forme
  const [ime, setIme] = useState("");
  const [prezime, setPrezime] = useState("");
  const [uloga, setUloga] = useState("");
  const [telefon, setTelefon] = useState("");
  const [email, setEmail] = useState("");
  const [datumRodenja, setDatumRodenja] = useState("");
  const [oib, setOib] = useState("");
  const [lijecnicki, setLijecnicki] = useState("");

  const [editId, setEditId] = useState(null);

  const resetForm = () => {
    setIme("");
    setPrezime("");
    setUloga("");
    setTelefon("");
    setEmail("");
    setDatumRodenja("");
    setOib("");
    setLijecnicki("");
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
        datumRodenja,
        oib,
        lijecnicki,
      },
    ]);
    resetForm();
    setShowForm(false);
  };

  const spremiClana = () => {
    if (!editId || !ime.trim() || !prezime.trim() || !uloga) return;
    const copy = clanovi.map((c) =>
      c.id === editId
        ? { ...c, ime, prezime, uloga, telefon, email, datumRodenja, oib, lijecnicki }
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
    setIme(c.ime);
    setPrezime(c.prezime);
    setUloga(c.uloga);
    setTelefon(c.telefon || "");
    setEmail(c.email || "");
    setDatumRodenja(c.datumRodenja || "");
    setOib(c.oib || "");
    setLijecnicki(c.lijecnicki || "");
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
              <input
                type="date"
                value={datumRodenja}
                onChange={(e) => setDatumRodenja(e.target.value)}
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
              <input
                type="date"
                value={lijecnicki}
                onChange={(e) => setLijecnicki(e.target.value)}
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
      )}
    </div>
  );
}
