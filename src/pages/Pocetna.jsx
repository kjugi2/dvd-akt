export default function Pocetna({ clanovi, vozila, oprema, dogadaji }) {
  return (
    <div>
      <h2>Dobrodošao u FireTrack</h2>
      <p>Brz pregled stanja u bazi:</p>

      <ul>
        <li>Članova: {clanovi?.length || 0}</li>
        <li>Vozila: {vozila?.length || 0}</li>
        <li>Opreme: {oprema?.length || 0}</li>
        <li>Događaja: {dogadaji?.length || 0}</li>
      </ul>
    </div>
  );
}
