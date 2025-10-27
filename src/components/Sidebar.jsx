// src/components/Sidebar.jsx
import { NavLink } from "react-router-dom";
import logo from "/logo.png"; // promijeni putanju ako treba

export default function Sidebar() {
  // Ovo će se pojaviti u DevTools konzoli čim se Sidebar rendera
  console.log("Sidebar LOADED @", new Date().toISOString());

  const linkClass = ({ isActive }) => `navlink${isActive ? " active" : ""}`;

  return (
    <aside className="sidebar">
      {/* TEST oznaka da znamo da gledaš pravi fajl */}
      <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 4 }}>
        [SIDEBAR v2]
      </div>

      <img src={logo} alt="Logo" />
      <h2>FireTrack</h2>

      <nav>
        <NavLink to="/" end className={linkClass}>
          Početna
        </NavLink>

        <NavLink to="/dogadaji" className={linkClass}>
          Događaji
        </NavLink>

        {/* ✅ Novo */}
        <NavLink to="/dogadaji-oprema" className={linkClass}>
          Događaji – oprema
        </NavLink>

        {/* ✅ Novo */}
        <NavLink to="/dogadaji-aktivnosti" className={linkClass}>
          Događaji – popis aktivnosti
        </NavLink>

        <NavLink to="/statistika" className={linkClass}>
          Statistika
        </NavLink>

        <NavLink to="/clanovi" className={linkClass}>
          Članovi
        </NavLink>

        <NavLink to="/vozila" className={linkClass}>
          Vozila
        </NavLink>

        {/* ⛔ Maknuto iz menija: Oprema */}
        {/*
        <NavLink to="/oprema" className={linkClass}>
          Oprema
        </NavLink>
        */}

        <NavLink to="/knjiga-zaduzenja" className={linkClass}>
          Knjiga zaduženja
        </NavLink>

        <NavLink to="/kontrolna-knjiga" className={linkClass}>
          Kontrolna knjiga opreme
        </NavLink>

        <NavLink to="/inventura" className={linkClass}>
          Inventura
        </NavLink>

        {/* ✅ Novo */}
        <NavLink to="/izvjestaji-sjednica" className={linkClass}>
          Izvještaji sjednica
        </NavLink>
      </nav>
    </aside>
  );
}
