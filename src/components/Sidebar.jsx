import { NavLink } from "react-router-dom";
import logo from "/logo.png"; // ili zamijeni svojom putanjom

export default function Sidebar() {
  return (
    <div className="sidebar">
      <img src={logo} alt="Logo" />
      <h2>FireTrack</h2>

      <nav>
        <NavLink to="/" className="navlink">
          Početna
        </NavLink>
        <NavLink to="/clanovi" className="navlink">
          Članovi
        </NavLink>
        <NavLink to="/vozila" className="navlink">
          Vozila
        </NavLink>
        <NavLink to="/oprema" className="navlink">
          Oprema
        </NavLink>
        <NavLink to="/dogadaji" className="navlink">
          Događaji
        </NavLink>
      </nav>
    </div>
  );
}
