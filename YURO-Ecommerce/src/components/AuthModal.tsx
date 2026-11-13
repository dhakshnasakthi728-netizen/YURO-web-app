import { createPortal } from 'react-dom';
import { Check, X } from 'lucide-react';
import { useDialog } from '../hooks/useDialog';
import { AuthForm } from './AuthForm';
import { Brand } from './Brand';

type AuthModalProps = {
  onClose: () => void;
  onAuthenticated?: () => void;
};

export function AuthModal({ onClose, onAuthenticated }: AuthModalProps) {
  const dialogRef = useDialog(true, onClose);

  return createPortal(
    <div className="modal-backdrop auth-backdrop" onClick={onClose}>
      <div
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        ref={dialogRef}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="icon-button modal-close"
          onClick={onClose}
          aria-label="Close account dialog"
        >
          <X size={19} />
        </button>

        <div className="auth-modal-aside">
          <Brand />
          <div>
            <p className="eyebrow">Your account</p>
            <h2 id="auth-modal-title">
              Keep your pieces,
              <br />
              orders and shops together.
            </h2>
          </div>
          <ul className="auth-benefits">
            <li>
              <Check size={14} />
              Track every order in one place
            </li>
            <li>
              <Check size={14} />
              Apply to open your own shop
            </li>
            <li>
              <Check size={14} />
              Keep your bag and wishlist on this device
            </li>
          </ul>
        </div>

        <div className="auth-modal-main">
          <AuthForm
            onSuccess={() => {
              onAuthenticated?.();
              onClose();
            }}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
