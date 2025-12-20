/**
 * Toast Component
 */

import './Toast.css';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  visible: boolean;
}

export function Toast({ message, type, visible }: ToastProps) {
  return (
    <div className={`toast ${type} ${visible ? 'show' : ''}`}>
      <span>{message}</span>
    </div>
  );
}
