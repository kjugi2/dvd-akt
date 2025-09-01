// src/components/Modal.jsx
export default function Modal({ open, onClose, children }) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()} // da klik unutra ne zatvara
      >
        {children}
      </div>
    </div>
  );
}
