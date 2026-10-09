import { useEffect, useRef, useState, type ReactNode } from 'react';
import Icon from '../../ui/Icon/Icon';
import styles from './Modal.module.css';

import closeIcon from '../../../assets/icons/actions/close.svg';

interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  /** SVG sa tabi ng title, hal. para sa Manage Categories */
  icon?: string;
  onClose: () => void;
  children: ReactNode;
  /** Mga button sa ibaba (Cancel / Save) */
  footer?: ReactNode;
  width?: number;
}

const CLOSE_ANIMATION_MS = 200;

// Gumagamit ng native <dialog>: may focus trap, Esc para isara, at backdrop.
// May animation sa pagbukas at pagsara (X, Esc o pag-click sa labas).
function Modal({ open, title, description, icon, onClose, children, footer, width = 480 }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pointerDownOnBackdrop = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );

  const requestClose = () => {
    if (closing) return;
    setClosing(true);
    closeTimer.current = setTimeout(onClose, CLOSE_ANIMATION_MS);
  };

  return (
    <dialog
      ref={dialogRef}
      className={`${styles.dialog} ${closing ? styles.closing : ''}`}
      style={{ width: `min(${width}px, calc(100vw - 32px))` }}
      onCancel={(e) => {
        e.preventDefault();
        requestClose();
      }}
      // Isasara lang kapag nagsimula AT natapos ang click sa backdrop,
      // para hindi magsara kapag nag-drag mula sa loob ng form palabas
      onMouseDown={(e) => {
        pointerDownOnBackdrop.current = e.target === dialogRef.current && e.button === 0;
      }}
      onMouseUp={(e) => {
        const shouldClose = pointerDownOnBackdrop.current && e.target === dialogRef.current;
        pointerDownOnBackdrop.current = false;
        if (shouldClose) requestClose();
      }}
      aria-labelledby="modal-title"
    >
      <div className={styles.content}>
        <header className={styles.header}>
          <div className={styles.heading}>
            {icon && (
              <span className={styles.headerIcon}>
                <Icon src={icon} size={22} />
              </span>
            )}
            <div>
              <h2 id="modal-title" className={styles.title}>
                {title}
              </h2>
              {description && <p className={styles.description}>{description}</p>}
            </div>
          </div>
          <button type="button" className={styles.closeButton} onClick={requestClose} aria-label="Close">
            <Icon src={closeIcon} size={18} />
          </button>
        </header>

        <div className={styles.body}>{children}</div>

        {footer && <footer className={styles.footer}>{footer}</footer>}
      </div>
    </dialog>
  );
}

export default Modal;
