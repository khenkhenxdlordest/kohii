import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../Icon/Icon';
import styles from './ActionButton.module.css';

export type ActionTone = 'default' | 'success' | 'danger';

interface ActionButtonProps {
  /** SVG mula sa assets/icons */
  icon: string;
  /** Label sa tooltip, hal. "Edit" */
  label: string;
  tone?: ActionTone;
  /** Tinatawag lang sa pangalawang pindot */
  onConfirm: () => void;
  iconSize?: number;
  disabled?: boolean;
}

type Placement = 'top' | 'bottom';
const GAP = 8;

/**
 * Icon button na may 2-click rule:
 * 1st click = lalabas ang tooltip na may label (hal. "Edit"), 2nd click = itutuloy ang aksyon.
 * Kakanselahin kapag nag-click sa labas, umalis ang focus, o pinindot ang Esc.
 *
 * Ang tooltip ay naka-portal (position: fixed), kaya hindi ito napuputol ng
 * table, scroll area o modal. Sa loob ng <dialog>, sa dialog mismo inilalagay
 * para manatili sa ibabaw (top layer).
 */
function ActionButton({ icon, label, tone = 'default', onConfirm, iconSize = 18, disabled = false }: ActionButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const [armed, setArmed] = useState(false);
  const [position, setPosition] = useState<{ left: number; top: number; placement: Placement } | null>(null);
  // Kung saan ilalagay ang tooltip: sa <dialog> kung nasa loob ng modal, kung hindi ay sa body
  const [portalTarget, setPortalTarget] = useState<Element | null>(null);

  const visible = armed && !disabled;

  // Kinukuwenta ang pwesto ng tooltip; sa ibaba kapag walang espasyo sa itaas
  useLayoutEffect(() => {
    if (!visible) return;
    const update = () => {
      const button = buttonRef.current;
      const tooltip = tooltipRef.current;
      if (!button || !tooltip) return;
      const rect = button.getBoundingClientRect();
      const height = tooltip.offsetHeight;
      const placement: Placement = rect.top - height - GAP < 8 ? 'bottom' : 'top';
      setPosition({
        left: rect.left + rect.width / 2,
        top: placement === 'top' ? rect.top - height - GAP : rect.bottom + GAP,
        placement,
      });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [visible, label]);

  // Pag-click sa labas o Esc: kakanselahin ang naka-arm
  useEffect(() => {
    if (!armed) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!buttonRef.current?.contains(event.target as Node)) setArmed(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setArmed(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [armed]);

  const handleClick = (button: HTMLElement) => {
    if (!armed) {
      setPortalTarget(button.closest('dialog') ?? document.body);
      setArmed(true);
      return;
    }
    setArmed(false);
    onConfirm();
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`${styles.button} ${styles[tone]} ${armed ? styles.armed : ''}`}
        onClick={(e) => handleClick(e.currentTarget)}
        onBlur={() => setArmed(false)}
        disabled={disabled}
        aria-label={armed ? `${label}, press again to confirm` : label}
      >
        <Icon src={icon} size={iconSize} />
      </button>

      {visible &&
        portalTarget &&
        createPortal(
          <span
            ref={tooltipRef}
            role="tooltip"
            className={`${styles.tooltip} ${styles[`tip_${tone}`]} ${position ? styles[position.placement] : styles.measuring}`}
            style={position ? { left: position.left, top: position.top } : undefined}
          >
            {label}
          </span>,
          portalTarget,
        )}
    </>
  );
}

export default ActionButton;
