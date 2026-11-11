import type { ReactNode } from 'react';
import { ModalDialog } from '../platform/modal-dialog';
import styles from './payment-planner.module.css';

interface IPlannerDialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  viewportHeight?: boolean;
}

export function PlannerDialog({ children, ...props }: IPlannerDialogProps) {
  return (
    <ModalDialog {...props}>
      <div
        className={`${styles['dash-payment-planner']} ${styles['dash-payment-planner__dialog-content']}`}
      >
        {children}
      </div>
    </ModalDialog>
  );
}
