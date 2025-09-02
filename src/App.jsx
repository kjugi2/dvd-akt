import { Routes, Route } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import Footer from "./components/Footer";
import "react-datepicker/dist/react-datepicker.css"; // za DatePicker

import Pocetna from "./pages/Pocetna";
import Dogadaji from "./pages/Dogadaji";
import Statistika from "./pages/Statistika";
import Clanovi from "./pages/Clanovi";
import Vozila from "./pages/Vozila";
import Oprema from "./pages/Oprema";
import KnjigaZaduzenja from "./pages/KnjigaZaduzenja";
import KontrolnaKnjiga from "./pages/KontrolnaKnjiga";
import Inventura from "./pages/Inventura";

import MasovnoZaduzenje from "./pages/MasovnoZaduzenje";

import "./App.css";
import { useLocalArray } from "./hooks/useLocalStorage";

export default function App() {
  // Globalni stateovi (localStorage)
  const [clanovi, setClanovi]   = useLocalArray("clanovi", []);
  const [vozila, setVozila]     = useLocalArray("vozila", []);
  const [oprema, setOprema]     = useLocalArray("oprema", []);
  const [dogadaji, setDogadaji] = useLocalArray("dogadaji", []);

  // Knjiga zaduženja – mora postojati i biti nizovi
  const [skladiste, setSkladiste] = useLocalArray("skladiste", []);   // [{id,naziv,ukupno}]
  const [zaduzenja, setZaduzenja] = useLocalArray("zaduzenja", []);   // [{id,clanId,artikalId,oznaka,datumYMD}]

  return (
    <div className="app-container">
      <Sidebar />

      <div className="main-content">
        {/* DODANO: content--fluid za jači CSS target */}
        <div className="content content--fluid">
          <Routes>
            {/* Početna */}
            <Route
              path="/"
              element={
                <Pocetna
                  clanovi={clanovi}
                  vozila={vozila}
                  oprema={oprema}
                  dogadaji={dogadaji}
                />
              }
            />

            {/* Događaji */}
            <Route
              path="/dogadaji"
              element={
                <Dogadaji
                  dogadaji={dogadaji}
                  setDogadaji={setDogadaji}
                  clanovi={clanovi}
                  vozila={vozila}
                  oprema={oprema}
                />
              }
            />

            {/* Statistika */}
            <Route path="/statistika" element={<Statistika />} />

            {/* Članovi */}
            <Route
              path="/clanovi"
              element={<Clanovi clanovi={clanovi} setClanovi={setClanovi} />}
            />

            {/* Vozila */}
            <Route
              path="/vozila"
              element={<Vozila vozila={vozila} setVozila={setVozila} />}
            />

            {/* Oprema */}
            <Route
              path="/oprema"
              element={<Oprema oprema={oprema} setOprema={setOprema} />}
            />

            {/* Knjiga zaduženja */}
            <Route
              path="/knjiga-zaduzenja"
              element={
                <KnjigaZaduzenja
                  clanovi={clanovi}
                  skladiste={skladiste}
                  setSkladiste={setSkladiste}
                  zaduzenja={zaduzenja}
                  setZaduzenja={setZaduzenja}
                />
              }
            />

            {/* Masovno zaduživanje */}
            <Route
              path="/masovno-zaduzivanje"
              element={
                <MasovnoZaduzenje
                  clanovi={clanovi}
                  skladiste={skladiste}
                  zaduzenja={zaduzenja}
                  setZaduzenja={setZaduzenja}
                />
              }
            />

            {/* Kontrolna knjiga */}
            <Route
  path="/kontrolna-knjiga"
  element={<KontrolnaKnjiga clanovi={clanovi} />} />

            {/* Inventura */}
            <Route path="/inventura" element={<Inventura />} />

            {/* Fallback na početnu */}
            <Route
              path="*"
              element={
                <Pocetna
                  clanovi={clanovi}
                  vozila={vozila}
                  oprema={oprema}
                  dogadaji={dogadaji}
                />
              }
            />
          </Routes>
        </div>

        <Footer />
      </div>
    </div>
  );
}
