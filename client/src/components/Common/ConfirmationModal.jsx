import { AlertCircle, X } from "lucide-react";

export function ConfirmationModal({ dialog, submitting, onCancel, onConfirm }) {
  if (!dialog) {
    return null;
  }

  const Icon = dialog.icon || AlertCircle;

  return (
    <div className="modal-backdrop" role="presentation" onClick={submitting ? undefined : onCancel}>
      <div
        className={`confirm-modal panel confirm-modal-${dialog.tone || "danger"}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-description"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="confirm-modal-head">
          <span className="confirm-modal-icon">
            <Icon size={20} />
          </span>
          <button
            className="icon-btn"
            type="button"
            onClick={onCancel}
            disabled={submitting}
            aria-label="Close confirmation modal"
          >
            <X size={14} />
          </button>
        </div>

        <div className="confirm-modal-copy">
          <p className="eyebrow">{dialog.eyebrow || "Confirmation required"}</p>
          <h2 id="confirm-modal-title">{dialog.title}</h2>
          <p id="confirm-modal-description">{dialog.description}</p>
          {dialog.note ? <p className="confirm-modal-note">{dialog.note}</p> : null}
        </div>

        <div className="confirm-modal-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={onCancel}
            disabled={submitting}
          >
            {dialog.cancelLabel || "Cancel"}
          </button>
          <button
            className={dialog.tone === "danger" ? "danger-button" : "primary-button"}
            type="button"
            onClick={onConfirm}
            disabled={submitting}
          >
            {submitting ? dialog.pendingLabel || "Processing..." : dialog.confirmLabel || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
