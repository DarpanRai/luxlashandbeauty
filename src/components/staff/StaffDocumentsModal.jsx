import { X, Download } from "lucide-react";

// Documents are stored as data: URLs (see StaffFormModal's FileReader.readAsDataURL),
// so there's no server file to fetch — the mime type embedded in the URL itself is
// the only source for a sensible download extension.
const extensionFromDataUrl = (dataUrl) => {
  const match = /^data:image\/(\w+);base64,/.exec(dataUrl);
  const mime = match?.[1] || "png";
  return mime === "jpeg" ? "jpg" : mime;
};

const sanitize = (name) => name.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "staff";

export default function StaffDocumentsModal({ staffName, documents, onClose }) {
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h2>{staffName}'s documents</h2>
          <button type="button" className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          {documents.map((doc, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <img
                src={doc}
                alt={`Document ${i + 1}`}
                style={{ width: "100%", maxHeight: 320, objectFit: "contain", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)" }}
              />
              <a
                className="btn btn-ghost"
                href={doc}
                download={`${sanitize(staffName)}-document-${i + 1}.${extensionFromDataUrl(doc)}`}
                style={{ justifyContent: "center", textDecoration: "none" }}
              >
                <Download size={14} /> Download document {i + 1}
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
