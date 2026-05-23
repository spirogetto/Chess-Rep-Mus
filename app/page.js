'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getOpenings, createOpening, deleteOpening, countMoves, maxDepth } from '../lib/store';
import { useAuth } from '../components/AuthProvider';
import CreateModal from '../components/CreateModal';
import LoginScreen from '../components/LoginScreen';
import Footer from '../components/Footer';

export default function Home() {
  const { user, signOut } = useAuth();
  const [openings, setOpenings] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load openings whenever the user changes
  useEffect(() => {
    if (user === undefined) return; // still determining auth state
    if (!user) { setLoading(false); return; }

    setLoading(true);
    setError('');
    getOpenings(user.uid)
      .then((data) => setOpenings(data))
      .catch((err) => {
        console.error('Firestore error:', err);
        setError(`Error: ${err?.message || err?.code || 'Unknown error'}`);
      })
      .finally(() => setLoading(false));
  }, [user]);

  // Show login screen if not authenticated
  if (user === undefined) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>Loading…</span>
      </div>
    );
  }

  if (!user) return <LoginScreen />;

  async function handleCreate(data) {
    try {
      const opening = await createOpening(user.uid, data);
      setOpenings((prev) => [opening, ...prev]);
      setShowModal(false);
    } catch {
      setError('Failed to create opening. Please try again.');
    }
  }

  async function handleDelete(id, e) {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('Delete this opening and all its variations?')) return;
    try {
      await deleteOpening(id);
      setOpenings((prev) => prev.filter((o) => o.id !== id));
    } catch {
      setError('Failed to delete opening.');
    }
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  }

  return (
    <div className="page">
      {/* Header */}
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-chess">♟</span>
            <div>
              <div className="logo-title">Opening Lab</div>
              <div className="logo-sub">Chess Repertoire Builder</div>
            </div>
          </div>

          <div className="header-right">
            {/* Library link */}
            <Link href="/library" className="nav-link-library">Library</Link>

            {/* User info + sign out */}
            <div className="user-info">
              {user.photoURL && (
                <img src={user.photoURL} alt="" className="avatar" referrerPolicy="no-referrer" />
              )}
              <span className="user-name">{user.displayName || user.email}</span>
              <button className="btn-signout" onClick={signOut}>Sign out</button>
            </div>
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              + New Opening
            </button>
          </div>
        </div>
      </header>

      <div className="gold-line" />

      <main className="main">
        {error && <div className="error-banner">{error}</div>}

        {loading ? (
          <div className="loading-state">
            <span className="loading-piece">♟</span>
            <p>Loading your repertoire…</p>
          </div>
        ) : openings.length === 0 ? (
          <div className="empty">
            <div className="empty-board">
              <span>♜</span><span>♛</span><span>♚</span><span>♜</span>
              <span>♙</span><span>♙</span><span>♙</span><span>♙</span>
            </div>
            <h2>Your repertoire awaits</h2>
            <p>Build your first opening to start mastering your lines.</p>
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              Create Your First Opening
            </button>
          </div>
        ) : (
          <>
            <div className="section-head">
              <h2>Repertoire</h2>
              <span className="count-badge">
                {openings.length} {openings.length === 1 ? 'opening' : 'openings'}
              </span>
            </div>

            <div className="grid">
              {openings.map((op) => {
                const moves = countMoves(op.root);
                const depth = maxDepth(op.root);
                return (
                  <Link key={op.id} href={`/opening/${op.id}`} className="card">
                    <div className="card-top">
                      <div className={`card-badge ${op.color === 'white' ? 'badge-white' : 'badge-black'}`}>
                        {op.color === 'white' ? '♔ White' : '♚ Black'}
                      </div>
                      <button
                        className="delete-btn"
                        onClick={(e) => handleDelete(op.id, e)}
                        aria-label="Delete opening"
                        title="Delete"
                      >✕</button>
                    </div>

                    <h3 className="card-name">{op.name}</h3>
                    {op.description && <p className="card-desc">{op.description}</p>}

                    <div className="card-stats">
                      <span className="stat">
                        <span className="stat-val">{moves}</span>
                        <span className="stat-lbl">moves</span>
                      </span>
                      <span className="stat-sep">·</span>
                      <span className="stat">
                        <span className="stat-val">{depth}</span>
                        <span className="stat-lbl">depth</span>
                      </span>
                      <span className="stat-sep">·</span>
                      <span className="card-date">{formatDate(op.createdAt)}</span>
                    </div>

                    <div className="card-arrow">→</div>
                  </Link>
                );
              })}

              <button className="card card-new" onClick={() => setShowModal(true)}>
                <span className="new-icon">+</span>
                <span className="new-label">New Opening</span>
              </button>
            </div>
          </>
        )}
      </main>

      {showModal && (
        <CreateModal onClose={() => setShowModal(false)} onCreate={handleCreate} />
      )}

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

        .header-right { display: flex; align-items: center; gap: 14px; }

        .nav-link-library {
          font-size: 13px;
          color: var(--text-secondary);
          text-decoration: none;
          padding: 5px 10px;
          border-radius: 3px;
          transition: color 0.2s;
        }

        .nav-link-library:hover { color: var(--accent-light); }

        .user-info { display: flex; align-items: center; gap: 8px; }

        .avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 1px solid var(--border-strong);
        }

        .user-name {
          font-size: 13px;
          color: var(--text-secondary);
          max-width: 160px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .btn-signout {
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text-muted);
          padding: 5px 12px;
          font-family: var(--font-body);
          font-size: 12px;
          cursor: pointer;
          border-radius: 3px;
          transition: all 0.2s;
        }

        .btn-signout:hover { color: #e07070; border-color: rgba(224,112,112,0.4); }

        .gold-line {
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--accent), transparent);
          opacity: 0.4;
        }

        .main { max-width: 1100px; margin: 0 auto; padding: 48px 24px; }

        .error-banner {
          background: rgba(224,112,112,0.1);
          border: 1px solid rgba(224,112,112,0.25);
          border-radius: 4px;
          padding: 12px 16px;
          color: #e07070;
          font-size: 13px;
          margin-bottom: 24px;
        }

        .loading-state {
          text-align: center;
          padding: 80px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .loading-piece {
          font-size: 48px;
          color: var(--accent-dim);
          display: block;
          animation: float 1.5s ease-in-out infinite;
        }

        .loading-state p { font-size: 14px; color: var(--text-muted); }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        .empty { text-align: center; padding: 80px 20px; }

        .empty-board {
          display: flex;
          justify-content: center;
          gap: 4px;
          margin-bottom: 28px;
        }

        .empty-board span {
          font-size: 36px;
          color: var(--accent-dim);
          animation: float 3s ease-in-out infinite;
        }

        .empty-board span:nth-child(1) { animation-delay: 0s; }
        .empty-board span:nth-child(2) { animation-delay: 0.2s; }
        .empty-board span:nth-child(3) { animation-delay: 0.4s; }
        .empty-board span:nth-child(4) { animation-delay: 0.6s; }
        .empty-board span:nth-child(5) { animation-delay: 0.1s; }
        .empty-board span:nth-child(6) { animation-delay: 0.3s; }
        .empty-board span:nth-child(7) { animation-delay: 0.5s; }
        .empty-board span:nth-child(8) { animation-delay: 0.7s; }

        .empty h2 {
          font-family: var(--font-display);
          font-size: 28px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 10px;
          letter-spacing: -0.02em;
        }

        .empty p { color: var(--text-secondary); margin-bottom: 28px; font-size: 15px; }

        .section-head {
          display: flex;
          align-items: baseline;
          gap: 14px;
          margin-bottom: 28px;
        }

        .section-head h2 {
          font-family: var(--font-display);
          font-size: 26px;
          font-weight: 600;
          letter-spacing: -0.02em;
        }

        .count-badge { font-size: 12px; color: var(--text-muted); letter-spacing: 0.04em; }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }

        .card {
          display: block;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 20px 22px;
          text-decoration: none;
          color: inherit;
          transition: all 0.22s ease;
          position: relative;
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

        .delete-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          font-size: 11px;
          padding: 4px;
          transition: color 0.2s;
          opacity: 0;
        }

        .card:hover .delete-btn { opacity: 1; }
        .delete-btn:hover { color: #e07070; }

        .card-name {
          font-family: var(--font-display);
          font-size: 17px;
          font-weight: 600;
          letter-spacing: -0.01em;
          color: var(--text-primary);
          margin-bottom: 7px;
          line-height: 1.3;
        }

        .card-desc {
          font-size: 13px;
          color: var(--text-secondary);
          margin-bottom: 16px;
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .card-stats {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: var(--text-muted);
          margin-bottom: 12px;
        }

        .stat { display: flex; align-items: baseline; gap: 3px; }
        .stat-val { font-weight: 600; color: var(--text-secondary); }
        .stat-sep { color: var(--text-muted); }
        .card-date { font-size: 11px; }

        .card-arrow {
          color: var(--accent);
          font-size: 16px;
          position: absolute;
          right: 22px;
          bottom: 20px;
          opacity: 0;
          transform: translateX(-4px);
          transition: all 0.2s;
        }

        .card:hover .card-arrow { opacity: 1; transform: translateX(0); }

        .card-new {
          border-style: dashed;
          border-color: var(--text-muted);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 140px;
          background: transparent;
          font-family: inherit;
        }

        .card-new:hover { border-color: var(--accent); background: rgba(201,168,76,0.04); }

        .new-icon { font-size: 28px; color: var(--text-muted); line-height: 1; }
        .card-new:hover .new-icon { color: var(--accent); }

        .new-label { font-size: 13px; color: var(--text-muted); letter-spacing: 0.04em; }
        .card-new:hover .new-label { color: var(--accent); }

        /* ── Responsive / Mobile ── */
        @media (max-width: 640px) {
          .header { padding: 0 14px; }
          .header-inner { height: 56px; }
          .logo-sub { display: none; }
          .user-name { display: none; }
          .nav-link-library { padding: 5px 6px; }

          .main { padding: 28px 14px; }

          .grid { grid-template-columns: 1fr; }

          .section-head h2 { font-size: 22px; }
        }
      `}</style>
    </div>
  );
}
