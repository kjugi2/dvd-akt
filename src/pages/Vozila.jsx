import { useState, useMemo } from "react";
import { v4 as uuidv4 } from "uuid"; // ako nemaš, instaliraj: npm install uuid

export default function Vozila({ vozila, setVozila }) {
  const [showForm, setShowForm] = useState(false);

  // polja forme
  const [tip, setTip] = useState("");
  const [model, setModel] = useState("");
  const [registracija, setRegistracija] = useState("");
  const [tehnicki, setTehnicki] = useState("");
  const [servis, setServis] = useState("");
  const [status, setStatus] = useState("");

  const [editId, setEditId] = useState(null);

  const resetForm = () => {
    setTip("");
    setModel("");
    setRegistracija("");
    setTehnicki("");
    setServis("");
    setStatus("");
    setEditId(null);
  };

  // Dodavanje novog vozila
  const dodajVozilo = () => {
    if (!tip || !model.trim() || !registracija.trim() || !status) return;

    const novo = {
      id: uuidv4(),
      tip,
      model,
      registracija,
      tehnicki: tehnicki || null,
      servis: servis || null,
      status,
    };

    setVozila([...vozila, novo]);
    resetForm();
    setShowForm(false);
  };

  // Spremanje izmjena postojećeg vozila
  const spremiVozilo = () => {
    if (!editId || !tip || !model.trim() || !registracija.trim() || !status) return;

    const updated = vozila.map((v) =>
      v.id === editId
        ? {
            ...v,
            tip,
            model,
            registracija,
            tehnicki: tehnicki || null,
            servis: servis || null,
            status,
          }
        : v
    );

    setVozila(updated);
    resetForm();
    setShowForm(false);
  };

  // Uređivanje
  const uredi = (id) => {
    const v = vozila.find((x) => x.id === id);
    if (!v) return;
    setEditId(id);
    setTip(v.tip);
    setModel(v.model);
    setRegistracija(v.registracija);
    setTehnicki(v.tehnicki || "");
    setServis(v.servis || "");
    setStatus(v.status);
    setShowForm(true);
  };

  // Brisanje
  const obrisi = (id) => {
    if (!window.confirm("Sigurno obrisati vozilo?")) return;
    setVozila(vozila.filter((v) => v.id !== id));
  };

  const filtered = useMemo(() => vozila, [vozila]);

  return (
    <div>
      <h2>Vozila</h2>

      {vozila.length === 0 && (
        <div className="info">
          Nema vozila u bazi. Klikni <b>Dodaj vozilo</b> za unos prvog.
        </div>
      )}

      <button onClick={() => setShowForm(true)}>Dodaj vozilo</button>

      <div className="table-wrap" style={{ marginTop: "12px" }}>
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
              <tr key={v.id}>
                <td>{i + 1}</td>
                <td>{v.tip}</td>
                <td>{v.model}</td>
                <td>{v.registracija}</td>
                <td>{v.tehnicki || "—"}</td>
                <td>{v.servis || "—"}</td>
                <td>{v.status}</td>
                <td>
                  <button className="btn-secondary" onClick={() => uredi(v.id)}>
                    Uredi
                  </button>
                  <button className="btn-danger" onClick={() => obrisi(v.id)}>
                    Obriši
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan="8">Nema unosa.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal forma */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>{editId ? "Uredi vozilo" : "Dodaj vozilo"}</h3>

            <div className="form-col">
              <label>Tipizacija vozila</label>
              <select value={tip} onChange={(e) => setTip(e.target.value)}>
                <option value="">Odaberi tip…</option>
                <option>Navalno vozilo</option>
                <option>Kombi</option>
                <option>Ostalo</option>
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
              <input
                type="date"
                value={tehnicki}
                onChange={(e) => setTehnicki(e.target.value)}
              />
            </div>

            <div className="form-col">
              <label>Servis</label>
              <input
                type="date"
                value={servis}
                onChange={(e) => setServis(e.target.value)}
              />
            </div>

            <div className="form-col">
              <label>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">Odaberi status…</option>
                <option>Operativno</option>
                <option>U servisu</option>
                <option>Neispravno</option>
              </select>
            </div>

            <div className="form-row">
              {editId ? (
                <button onClick={spremiVozilo}>Spremi izmjene</button>
              ) : (
                <button onClick={dodajVozilo}>Spremi</button>
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
