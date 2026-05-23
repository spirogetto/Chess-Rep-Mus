'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../components/AuthProvider';
import { getPublicOpenings, countMoves, getAllVariants } from '../../lib/store';
import Footer from '../../components/Footer';

export default function ExplorePage() {
  const { user } = useAuth();
  const [openings, setOpenings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getPublicOpenings()
      .then(setOpenings)
      .catch((err) => setError(err?.message || 'Failed to load public openings.'))
      .finally(() => setLoading(false));
  }, []);

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
            <Link href="/explore" className="nav-link nav-link-active">Explore</Link>
            {user ? (
              <Link href="/" className="nav-link">My Openings</Link>
            ) : (
              <Link href="/" className="btn-signin">Sign in to build your own</Link>
            )}
          </div>
        </div>
      </header>

      <div className="gold-line" />

      <main className="main">
        <div className="page-head">
          <div>
            <h1 className="page-title">Explore Public Openings</h1>
            <p className="page-sub">
              Openings shared by the community — practice any of them for free.
            </p>
          </div>
          {!user && (
            <Link href="/" className="banner-link">
              <span className="banner-icon">♛</span>
              <span>Sign in to share your own →</span>
            </Link>
          )}
        </div>

        {error && <div className="error-banner">{error}</div>}

        {loading ? (
          <div className="loading-state">
            <span className="loading-piece">♟</span>
            <p>Loading…</p>
          </div>
        ) : openings.length === 0 ? (
          <div className="empty">
            <p>No public openings yet. Be the first to share one!</p>
            {!user && <Link href="/" className="btn-signin" style={{ marginTop: 16, display: 'inline-block' }}>Sign in →</Link>}
          </div>
        ) : (
          <div className="grid">
            {openings.map((op) => {
              const moves = countMoves(op.root);
              const variants = getAllVariants(op.root).filter((p) => p.length > 1);
              return (
                <Link key={op.id} href={`/explore/${op.id}`} className="card">
                  <div className="card-top">
                    <div className={`card-badge ${op.color === 'white' ? 'badge-white' : 'badge-black'}`}>
                      {op.color === 'white' ? '♔ White' : '♚ Black'}
                    </div>
                    <span className="public-tag">🌐 Public</span>
                  </div>

                  <h3 className="card-name">{op.name}</h3>
                  {op.description && <p className="card-desc">{op.description}</p>}

                  <div className="card-meta">
                    {op.createdBy?.photoURL && (
                      <img src={op.createdBy.photoURL} alt="" className="creator-avatar" referrerPolicy="no-referrer" />
                    )}
                    <span className="creator-name">{op.createdBy?.displayName || 'Anonymous'}</span>
                  </div>

                  <div className="card-footer">
                    <span className="card-stats">
                      {moves} moves · {variants.length} {variants.length === 1 ? 'variant' : 'variants'}
                    </span>
                    <span className="card-arrow">→</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <Footer />

      <style jsx>{`
        .page { min-height: 100vh; background: var(--bg-primary); }

        .header { padding: 0 24px; border-bottom: 1px solid var(--border); }

        .header-inner {
          max-width: 1100px; margin: 0 auto; height: 64px;
          display: flex; align-items: center; justify-content: space-between; gap: 16px;
        }

        .logo { display: flex; align-items: center; gap: 12px; }

        .logo-chess {
          font-size: 32px; line-height: 1;
          filter: drop-shadow(0 0 10px rgba(201,168,76,0.5));
        }

        .logo-title {
          font-family: var(--font-display); font-size: 18px;
          font-weight: 700; letter-spacing: -0.02em; color: var(--accent-light);
        }

        .logo-sub { font-size: 11px; color: var(--text-muted); letter-spacing: 0.05em; }

        .header-right { display: flex; align-items: center; gap: 12px; }

        .nav-link {
          font-size: 13px; color: var(--text-secondary); text-decoration: none;
          padding: 5px 10px; border-radius: 3px; transition: color 0.2s;
        }
        .nav-link:hover { color: var(--text-primary); }
        .nav-link-active { color: var(--accent-light) !important; }

        .btn-signin {
          background: var(--accent); color: #1a1408; border: none;
          padding: 7px 16px; font-family: var(--font-body); font-size: 12px;
          font-weight: 700; letter-spacing: 0.04em; cursor: pointer;
          border-radius: 3px; text-decoration: none; transition: background 0.2s;
        }
        .btn-signin:hover { background: var(--accent-light); }

        .gold-line {
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--accent), transparent);
          opacity: 0.4;
        }

        .main { max-width: 1100px; margin: 0 auto; padding: 48px 24px; }

        .page-head {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 24px; margin-bottom: 36px; flex-wrap: wrap;
        }

        .page-title {
          font-family: var(--font-display); font-size: 30px; font-weight: 700;
          letter-spacing: -0.03em; color: var(--text-primary); margin-bottom: 8px;
        }

        .page-sub { font-size: 14px; color: var(--text-secondary); }

        .banner-link {
          display: flex; align-items: center; gap: 8px;
          background: rgba(201,168,76,0.08); border: 1px solid rgba(201,168,76,0.2);
          border-radius: 6px; padding: 10px 18px; font-size: 13px;
          color: var(--accent-light); text-decoration: none; white-space: nowrap;
          transition: all 0.2s; flex-shrink: 0; align-self: center;
        }
        .banner-link:hover { background: rgba(201,168,76,0.14); border-color: rgba(201,168,76,0.35); }
        .banner-icon { font-size: 16px; }

        .error-banner {
          background: rgba(224,112,112,0.1); border: 1px solid rgba(224,112,112,0.25);
          border-radius: 4px; padding: 12px 16px; color: #e07070;
          font-size: 13px; margin-bottom: 24px;
        }

        .loading-state {
          text-align: center; padding: 80px 20px;
          display: flex; flex-direction: column; align-items: center; gap: 16px;
        }
        .loading-piece { font-size: 48px; color: var(--accent-dim); display: block; }
        .loading-state p { font-size: 14px; color: var(--text-muted); }

        .empty { text-align: center; padding: 60px 20px; color: var(--text-secondary); font-size: 15px; }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
          gap: 16px;
        }

        .card {
          display: flex; flex-direction: column;
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: 6px; padding: 20px 22px;
          text-decoration: none; color: inherit;
          transition: all 0.22s ease; cursor: pointer;
        }
        .card:hover {
          border-color: var(--border-strong); background: var(--bg-card-hover);
          transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        }

        .card-top {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 12px;
        }

        .card-badge {
          font-size: 10px; font-weight: 700; letter-spacing: 0.08em;
          text-transform: uppercase; padding: 3px 9px; border-radius: 2px;
        }
        .badge-white { background: rgba(240,217,181,0.12); color: #e8d4b0; border: 1px solid rgba(240,217,181,0.2); }
        .badge-black { background: rgba(100,75,45,0.25); color: #c8a882; border: 1px solid rgba(150,110,70,0.25); }

        .public-tag { font-size: 10px; color: var(--text-muted); }

        .card-name {
          font-family: var(--font-display); font-size: 17px; font-weight: 600;
          letter-spacing: -0.01em; color: var(--text-primary);
          margin-bottom: 6px; line-height: 1.3;
        }

        .card-desc {
          font-size: 13px; color: var(--text-secondary); line-height: 1.55; flex: 1;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
          overflow: hidden; margin-bottom: 12px;
        }

        .card-meta {
          display: flex; align-items: center; gap: 7px;
          margin-bottom: 12px;
        }
        .creator-avatar { width: 20px; height: 20px; border-radius: 50%; border: 1px solid var(--border); }
        .creator-name { font-size: 12px; color: var(--text-muted); }

        .card-footer {
          display: flex; align-items: center; justify-content: space-between;
          margin-top: auto;
        }
        .card-stats { font-size: 12px; color: var(--text-muted); }

        .card-arrow {
          color: var(--accent); font-size: 16px;
          opacity: 0; transform: translateX(-4px); transition: all 0.2s;
        }
        .card:hover .card-arrow { opacity: 1; transform: translateX(0); }

        @media (max-width: 640px) {
          .header { padding: 0 14px; }
          .logo-sub { display: none; }
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
