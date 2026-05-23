'use client';

const PATREON_URL = 'https://www.patreon.com/c/Spirogetto';
const APP_VERSION = 'v1.0.0';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        {/* Left: built by */}
        <div className="footer-left">
          <span className="piece">♟</span>
          <span className="built-by">
            Built by <a href="https://www.patreon.com/c/Spirogetto" target="_blank" rel="noopener noreferrer" className="author-link">Mushfik Us Salehin</a>
          </span>
          <span className="sep">·</span>
          <span className="version">{APP_VERSION}</span>
        </div>

        {/* Right: Patreon */}
        <a
          href={PATREON_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="patreon-btn"
        >
          <PatreonIcon />
          Support on Patreon
        </a>
      </div>

      <style jsx>{`
        .footer {
          border-top: 1px solid var(--border);
          background: var(--bg-secondary);
          padding: 0 24px;
        }

        .footer-inner {
          max-width: 1100px;
          margin: 0 auto;
          height: 52px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .footer-left {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: var(--text-muted);
        }

        .piece {
          font-size: 16px;
          color: var(--accent-dim);
        }

        .built-by { color: var(--text-muted); }

        .author-link {
          color: var(--text-secondary);
          text-decoration: none;
          font-weight: 500;
          transition: color 0.2s;
        }

        .author-link:hover { color: var(--accent-light); }

        .sep { color: var(--text-muted); opacity: 0.4; }

        .version {
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--text-muted);
          background: rgba(255,255,255,0.04);
          border: 1px solid var(--border);
          padding: 2px 7px;
          border-radius: 10px;
          letter-spacing: 0.04em;
        }

        /* Patreon button */
        .patreon-btn {
          display: flex;
          align-items: center;
          gap: 7px;
          background: #FF424D;
          color: #fff;
          text-decoration: none;
          padding: 7px 16px;
          border-radius: 4px;
          font-family: var(--font-body);
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.02em;
          transition: all 0.2s ease;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .patreon-btn:hover {
          background: #e03040;
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(255, 66, 77, 0.35);
        }
      `}</style>
    </footer>
  );
}

function PatreonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M14.82 2.41C11.53 2.41 8.85 5.1 8.85 8.39c0 3.28 2.68 5.95 5.97 5.95 3.28 0 5.95-2.67 5.95-5.95 0-3.29-2.67-5.98-5.95-5.98zM2 21.6h3.5V2.41H2V21.6z"/>
    </svg>
  );
}
