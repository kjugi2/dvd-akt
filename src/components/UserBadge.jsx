export default function UserBadge({ name = "Superadmin" }) {
  return (
    <div
      className="userbadge"
      aria-label={`Prijavljen korisnik: ${name}`}
      title={`Prijavljen korisnik: ${name}`}
    >
      <span className="userbadge__icon">👤</span>
      <span className="userbadge__text">{name}</span>
    </div>
  );
}
