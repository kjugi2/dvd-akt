import { Routes, Route } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import Footer from "./components/Footer";

import Pocetna from "./pages/Pocetna";
import Clanovi from "./pages/Clanovi";
import Vozila from "./pages/Vozila";
import Oprema from "./pages/Oprema";
import Dogadaji from "./pages/Dogadaji";

import "./App.css";
import { useLocalArray } from "./hooks/useLocalStorage";

export default function App() {
  // kolekcije u localStorage
  const [clanovi, setClanovi] = useLocalArray("clanovi", []);
  const [vozila, setVozila] = useLocalArray("vozila", []);
  const [oprema, setOprema] = useLocalArray("oprema", []);
  const [dogadaji, setDogadaji] = useLocalArray("dogadaji", []);

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <div className="content">
          <Routes>
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
            <Route
              path="/clanovi"
              element={<Clanovi clanovi={clanovi} setClanovi={setClanovi} />}
            />
            <Route
              path="/vozila"
              element={<Vozila vozila={vozila} setVozila={setVozila} />}
            />
            <Route
              path="/oprema"
              element={<Oprema oprema={oprema} setOprema={setOprema} />}
            />
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
          </Routes>
        </div>
        <Footer />
      </div>
    </div>
  );
}
