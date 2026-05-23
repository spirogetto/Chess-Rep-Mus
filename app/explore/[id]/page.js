'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { getOpening, getAllVariants } from '../../../lib/store';
import Footer from '../../../components/Footer';

const Chessboard = dynamic(() => import('react-chessboard').then((m) => m.Chessboard), {
  ssr: false,
  loading: () => (
    <div style={{
      width: '100%', aspectRatio: '1', background: '#0f0f22',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#c9a84c', fontSize: 14, borderRadius: 4,
    }}>Loading board…</div>
  ),
});

function formatVariantMoves(path) {
  const moves = path.slice(1);
  if (moves.length === 0) return '(no moves)';
  const parts = [];
  for (let i = 0; i < moves.length; i++) {
    if (i % 2 === 0) parts.push(`${Math.floor(i / 2) + 1}.${moves[i].san}`);
    else parts.push(moves[i].san);
  }
  return parts.join(' ');
}

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export default function ExploreOpeningPage() {
  const params = useParams();
  const router = useRouter();
  const [opening, setOpening] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentFen, setCurrentFen] = useState(STARTING_FEN);
  const [currentPath, setCurrentPath] = useState([]);
  const [activeVariantIdx, setActiveVariantIdx] = useState(0);

  useEffect(() => {
    getOpening(params.id)
      .then((op) => {
        if (!op) { setError('Opening not found.'); return; }
        if (!op.isPublic) { setError('This opening is not public.'); return; }
        setOpening(op);
        // Load first variant by default
        const variants = getAllVariants(op.root).filter((p) => p.length > 1);
        if (variants.length > 0) {
          setCurrentPath(variants[0]);
          setCurrentFen(variants[0][0].fen || STARTING_FEN);
        }
      })
      .catch(() => setError('Failed to load opening.'))
      .finally(() => setLoading(false));
  }, [params.id]);

  const allVariants = opening ? getAllVariants(opening.root).filter((p) => p.length > 1) : [];

  function selectVariant(idx) {
    setActiveVariantIdx(idx);
    const path = allVariants[idx];
    setCurrentPath(path);
    setCurrentFen(path[0].fen || STARTING_FEN);
  }

  function navigateToNode(node) {
    setCurrentFen(node.fen || STARTING_FEN);
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>Loading…</span>
    </div>
  );

  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 16 }}>
      <span style={{ color: '#e07070', fontSize: 16 }}>{error}</span>
      <Link href="/explore" style={{ color: 'var(--accent)', fontSize: 13 }}>← Back to Explore</Link>
    </div>
  );

  const boardColor = opening.color === 'black' ? 'black' : 'white';

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
          <Link href="/explore" className="back-btn">← Explore</Link>
        </div>
      </header>

      <div className="gold-line" />

      <div className="body">
        {/* Sidebar */}
        <div className="sidebar">
          <div className="sidebar-head">
            <h1 className="opening-title">{opening.name}</h1>
            <div className="opening-badges">
              <span className={`badge ${opening.color === 'white' ? 'badge-white' : 'badge-black'}`}>
                {opening.color === 'white' ? '♔ White' : '♚ Black'}
              </span>
            </div>
          </div>

          {/* Creator */}
          <div className="creator-row">
            {opening.createdBy?.photoURL && (
              <img src={opening.createdBy.photoURL} alt="" className="creator-avatar" referrerPolicy="no-referrer" />
            )}
            <span className="creator-label">by <strong>{opening.createdBy?.displayName || 'Anonymous'}</strong></span>
          </div>

          {opening.description && (
            <p className="opening-desc">{opening.description}</p>
          )}

          <div className="sidebar-label">Variants · {allVariants.length}</div>

          <div className="variant-list">
            {allVariants.map((path, idx) => {
              const leaf = path[path.length - 1];
              const name = opening.variantNames?.[leaf.id] || `Variant ${idx + 1}`;
              const pathIds = path.map((n) => n.id).join(',');
              return (
                <div
                  key={leaf.id}
                  className={`variant-item ${activeVariantIdx === idx ? 'variant-item-active' : ''}`}
                  onClick={() => selectVariant(idx)}
                >
                  <div className="variant-name">{name}</div>
                  <div className="variant-moves">{formatVariantMoves(path)}</div>
                  <Link
                    href={`/explore/${opening.id}/practice?path=${pathIds}`}
                    className="practice-btn"
                    onClick={(e) => e.stopPropagation()}
                  >
                    ▶ Practice
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        {/* Board area */}
        <div className="board-area">
          <div className="board-wrap">
            <Chessboard
              position={currentFen}
              boardOrientation={boardColor}
              arePiecesDraggable={false}
              customBoardStyle={{ borderRadius: '4px', boxShadow: '0 12px 40px rgba(0,0,0,0.7)' }}
              customDarkSquareStyle={{ backgroundColor: '#b58863' }}
              customLightSquareStyle={{ backgroundColor: '#f0d9b5' }}
              animationDuration={150}
            />
          </div>

          {/* Move strip */}
          {currentPath.length > 1 && (
            <div className="move-strip">
              {currentPath.slice(1).map((node, i) => {
                const isWhite = i % 2 === 0;
                const mn = Math.floor(i / 2) + 1;
                return (
                  <span key={node.id}>
                    {isWhite && <span className="mn">{mn}.</span>}
                    <button className="move-chip" onClick={() => navigateToNode(node)}>{node.san}</button>
                  </span>
                );
              })}
            </div>
          )}

          {allVariants.length > 0 && (
            <Link
              href={`/explore/${opening.id}/practice?path=${allVariants[activeVariantIdx].map((n) => n.id).join(',')}`}
              className="btn-practice-main"
            >
              ▶ Practice this variant
            </Link>
          )}
        </div>
      </div>

      <Footer />

      <style jsx>{`
        .page { min-height: 100vh; background: var(--bg-primary); display: flex; flex-direction: column; }

        .header { padding: 0 24px; border-bottom: 1px solid var(--border); background: var(--bg-secondary); }
        .header-inner {
          max-width: 1400px; margin: 0 auto; height: 56px;
          display: flex; align-items: center; justify-content: space-between; gap: 16px;
        }
        .logo { display: flex; align-items: center; gap: 12px; }
        .logo-chess { font-size: 28px; line-height: 1; filter: drop-shadow(0 0 8px rgba(201,168,76,0.5)); }
        .logo-title { font-family: var(--font-display); font-size: 17px; font-weight: 700; color: var(--accent-light); }
        .logo-sub { font-size: 11px; color: var(--text-muted); }
        .back-btn { font-size: 13px; color: var(--text-muted); text-decoration: none; transition: color 0.2s; }
        .back-btn:hover { color: var(--accent); }

        .gold-line { height: 1px; background: linear-gradient(90deg, transparent, var(--accent), transparent); opacity: 0.4; }

        .body { display: flex; flex: 1; overflow: hidden; min-height: 0; }

        /* Sidebar */
        .sidebar {
          width: 300px; flex-shrink: 0;
          border-right: 1px solid var(--border);
          display: flex; flex-direction: column;
          overflow-y: auto; background: var(--bg-secondary);
        }

        .sidebar-head { padding: 20px 20px 12px; border-bottom: 1px solid var(--border); }

        .opening-title {
          font-family: var(--font-display); font-size: 20px; font-weight: 700;
          color: var(--text-primary); margin-bottom: 8px; line-height: 1.2;
        }

        .opening-badges { display: flex; gap: 6px; flex-wrap: wrap; }

        .badge {
          font-size: 10px; font-weight: 700; letter-spacing: 0.08em;
          text-transform: uppercase; padding: 3px 9px; border-radius: 2px;
        }
        .badge-white { background: rgba(240,217,181,0.12); color: #e8d4b0; border: 1px solid rgba(240,217,181,0.2); }
        .badge-black { background: rgba(100,75,45,0.25); color: #c8a882; border: 1px solid rgba(150,110,70,0.25); }

        .creator-row {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 20px; border-bottom: 1px solid var(--border);
          font-size: 13px; color: var(--text-secondary);
        }
        .creator-avatar { width: 22px; height: 22px; border-radius: 50%; border: 1px solid var(--border); }
        .creator-label { font-size: 12px; color: var(--text-muted); }
        .creator-label strong { color: var(--text-secondary); }

        .opening-desc {
          padding: 12px 20px; font-size: 12px; color: var(--text-secondary);
          line-height: 1.55; border-bottom: 1px solid var(--border);
        }

        .sidebar-label {
          padding: 14px 20px 10px;
          font-size: 10px; font-weight: 700; letter-spacing: 0.1em;
          text-transform: uppercase; color: var(--text-muted);
        }

        .variant-list { display: flex; flex-direction: column; }

        .variant-item {
          padding: 12px 20px; border-bottom: 1px solid var(--border);
          cursor: pointer; transition: background 0.15s;
        }
        .variant-item:hover { background: rgba(255,255,255,0.03); }
        .variant-item-active {
          background: rgba(201,168,76,0.07);
          border-left: 3px solid var(--accent);
        }
        .variant-item-active .variant-name { color: var(--accent-light); }

        .variant-name { font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px; }
        .variant-moves {
          font-size: 11px; font-family: var(--font-mono); color: var(--text-muted);
          line-height: 1.5; margin-bottom: 8px; word-break: break-word;
        }
        .practice-btn {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 11px; font-weight: 700; letter-spacing: 0.04em;
          color: var(--accent); background: rgba(201,168,76,0.08);
          border: 1px solid rgba(201,168,76,0.2); border-radius: 3px;
          padding: 4px 10px; text-decoration: none; transition: all 0.2s;
        }
        .practice-btn:hover { background: rgba(201,168,76,0.16); border-color: rgba(201,168,76,0.4); color: var(--accent-light); }

        /* Board area */
        .board-area {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: flex-start;
          padding: 32px 28px; overflow-y: auto; gap: 18px;
        }

        .board-wrap { width: 100%; max-width: 500px; }

        .move-strip {
          display: flex; flex-wrap: wrap; gap: 3px;
          align-items: baseline; max-width: 500px; width: 100%; line-height: 1.8;
        }

        .mn { font-size: 11px; color: var(--text-muted); margin-right: 1px; font-family: var(--font-mono); }

        .move-chip {
          background: none; border: none;
          font-family: var(--font-mono); font-size: 13px;
          color: var(--text-secondary); cursor: pointer;
          padding: 2px 5px; border-radius: 2px; transition: all 0.15s;
        }
        .move-chip:hover { background: rgba(255,255,255,0.07); color: var(--text-primary); }

        .btn-practice-main {
          display: inline-flex; align-items: center; gap: 8px;
          background: var(--accent); color: #1a1408;
          font-size: 14px; font-weight: 700; letter-spacing: 0.04em;
          padding: 11px 28px; border-radius: 4px;
          text-decoration: none; transition: background 0.2s, transform 0.15s;
        }
        .btn-practice-main:hover { background: var(--accent-light); transform: translateY(-1px); }

        @media (max-width: 768px) {
          .header { padding: 0 14px; }
          .logo-sub { display: none; }
          .body { flex-direction: column; overflow: visible; }
          .sidebar { width: 100%; border-right: none; border-bottom: 1px solid var(--border); max-height: 300px; }
          .board-area { padding: 16px 12px; }
          .board-wrap { max-width: 100%; }
          .btn-practice-main { width: 100%; justify-content: center; }
        }
      `}</style>
    </div>
  );
}
