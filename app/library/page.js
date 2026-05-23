'use client';

import Link from 'next/link';
import { useAuth } from '../../components/AuthProvider';
import Footer from '../../components/Footer';
import { LIBRARY_DEFINITIONS } from '../../lib/library';

export default function LibraryPage() {
  const { user } = useAuth();

  return (
    <div className="page">
      {/* Header */}
      <header className="header">
        <div className="header-inner">
          <Link href="/" className="logo" style={{ textDecoration: 'none', color: 'inherit' }}>
            <span className="logo-chess">♟</span>
            <div>
              <div className="logo-title">Opening Lab</div>
              <div className="logo-sub">Chess Repertoire Builder</div>
            </div>
          </Link>

          <div className="header-right">
            <Link href="/library" className="nav-link nav-link-active">Library</Link>
            {user ? (
              <Link href="/" className="nav-link">My Openings</Link>
            ) : (
              <Link href="/" className="btn-primary-sm">Sign in to build your own</Link>
            )}
          </div>
        </div>
      </header>

      <div className="gold-line" />

      <main className="main">
        <div className="page-head">
          <div>
            <h1 className="page-title">Opening Library</h1>
            <p className="page-sub">
              10 classic openings with named variations — free for everyone, no account required.
            </p>
          </div>
          {!user && (
            <Link href="/" className="banner-link">
              <span className="banner-icon">♛</span>
              <span>Sign in to build your own repertoire →</span>
            </Link>
          )}
        </div>

        <div className="grid">
          {LIBRARY_DEFINITIONS.map((def) => (
            <Link key={def.id} href={`/library/${def.id}`} className="card">
              <div className="card-top">
                <div className={`card-badge ${def.color === 'white' ? 'badge-white' : 'badge-black'}`}>
                  {def.color === 'white' ? '♔ White' : '♚ Black'}
                </div>
                {def.eco && <span className="eco-badge">{def.eco}</span>}
              </div>

              <h3 className="card-name">{def.name}</h3>
              {def.subtitle && <div className="card-subtitle">{def.subtitle}</div>}
              {def.description && <p className="card-desc">{def.description}</p>}

              <div className="card-footer">
                <span className="variant-count">
                  {def.variants.length} {def.variants.length === 1 ? 'variation' : 'variations'}
                </span>
                <span className="card-arrow">→</span>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <Footer />

      <style jsx>{`
        .page { min-height: 100vh; background: var(--bg-primary); }

        .header { padding: 0 24px; border-bottom: 1px solid var(--border); }

        .header-inner {
          max-width: 1100px;
          margin: 0 auto;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .logo { display: flex; align-items: center; gap: 12px; }

        .logo-chess {
          font-size: 32px;
          line-height: 1;
          filter: drop-shadow(0 0 10px rgba(201,168,76,0.5));
        }

        .logo-title {
          font-family: var(--font-display);
          font-size: 18px;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: var(--accent-light);
        }

        .logo-sub { font-size: 11px; color: var(--text-muted); letter-spacing: 0.05em; }

        .header-right { display: flex; align-items: center; gap: 12px; }

        .nav-link {
          font-size: 13px;
          color: var(--text-secondary);
          text-decoration: none;
          padding: 5px 10px;
          border-radius: 3px;
          transition: color 0.2s;
        }

        .nav-link:hover { color: var(--text-primary); }
        .nav-link-active { color: var(--accent-light) !important; }

        .btn-primary-sm {
          background: var(--accent);
          color: #1a1408;
          border: none;
          padding: 7px 16px;
          font-family: var(--font-body);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.04em;
          cursor: pointer;
          border-radius: 3px;
          text-decoration: none;
          transition: background 0.2s;
        }

        .btn-primary-sm:hover { background: var(--accent-light); }

        .gold-line {
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--accent), transparent);
          opacity: 0.4;
        }

        .main { max-width: 1100px; margin: 0 auto; padding: 48px 24px; }

        .page-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 36px;
          flex-wrap: wrap;
        }

        .page-title {
          font-family: var(--font-display);
          font-size: 30px;
          font-weight: 700;
          letter-spacing: -0.03em;
          color: var(--text-primary);
          margin-bottom: 8px;
        }

        .page-sub { font-size: 14px; color: var(--text-secondary); }

        .banner-link {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(201,168,76,0.08);
          border: 1px solid rgba(201,168,76,0.2);
          border-radius: 6px;
          padding: 10px 18px;
          font-size: 13px;
          color: var(--accent-light);
          text-decoration: none;
          white-space: nowrap;
          transition: all 0.2s;
          flex-shrink: 0;
          align-self: center;
        }

        .banner-link:hover {
          background: rgba(201,168,76,0.14);
          border-color: rgba(201,168,76,0.35);
        }

        .banner-icon { font-size: 16px; }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
          gap: 16px;
        }

        .card {
          display: flex;
          flex-direction: column;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 20px 22px;
          text-decoration: none;
          color: inherit;
          transition: all 0.22s ease;
          cursor: pointer;
        }

        .card:hover {
          border-color: var(--border-strong);
          background: var(--bg-card-hover);
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        }

        .card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .card-badge {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 3px 9px;
          border-radius: 2px;
        }

        .badge-white {
          background: rgba(240,217,181,0.12);
          color: #e8d4b0;
          border: 1px solid rgba(240,217,181,0.2);
        }

        .badge-black {
          background: rgba(100,75,45,0.25);
          color: #c8a882;
          border: 1px solid rgba(150,110,70,0.25);
        }

        .eco-badge {
          font-size: 10px;
          font-family: monospace;
          color: var(--text-muted);
          background: rgba(255,255,255,0.04);
          border: 1px solid var(--border);
          padding: 2px 7px;
          border-radius: 2px;
          letter-spacing: 0.05em;
        }

        .card-name {
          font-family: var(--font-display);
          font-size: 17px;
          font-weight: 600;
          letter-spacing: -0.01em;
          color: var(--text-primary);
          margin-bottom: 3px;
          line-height: 1.3;
        }

        .card-subtitle {
          font-size: 12px;
          color: var(--text-muted);
          margin-bottom: 10px;
          font-style: italic;
        }

        .card-desc {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.55;
          flex: 1;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
          margin-bottom: 16px;
        }

        .card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: auto;
        }

        .variant-count {
          font-size: 12px;
          color: var(--text-muted);
        }

        .card-arrow {
          color: var(--accent);
          font-size: 16px;
          opacity: 0;
          transform: translateX(-4px);
          transition: all 0.2s;
        }

        .card:hover .card-arrow { opacity: 1; transform: translateX(0); }

        /* ── Responsive / Mobile ── */
        @media (max-width: 640px) {
          .header { padding: 0 14px; }
          .logo-sub { display: none; }
          .btn-primary-sm { font-size: 11px; padding: 6px 10px; }

          .main { padding: 28px 14px; }

          .page-head { flex-direction: column; gap: 14px; }
          .page-title { font-size: 24px; }
          .banner-link { width: 100%; justify-content: center; }

          .grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
