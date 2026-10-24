import { AlertTriangle } from 'lucide-react';
import Modal from './Modal.jsx';
import Button from './Button.jsx';

/**
 * Confirm dialog for destructive actions.
 * errorMessage: optional string shown inside the dialog (e.g. server error from delete attempt)
 */
export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Delete',
  isLoading = false,
  errorMessage,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" title="">
      <div>
        <div className="confirm-icon danger">
          <AlertTriangle size={26} />
        </div>
        <p className="confirm-title">{title}</p>
        <p className="confirm-message">{message}</p>
        {errorMessage && (
          <p className="confirm-error">{errorMessage}</p>
        )}
      </div>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
        <Button variant="secondary" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} isLoading={isLoading}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
