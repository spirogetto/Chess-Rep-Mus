'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getOpenings, createOpening, deleteOpening, patchOpening, countMoves, maxDepth, getAllVariants } from '../lib/store';
import { useAuth } from '../components/AuthProvider';
import CreateModal from '../components/CreateModal';
import LoginScreen from '../components/LoginScreen';
import Footer from '../components/Footer';

// ─── Random Practice Modal ────────────────────────────────────────────────
function RandomPracticeModal({ openings, onClose, onGo }) {
  const [pool, setPool] = useState('all');
  const favCount = openings.filter((o) => o.isFavorite).length;

  return (
    <div className="rp-overlay" onClick={onClose}>
      <div className="rp-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="rp-title">⚡ Random Practice</h2>
        <p className="rp-sub">We'll pick a random opening and variant from your chosen pool.</p>

        <div className="rp-options">
          <label className={`rp-opt ${pool === 'all' ? 'rp-opt-active' : ''}`}>
            <input type="radio" name="pool" value="all" checked={pool === 'all'} onChange={() => setPool('all')} />
            <span className="rp-opt-label">All openings</span>
            <span className="rp-opt-count">{openings.length}</span>
          </label>
          <label className={`rp-opt ${pool === 'favorites' ? 'rp-opt-active' : ''}`}>
            <input type="radio" name="pool" value="favorites" checked={pool === 'favorites'} onChange={() => setPool('favorites')} />
            <span className="rp-opt-label">★ Favorites only</span>
            <span className="rp-opt-count">{favCount}</span>
          </label>
        </div>

        <div className="rp-actions">
          <button className="rp-btn-go" onClick={() => onGo(pool)}>⚡ Go!</button>
          <button className="rp-btn-cancel" onClick={onClose}>Cancel</button>
        </div>
      </div>

      <style jsx>{`
        .rp-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.65);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000; padding: 16px;
        }
        .rp-modal {
          background: var(--bg-card);
          border: 1px solid var(--border-strong);
          border-radius: 8px;
          padding: 28px 28px 24px;
          width: 100%; max-width: 360px;
          box-shadow: 0 24px 64px rgba(0,0,0,0.7);
        }
        .rp-title {
          font-family: var(--font-display);
          font-size: 22px; font-weight: 700;
          color: var(--accent-light); margin-bottom: 8px;
        }
        .rp-sub { font-size: 13px; color: var(--text-secondary); margin-bottom: 22px; }
        .rp-options { display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px; }
        .rp-opt {
          display: flex; align-items: center; gap: 10px;
          border: 1px solid var(--border);
          border-radius: 5px; padding: 12px 14px;
          cursor: pointer; transition: all 0.18s;
        }
        .rp-opt:hover { border-color: var(--border-strong); }
        .rp-opt-active {
          border-color: rgba(201,168,76,0.4);
          background: rgba(201,168,76,0.06);
        }
        .rp-opt input { accent-color: var(--accent); }
        .rp-opt-label { font-size: 14px; color: var(--text-primary); flex: 1; }
        .rp-opt-count {
          font-size: 12px; color: var(--text-muted);
          background: rgba(255,255,255,0.06);
          padding: 2px 8px; border-radius: 10px;
        }
        .rp-actions { display: flex; gap: 10px; }
        .rp-btn-go {
          flex: 1;
          background: var(--accent); color: #1a1408;
          border: none; border-radius: 4px;
          padding: 10px 0; font-family: var(--font-body);
          font-size: 14px; font-weight: 700;
          cursor: pointer; transition: background 0.2s;
        }
        .rp-btn-go:hover { background: var(--accent-light); }
        .rp-btn-cancel {
          background: transparent; border: 1px solid var(--border);
          color: var(--text-muted); border-radius: 4px;
          padding: 10px 18px; font-family: var(--font-body);
          font-size: 13px; cursor: pointer; transition: all 0.2s;
        }
        .rp-btn-cancel:hover { border-color: var(--border-strong); color: var(--text-secondary); }
      `}</style>
    </div>
  );
}

export default function Home() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [openings, setOpenings] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showRandomModal, setShowRandomModal] = useState(false);
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
      const opening = await createOpening(user, data);
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

  async function handleToggleFavorite(op, e) {
    e.preventDefault();
    e.stopPropagation();
    const next = !op.isFavorite;
    setOpenings((prev) => prev.map((o) => o.id === op.id ? { ...o, isFavorite: next } : o));
    try {
      await patchOpening(op.id, { isFavorite: next });
    } catch {
      setOpenings((prev) => prev.map((o) => o.id === op.id ? { ...o, isFavorite: op.isFavorite } : o));
    }
  }

  function handleRandomPractice(pool) {
    const source = pool === 'favorites' ? openings.filter((o) => o.isFavorite) : openings;
    if (source.length === 0) {
      setError(pool === 'favorites' ? 'No favorites yet — star some openings first.' : 'No openings yet.');
      setShowRandomModal(false);
      return;
    }
    const opening = source[Math.floor(Math.random() * source.length)];
    const variants = getAllVariants(opening.root).filter((p) => p.length > 1);
    if (variants.length === 0) {
      setError(`"${opening.name}" has no moves yet.`);
      setShowRandomModal(false);
      return;
    }
    const variant = variants[Math.floor(Math.random() * variants.length)];
    const pathIds = variant.map((n) => n.id).join(',');
    setShowRandomModal(false);
    router.push(`/opening/${opening.id}/practice?path=${pathIds}`);
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
            <Link href="/explore" className="nav-link-explore">Explore</Link>
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
              <div className="section-head-left">
                <h2>Repertoire</h2>
                <span className="count-badge">
                  {openings.length} {openings.length === 1 ? 'opening' : 'openings'}
                </span>
              </div>
              <button className="btn-random" onClick={() => setShowRandomModal(true)} title="Practice a random opening">
                ⚡ Random Practice
              </button>
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
                      <div className="card-actions">
                        {op.isPublic && <span className="public-dot" title="Public opening">🌐</span>}
                        <button
                          className={`star-btn ${op.isFavorite ? 'starred' : ''}`}
                          onClick={(e) => handleToggleFavorite(op, e)}
                          aria-label={op.isFavorite ? 'Unfavorite' : 'Favorite'}
                          title={op.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                        >★</button>
                        <button
                          className="delete-btn"
                          onClick={(e) => handleDelete(op.id, e)}
                          aria-label="Delete opening"
                          title="Delete"
                        >✕</button>
                      </div>
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

      {showRandomModal && (
        <RandomPracticeModal
          openings={openings}
          onClose={() => setShowRandomModal(false)}
          onGo={handleRandomPractice}
        />
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

        .nav-link-explore {
          font-size: 13px;
          color: var(--text-secondary);
          text-decoration: none;
          padding: 5px 10px;
          border-radius: 3px;
          transition: color 0.2s;
        }
        .nav-link-explore:hover { color: var(--accent-light); }

        .header-right { display: flex; align-items: center; gap: 14px; }

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
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 28px;
          flex-wrap: wrap;
        }

        .section-head-left {
          display: flex;
          align-items: baseline;
          gap: 14px;
        }

        .btn-random {
          background: rgba(201,168,76,0.1);
          border: 1px solid rgba(201,168,76,0.25);
          color: var(--accent-light);
          padding: 7px 16px;
          font-family: var(--font-body);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          border-radius: 4px;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .btn-random:hover {
          background: rgba(201,168,76,0.18);
          border-color: rgba(201,168,76,0.45);
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

        .card-actions { display: flex; align-items: center; gap: 4px; }

        .public-dot {
          font-size: 11px;
          opacity: 0.5;
          cursor: default;
        }

        .star-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          font-size: 14px;
          padding: 2px 4px;
          transition: all 0.2s;
          opacity: 0;
          line-height: 1;
        }

        .star-btn.starred {
          color: var(--accent);
          opacity: 1;
        }

        .card:hover .star-btn { opacity: 1; }
        .star-btn:hover { color: var(--accent-light); }

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
.main { padding: 28px 14px; }

          .grid { grid-template-columns: 1fr; }

          .section-head h2 { font-size: 22px; }
        }
      `}</style>
    </div>
  );
}
