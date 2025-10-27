// src/App.jsx
import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import Footer from "./components/Footer";
import "react-datepicker/dist/react-datepicker.css"; // za DatePicker

import Pocetna from "./pages/Pocetna";
import Dogadaji from "./pages/Dogadaji";
import Statistika from "./pages/Statistika";
import Clanovi from "./pages/Clanovi";
import Vozila from "./pages/Vozila";
// import Oprema from "./pages/Oprema"; // ⛔ maknuto iz navigacije/ruta
import KnjigaZaduzenja from "./pages/KnjigaZaduzenja";
import KontrolnaKnjiga from "./pages/KontrolnaKnjiga";
import Inventura from "./pages/Inventura";

import MasovnoZaduzenje from "./pages/MasovnoZaduzenje";

import "./App.css";
import { useLocalArray } from "./hooks/useLocalStorage";

// 🔹 Badge “Prijavljen: Superadmin”
import UserBadge from "./components/UserBadge.jsx";

/* ✅ NOVE STRANICE */
import DogadajiOprema from "./pages/DogadajiOprema";
import DogadajiPopisAktivnosti from "./pages/DogadajiPopisAktivnosti";
import IzvjestajiSjednica from "./pages/IzvjestajiSjednica";

/* ✅ Firestore API (globalni subscribe) */
import { ClanoviAPI, VozilaAPI } from "./services/db";

export default function App() {
  // Globalni stateovi (localStorage kao cache)
  const [clanovi, setClanovi]   = useLocalArray("clanovi", []);
  const [vozila, setVozila]     = useLocalArray("vozila", []);
  const [oprema, setOprema]     = useLocalArray("oprema", []); // koristi se na Početnoj/Događajima po potrebi
  const [dogadaji, setDogadaji] = useLocalArray("dogadaji", []);

  // Knjiga zaduženja – mora postojati i biti nizovi
  const [skladiste, setSkladiste] = useLocalArray("skladiste", []);   // [{id,naziv,ukupno}]
  const [zaduzenja, setZaduzenja] = useLocalArray("zaduzenja", []);   // [{id,clanId,artikalId,oznaka,datumYMD}]

  // ⬇️ NOVO: globalni realtime subscribe za ČLANOVE i VOZILA
  useEffect(() => {
    let unsubClanovi, unsubVozila;

    (async () => {
      unsubClanovi = await ClanoviAPI.subscribe((list) => setClanovi(list));
      unsubVozila  = await VozilaAPI.subscribe((list) => setVozila(list));
      // Ako želiš i opremu globalno, otkomentiraj sljedeće dvije linije:
      // const { OpremaAPI } = await import("./services/db");
      // opremaUnsub = await OpremaAPI.subscribe((list) => setOprema(list));
    })();

    return () => {
      unsubClanovi && unsubClanovi();
      unsubVozila && unsubVozila();
      // opremaUnsub && opremaUnsub();
    };
  }, [setClanovi, setVozila]);

  return (
    <div className="app-container">
      <Sidebar />

      <div className="main-content">
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
                  clanovi={clanovi}   // ✅ sada je punjeno iz Firestore-a
                  vozila={vozila}     // ✅ sada je punjeno iz Firestore-a
                  oprema={oprema}
                />
              }
            />

            {/* ✅ Novo: Događaji – oprema (katalog/picker opreme) */}
            <Route path="/dogadaji-oprema" element={<DogadajiOprema />} />

            {/* ✅ Novo: Događaji – popis aktivnosti */}
            <Route
              path="/dogadaji-aktivnosti"
              element={
                <DogadajiPopisAktivnosti
                  dogadaji={dogadaji}
                  setDogadaji={setDogadaji}
                />
              }
            />

            {/* Statistika */}
            <Route path="/statistika" element={<Statistika />} />

            {/* Članovi */}
            <Route
              path="/clanovi"
              element={<Clanovi /* ova stranica ionako ima svoj subscribe */ />}
            />

            {/* Vozila */}
            <Route
              path="/vozila"
              element={<Vozila /* ova stranica može imati svoj subscribe, ali i globalni je tu */ />}
            />

            {/* ⛔ Stara Oprema – maknuto iz ruta */}
            {/*
            <Route
              path="/oprema"
              element={<Oprema oprema={oprema} setOprema={setOprema} />}
            />
            */}

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
              element={<KontrolnaKnjiga clanovi={clanovi} />}
            />

            {/* Inventura */}
            <Route path="/inventura" element={<Inventura />} />

            {/* ✅ Novo: Izvještaji sjednica */}
            <Route path="/izvjestaji-sjednica" element={<IzvjestajiSjednica />} />

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

      {/* 🔹 Fiksni badge gore desno */}
      <UserBadge name="Superadmin" />
    </div>
  );
}
