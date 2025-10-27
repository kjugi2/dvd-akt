// src/services/db.js
import { db, authReady } from "../lib/firebase";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  where,
} from "firebase/firestore";

/* ---------- Helper: normalizacija naziva (bez dijakritika, trim, lower, 1 razmak) ---------- */
const normalizeName = (s) =>
  (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

/** Generički CRUD za bilo koju kolekciju */
function makeCrud(
  collectionName,
  { defaultOrderBy = ["createdAt", "desc"], trimStringFields = true } = {}
) {
  const colRef = collection(db, collectionName);

  const trimObj = (obj) => {
    if (!trimStringFields || !obj) return obj;
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = typeof v === "string" ? v.trim() : v;
    }
    return out;
  };

  return {
    /** READ (jednokratno) */
    async listOnce(filters = []) {
      await authReady;
      let qy = query(colRef, orderBy(...defaultOrderBy));
      if (filters.length) {
        // filters: [ [field, op, value], ... ]
        filters.forEach(([f, op, v]) => (qy = query(qy, where(f, op, v))));
      }
      const snap = await getDocs(qy);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    },

    /** READ (realtime) */
    async subscribe(callback, filters = []) {
      await authReady;
      let qy = query(colRef, orderBy(...defaultOrderBy));
      if (filters.length) {
        filters.forEach(([f, op, v]) => (qy = query(qy, where(f, op, v))));
      }
      const unsub = onSnapshot(
        qy,
        (snap) => {
          callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        },
        (err) => {
          console.error(`[${collectionName}] onSnapshot error:`, err);
        }
      );
      return unsub;
    },

    /** CREATE */
    async create(data) {
      await authReady;
      const payload = { ...trimObj(data), createdAt: serverTimestamp() };
      try {
        const ref = await addDoc(colRef, payload);
        return ref.id;
      } catch (err) {
        console.error(`[${collectionName}] create error:`, err, { data: payload });
        throw err;
      }
    },

    /** UPDATE */
    async update(id, data) {
      await authReady;
      if (!id) throw new Error(`[${collectionName}] update: nedostaje ID`);
      try {
        await updateDoc(doc(db, collectionName, id), {
          ...trimObj(data),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.error(`[${collectionName}] update error:`, err, { id, data });
        throw err;
      }
    },

    /** DELETE */
    async remove(id) {
      await authReady;
      if (!id) throw new Error(`[${collectionName}] remove: nedostaje ID`);
      try {
        await deleteDoc(doc(db, collectionName, id));
      } catch (err) {
        console.error(`[${collectionName}] remove error:`, err, { id });
        throw err;
      }
    },
  };
}

/* ====== KONKRETNI API-ji (kolekcije) ====== */

// Članovi — ostaje po createdAt (radi ti ok)
export const ClanoviAPI = makeCrud("clanovi");

// Vozila — sortiraj po registraciji (ASCII)
export const VozilaAPI = makeCrud("vozila", {
  defaultOrderBy: ["registracija", "asc"],
});

// Oprema (katalog) — unikat po nazivu (case-insensitive, bez dijakritika)
const baseOprema = makeCrud("oprema", { defaultOrderBy: ["naziv", "asc"] });

export const OpremaAPI = {
  ...baseOprema,

  /** Kreiraj opremu ako ne postoji; inače vrati postojeći ID. */
  async createIfNotExists(name) {
    await authReady;
    const naziv = (name || "").trim();
    if (!naziv) throw new Error("Naziv je obavezan.");

    const key = normalizeName(naziv);
    const colRef = collection(db, "oprema");
    const qy = query(colRef, where("naziv_ci", "==", key));
    const snap = await getDocs(qy);

    if (!snap.empty) {
      return snap.docs[0].id; // već postoji
    }

    const ref = await addDoc(colRef, {
      naziv,
      naziv_ci: key,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  },

  /** Update naziva (održava i naziv_ci). */
  async updateName(id, newName) {
    await authReady;
    const naziv = (newName || "").trim();
    if (!naziv) throw new Error("Naziv je obavezan.");
    await updateDoc(doc(db, "oprema", id), {
      naziv,
      naziv_ci: normalizeName(naziv),
      updatedAt: serverTimestamp(),
    });
  },

  /** (Opcionalno) Jednokratno popuni naziv_ci za postojeće dokumente bez njega. Pokreni ručno po potrebi. */
  async backfillNazivCi() {
    await authReady;
    const colRef = collection(db, "oprema");
    const snap = await getDocs(colRef);
    const updates = snap.docs
      .filter((d) => !d.data().naziv_ci)
      .map((d) =>
        updateDoc(doc(db, "oprema", d.id), {
          naziv_ci: normalizeName(d.data().naziv || ""),
          updatedAt: serverTimestamp(),
        })
      );
    await Promise.all(updates);
    return updates.length; // broj ažuriranih dokumenata
  },
};

/* === Aktivnosti – KATEGORIJE (npr. Operativne aktivnosti, Sastanci) === */
export const AktivnostiKategorijeAPI = makeCrud("aktivnostiKategorije", {
  defaultOrderBy: ["naziv", "asc"],
});

/* === Aktivnosti (stavke unutar kategorija) ===
   - podrška za duplicheck po (kategorijaId + naziv_ci)
   - pomoćne metode za rad unutar kategorije
*/
const baseAktivnosti = makeCrud("aktivnosti", { defaultOrderBy: ["naziv", "asc"] });

export const AktivnostiAPI = {
  ...baseAktivnosti,

  /** Kreiraj aktivnost (bez kategorije) ako ne postoji; inače vrati postojeći ID. */
  async createIfNotExists(name) {
    await authReady;
    const naziv = (name || "").trim();
    if (!naziv) throw new Error("Naziv je obavezan.");

    const key = normalizeName(naziv);
    const colRef = collection(db, "aktivnosti");
    const qy = query(colRef, where("naziv_ci", "==", key));
    const snap = await getDocs(qy);

    if (!snap.empty) {
      return snap.docs[0].id; // već postoji
    }

    const ref = await addDoc(colRef, {
      naziv,
      naziv_ci: key,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  },

  /** Kreiraj aktivnost unutar kategorije (spriječi duplikate po kategoriji). */
  async createInCategory(kategorijaId, name) {
    await authReady;
    const naziv = (name || "").trim();
    if (!naziv || !kategorijaId) throw new Error("Nedostaje naziv ili kategorija.");
    const key = normalizeName(naziv);

    const colRef = collection(db, "aktivnosti");
    const qy = query(colRef, where("kategorijaId", "==", kategorijaId));
    const snap = await getDocs(qy);

    const dupe = snap.docs.find((d) => normalizeName(d.data().naziv) === key);
    if (dupe) return dupe.id;

    const ref = await addDoc(colRef, {
      naziv,
      naziv_ci: key,
      kategorijaId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  },

  /** createIfNotExists IN CATEGORY (kombinira oba uvjeta) */
  async createIfNotExistsInCategory(kategorijaId, name) {
    return this.createInCategory(kategorijaId, name);
  },

  /** Update naziva (držimo i naziv_ci u sync). */
  async updateName(id, newName) {
    await authReady;
    const naziv = (newName || "").trim();
    if (!naziv) throw new Error("Naziv je obavezan.");
    await updateDoc(doc(db, "aktivnosti", id), {
      naziv,
      naziv_ci: normalizeName(naziv),
      updatedAt: serverTimestamp(),
    });
  },

  /** Update naziva unutar kategorije (opcionalno: ako želiš dodatno validirati duplikate po kategoriji) */
  async updateNameInCategory(id, kategorijaId, newName) {
    await authReady;
    const naziv = (newName || "").trim();
    if (!id || !kategorijaId || !naziv) throw new Error("Nedostaju podaci za update.");
    const key = normalizeName(naziv);

    // provjeri duplikat u kategoriji
    const colRef = collection(db, "aktivnosti");
    const qy = query(colRef, where("kategorijaId", "==", kategorijaId));
    const snap = await getDocs(qy);
    const dupe = snap.docs.find(
      (d) => d.id !== id && normalizeName(d.data().naziv) === key
    );
    if (dupe) throw new Error("U toj kategoriji već postoji aktivnost s tim imenom.");

    await updateDoc(doc(db, "aktivnosti", id), {
      naziv,
      naziv_ci: key,
      kategorijaId,
      updatedAt: serverTimestamp(),
    });
  },

  /** (Opcionalno) Backfill naziv_ci za stare zapise. */
  async backfillNazivCi() {
    await authReady;
    const colRef = collection(db, "aktivnosti");
    const snap = await getDocs(colRef);
    const updates = snap.docs
      .filter((d) => !d.data().naziv_ci)
      .map((d) =>
        updateDoc(doc(db, "aktivnosti", d.id), {
          naziv_ci: normalizeName(d.data().naziv || ""),
          updatedAt: serverTimestamp(),
        })
      );
    await Promise.all(updates);
    return updates.length;
  },
};

// Skladište (artikli/oprema na lageru)
export const SkladisteAPI = makeCrud("skladiste");

// Knjiga zaduženja (tko je što zadužio)
export const ZaduzenjaAPI = makeCrud("zaduzenja");

// Kontrolna knjiga opreme (oprema + unosi kao array)
export const KontrolnaKnjigaAPI = makeCrud("kontrolnaKnjiga");
