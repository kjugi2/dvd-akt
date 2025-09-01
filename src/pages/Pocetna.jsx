// src/pages/Pocetna.jsx
import { useMemo } from "react";
import { Link } from "react-router-dom";

// • Pomaže sigurno parsirati datum iz raznih formata (YYYY-MM-DD, DD.MM.YYYY, ...).
function parseDate(val) {
  if (!val) return null;
  // ako je već Date
  if (val instanceof Date && !isNaN(val)) return val;
  // ISO / YYYY-MM-DD
  const iso = new Date(val);
  if (!isNaN(iso)) return iso;
  // DD.MM.YYYY ili D.M.YYYY
  const m = String(val).match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (m) {
    const [_, d, mo, y] = m;
    return new Date(Number(y), Number(mo) - 1, Number(d));
  }
  return null;
}

export default function Pocetna({ clanovi = [], vozila = [], oprema = [], dogadaji = [] }) {
  const now = new Date();
  const thisYear = now.getFullYear();

  // Posljednjih 5 događaja (po datumu)
  const lastEvents = useMemo(() => {
    const items = [...dogadaji].map((e) => ({
      ...e,
      _date: parseDate(e.datum || e.date || e.vrijeme || e.start || e.when),
      _title: e.naziv || e.naslov || e.title || "Aktivnost",
      _type: e.vrsta || e.tip || e.category || "",
    }));
    items.sort((a, b) => (b._date?.getTime?.() || 0) - (a._date?.getTime?.() || 0));
    return items.slice(0, 5);
  }, [dogadaji]);

  // Statistika po tipu (ako nema tipa, sve ide u "Ostalo")
  const stats = useMemo(() => {
    let interv = 0, ostalo = 0;
    dogadaji.forEach((e) => {
      const t = (e.vrsta || e.tip || "").toLowerCase();
      if (t.includes("interv")) interv += 1;
      else ostalo += 1;
    });
    return { interv, ostalo, ukupno: interv + ostalo };
  }, [dogadaji]);

  // Mjesečni broj događaja za tekuću godinu
  const monthly = useMemo(() => {
    const arr = Array(12).fill(0);
    dogadaji.forEach((e) => {
      const d = parseDate(e.datum || e.date || e.vrijeme || e.start || e.when);
      if (!d) return;
      if (d.getFullYear() !== thisYear) return;
      arr[d.getMonth()] += 1;
    });
    return arr;
  }, [dogadaji, thisYear]);

  const maxVal = Math.max(1, ...monthly);
  const months = ["Sij", "Velj", "Ožu", "Tra", "Svi", "Lip", "Srp", "Kol", "Ruj", "Lis", "Stu", "Pro"];

  return (
    <div className="dash">
      <div className="dash-grid">
        {/* Zadnje aktivnosti */}
        <section className="card">
          <div className="card-header">
            <h3>Zadnje aktivnosti</h3>
            <div className="card-actions">
              <Link to="/dogadaji" className="btn-secondary">Prikaži sve</Link>
              <Link to="/dogadaji" className="btn">Dodaj aktivnost</Link>
            </div>
          </div>
          <div className="last-list">
            <div className="last-row last-head">
              <span>Naslov</span>
              <span>Datum</span>
            </div>
            {lastEvents.map((e, i) => (
              <div key={(e.id || i) + "-last"} className="last-row">
                <span className="title">{e._title}</span>
                <span className="date">
                  {e._date ? e._date.toLocaleDateString("hr-HR") : "—"}
                </span>
              </div>
            ))}
            {lastEvents.length === 0 && (
              <div className="empty">Nema aktivnosti.</div>
            )}
          </div>
        </section>

        {/* Godišnja statistika + graf */}
        <section className="card span-2">
          <div className="card-header">
            <h3>{thisYear}</h3>
          </div>

          <div className="stats-tiles">
            <div className="tile tile-red">
              <div className="tile-big">{stats.interv}</div>
              <div className="tile-sub">Intervencija</div>
            </div>
            <div className="tile tile-yellow">
              <div className="tile-big">{stats.ostalo}</div>
              <div className="tile-sub">Ostalih</div>
            </div>
            <div className="tile tile-gray">
              <div className="tile-big">{stats.ukupno}</div>
              <div className="tile-sub">Ukupno</div>
            </div>
          </div>

          <div className="bar-wrap">
            {/* jednostavan CSS bar chart bez libova */}
            {monthly.map((val, i) => {
              const h = Math.round((val / maxVal) * 100);
              return (
                <div key={i} className="bar-col">
                  <div className="bar" style={{ height: `${h}%` }} title={`${months[i]}: ${val}`} />
                  <div className="bar-label">{months[i]}</div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Brzi sažetak baze */}
        <section className="card">
          <div className="card-header"><h3>Sažetak baze</h3></div>
          <ul className="kv">
            <li><span>Članova</span><b>{clanovi?.length || 0}</b></li>
            <li><span>Vozila</span><b>{vozila?.length || 0}</b></li>
            <li><span>Opreme</span><b>{oprema?.length || 0}</b></li>
            <li><span>Događaja</span><b>{dogadaji?.length || 0}</b></li>
          </ul>
        </section>
      </div>
    </div>
  );
}
