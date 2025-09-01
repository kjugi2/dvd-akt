// src/pages/Oprema.jsx
import { useState, useMemo, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { makeId } from "../utils/id";
import { toSlug } from "../utils/slug";
import { OPREMA_KATEGORIJE } from "../constants/opremaKategorije";
import Modal from "../components/Modal";

<Link className="cat-btn" to="/oprema/cijevi">Vatrogasne cijevi</Link>


const CIJEV_TIP_OPCIJE = ["Tlačna", "Usisna"];
const CIJEV_PROMJER_OPCIJE = ["A", "B", "C", "D"];

export default function Oprema({ oprema = [], setOprema }) {
  const { kat } = useParams();
  const [naziv, setNaziv] = useState("");
  const [kategorija, setKategorija] = useState("Armature");
  const [inv, setInv] = useState("");
  const [editId, setEditId] = useState(null);
  const [q, setQ] = useState("");

  const [openModal, setOpenModal] = useState(false);
  const [cTip, setCTip] = useState("Tlačna");
  const [cPromjer, setCPromjer] = useState("C");

  const selectedCategory =
    kat ? OPREMA_KATEGORIJE.find((k) => toSlug(k) === kat) : null;

  const isCijevi = selectedCategory === "Vatrogasne cijevi";

  useEffect(() => {
    if (!selectedCategory) setKategorija("Armature");
  }, [selectedCategory]);

  const resetForm = () => {
    setNaziv("");
    setInv("");
    setEditId(null);
    if (!selectedCategory) setKategorija("Armature");
    setCTip("Tlačna");
    setCPromjer("C");
  };

  const dodaj = () => {
    const cat = selectedCategory ?? kategorija;
    if (naziv.trim() === "" || !cat) return;

    const base = {
      id: makeId(),
      naziv: naziv.trim(),
      kategorija: cat,
      inv: inv.trim(),
    };

    const payload = isCijevi ? { ...base, tip: cTip, promjer: cPromjer } : base;
    setOprema([...oprema, payload]);
    resetForm();
  };

  const spremi = () => {
    const cat = selectedCategory ?? kategorija;
    if (!editId || naziv.trim() === "" || !cat) return;

    setOprema(
      oprema.map((o) => {
        if (o.id !== editId) return o;
        const base = {
          ...o,
          naziv: naziv.trim(),
          kategorija: cat,
          inv: inv.trim(),
        };
        return isCijevi ? { ...base, tip: cTip, promjer: cPromjer } : base;
      })
    );
    resetForm();
  };

  const uredi = (id) => {
    const o = oprema.find((x) => x.id === id);
    if (!o) return;
    setEditId(id);
    setNaziv(o.naziv);
    setInv(o.inv || "");
    setKategorija(o.kategorija);

    if (o.kategorija === "Vatrogasne cijevi") {
      setCTip(o.tip || "Tlačna");
      setCPromjer(o.promjer || "C");
      setOpenModal(true);
    }
  };

  const obrisi = (id) => {
    if (!window.confirm("Sigurno obrisati opremu?")) return;
    setOprema(oprema.filter((o) => o.id !== id));
    if (editId === id) resetForm();
  };

  const listForView = useMemo(() => {
    if (!selectedCategory) return oprema;
    return oprema.filter((o) => o.kategorija === selectedCategory);
  }, [oprema, selectedCategory]);

  const filtered = useMemo(
    () =>
      listForView.filter((o) => {
        const ql = q.toLowerCase();
        return (
          (o.naziv || "").toLowerCase().includes(ql) ||
          (o.kategorija || "").toLowerCase().includes(ql) ||
          ((o.inv || "") + "").toLowerCase().includes(ql) ||
          ((o.tip || "") + "").toLowerCase().includes(ql) ||
          ((o.promjer || "") + "").toLowerCase().includes(ql)
        );
      }),
    [listForView, q]
  );

  // Root: kategorije
  if (!kat) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Oprema</h2>
        <p>Odaberi kategoriju:</p>
        <div className="category-grid">
          {OPREMA_KATEGORIJE.map((k) => (
            <Link key={k} className="cat-btn" to={`/oprema/${toSlug(k)}`}>
              {k}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  // Nepoznata kategorija
  if (kat && !selectedCategory) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Oprema</h2>
        <p>Kategorija ne postoji.</p>
        <div className="breadcrumbs">
          <Link to="/oprema">← Sve kategorije</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Oprema — {selectedCategory}</h2>
      <div className="breadcrumbs">
        <Link to="/oprema">← Sve kategorije</Link>
      </div>

      {isCijevi ? (
        <div style={{ margin: "8px 0 16px" }}>
          <button
            onClick={() => {
              resetForm();
              setKategorija("Vatrogasne cijevi");
              setOpenModal(true);
            }}
          >
            Dodaj
          </button>
        </div>
      ) : (
        <div className="form-row">
          <input
            type="text"
            placeholder="Naziv opreme"
            value={naziv}
            onChange={(e) => setNaziv(e.target.value)}
          />
          <select
            value={selectedCategory ? selectedCategory : kategorija}
            onChange={(e) => setKategorija(e.target.value)}
            disabled={!!selectedCategory}
          >
            {OPREMA_KATEGORIJE.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Inventarski broj (opcionalno)"
            value={inv}
            onChange={(e) => setInv(e.target.value)}
          />

          {editId === null ? (
            <button onClick={dodaj}>Dodaj</button>
          ) : (
            <>
              <button className="btn-secondary" onClick={spremi}>
                Spremi izmjene
              </button>
              <button className="btn-secondary" onClick={resetForm}>
                Odustani
              </button>
            </>
          )}
        </div>
      )}

      <div className="list-header">
        <h3>Popis opreme</h3>
        <input
          className="search"
          type="text"
          placeholder="Pretraži…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Naziv</th>
              {isCijevi && <th>Tip</th>}
              {isCijevi && <th>Promjer</th>}
              <th>Inventarski broj</th>
              <th>Akcije</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o, i) => (
              <tr key={o.id}>
                <td>{i + 1}</td>
                <td>{o.naziv}</td>
                {isCijevi && <td>{o.tip || "—"}</td>}
                {isCijevi && <td>{o.promjer || "—"}</td>}
                <td>{o.inv || "—"}</td>
                <td>
                  <div className="actions">
                    <button className="btn-secondary" onClick={() => uredi(o.id)}>
                      Uredi
                    </button>
                    <button className="btn-danger" onClick={() => obrisi(o.id)}>
                      Obriši
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={isCijevi ? 6 : 5}>Nema rezultata.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal za dodavanje/uređivanje cijevi */}
      <Modal open={openModal} onClose={() => setOpenModal(false)}>
        <h3>{editId ? "Uredi vatrogasnu cijev" : "Dodaj vatrogasnu cijev"}</h3>

        <div className="form-row" style={{ marginTop: 12 }}>
          <input
            type="text"
            placeholder="Naziv (npr. C52 15 m)"
            value={naziv}
            onChange={(e) => setNaziv(e.target.value)}
            autoFocus
          />

          <select value={cTip} onChange={(e) => setCTip(e.target.value)}>
            {CIJEV_TIP_OPCIJE.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>

          <select value={cPromjer} onChange={(e) => setCPromjer(e.target.value)}>
            {CIJEV_PROMJER_OPCIJE.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Inventarski broj (opcionalno)"
            value={inv}
            onChange={(e) => setInv(e.target.value)}
          />
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 12,
            justifyContent: "flex-end",
          }}
        >
          <button
            className="btn-secondary"
            onClick={() => {
              setOpenModal(false);
              resetForm();
            }}
          >
            Odustani
          </button>
          <button
            onClick={() => {
              setKategorija("Vatrogasne cijevi");
              if (editId) {
                spremi();
              } else {
                dodaj();
              }
              setOpenModal(false);
            }}
          >
            {editId ? "Spremi" : "Dodaj"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
