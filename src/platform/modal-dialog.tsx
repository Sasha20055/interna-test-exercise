import { useLayoutEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styles from './modal-dialog.module.css';

interface IModalDialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  drawer?: boolean;
  viewportHeight?: boolean;
}

export function ModalDialog({
  open,
  title,
  onClose,
  children,
  drawer = false,
  viewportHeight = false,
}: IModalDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const backdropPress = useRef(false);
  const closing = useRef(false);
  const titleId = useId();
  useLayoutEffect(() => {
    if (!open) return;
    const dialog = ref.current;
    const trigger = document.activeElement;
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    closing.current = false;
    dialog?.removeAttribute('data-closing');
    dialog?.showModal();
    return () => {
      closing.current = false;
      dialog?.close();
      dialog?.removeAttribute('data-closing');
      document.documentElement.style.overflow = previousOverflow;
      if (trigger instanceof HTMLElement && trigger.isConnected)
        trigger.focus();
    };
  }, [open]);
  const requestClose = () => {
    const dialog = ref.current;
    if (!dialog || closing.current) return;
    closing.current = true;
    dialog.dataset.closing = 'true';
    const animations = dialog.getAnimations?.() ?? [];
    const finish = () => {
      if (closing.current && dialog.isConnected && dialog.open) onClose();
    };
    if (animations.length === 0) {
      finish();
      return;
    }
    void Promise.allSettled(
      animations.map((animation) => animation.finished),
    ).then(finish);
  };
  const outside = (x: number, y: number) => {
    const bounds = ref.current?.getBoundingClientRect();
    return (
      bounds !== undefined &&
      (x < bounds.left ||
        x > bounds.right ||
        y < bounds.top ||
        y > bounds.bottom)
    );
  };
  return createPortal(
    <dialog
      ref={ref}
      className={`${styles.dialog} ${viewportHeight ? styles.viewportHeight : ''} ${drawer ? styles.drawer : ''}`}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return;
        const controls = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'button, input, select, textarea, a[href], summary, [tabindex="0"]',
          ),
        ).filter(
          (element) =>
            element.getClientRects().length > 0 &&
            !element.hasAttribute('disabled'),
        );
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        }
        if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      onPointerDown={(event) => {
        backdropPress.current =
          event.target === event.currentTarget &&
          outside(event.clientX, event.clientY);
      }}
      onClick={(event) => {
        if (backdropPress.current && outside(event.clientX, event.clientY))
          requestClose();
        backdropPress.current = false;
      }}
    >
      <header className={styles.header}>
        <h2 id={titleId}>{title}</h2>
        <button
          type="button"
          className={styles.close}
          aria-label="Закрыть"
          onClick={requestClose}
        >
          ×
        </button>
      </header>
      <div className={styles.body} role="region" aria-label="Содержимое окна">
        {open && children}
      </div>
    </dialog>,
    document.body,
  );
}
