/**
 * Header Component - App header with logo and controls
 */

import './Header.css';

interface HeaderProps {
  onReset: () => void;
}

export function Header({ onReset }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-left">
        <div className="logo">
          <img src="./favicon/favicon-96x96.png" alt="CC1101 RegEdit" width="48" height="48" />
        </div>
        <div className="header-title">
          <h1>CC1101 Register Editor</h1>
        </div>
      </div>
      <div className="header-right">
        <button className="btn btn-secondary" onClick={onReset}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
            <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
          </svg>
          Reset
        </button>
      </div>
    </header>
  );
}
