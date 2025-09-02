// src/components/Sidebar.jsx
import { NavLink } from "react-router-dom";
import logo from "/logo.png"; // promijeni putanju ako treba
import cx from "classnames";

<NavLink to="/masovno-zaduzivanje" className={cx}>
  Masovno zaduživanje
</NavLink>


export default function Sidebar() {
  const cx = ({ isActive }) => `navlink${isActive ? " active" : ""}`;

  return (
    <aside className="sidebar">
      <img src={logo} alt="Logo" />
      <h2>FireTrack</h2>

      <nav>
        <NavLink to="/" end className={cx}>
          Početna
        </NavLink>
        <NavLink to="/dogadaji" className={cx}>
          Događaji
        </NavLink>
        <NavLink to="/statistika" className={cx}>
          Statistika
        </NavLink>
        <NavLink to="/clanovi" className={cx}>
          Članovi
        </NavLink>
        <NavLink to="/vozila" className={cx}>
          Vozila
        </NavLink>
        <NavLink to="/oprema" className={cx}>
          Oprema
        </NavLink>
        <NavLink to="/knjiga-zaduzenja" className={cx}>
          Knjiga zaduženja
        </NavLink>
        <NavLink to="/kontrolna-knjiga" className={cx}>
          Kontrolna knjiga opreme
        </NavLink>
        <NavLink to="/inventura" className={cx}>
          Inventura
        </NavLink>
      </nav>
    </aside>
  );
}
