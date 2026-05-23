'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { buildLibraryOpening } from '../../../lib/libraryBuilder';
import { getAllVariants } from '../../../lib/store';
import { useAuth } from '../../../components/AuthProvider';
import Footer from '../../../components/Footer';

// react-chessboard must load client-side only
const Chessboard = dynamic(() => import('react-chessboard').then((m) => m.Chessboard), {
  ssr: false,
  loading: () => (
    <div style={{
      width: '100%', aspectRatio: '1', background: '#0f0f22',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#c9a84c', fontSize: 14, borderRadius: 4,
    }}>
      Loading board…
    </div>
  ),
});

// ─── Chess logic (chess.js) ────────────────────────────────────────────────
let ChessModule = null;
async function getChess(fen) {
  if (!ChessModule) {
    const mod = await import('chess.js');
    ChessModule = mod.Chess;
  }
  const c = new ChessModule();
  if (fen) c.load(fen);
  return c;
}

// ─── Format variant moves for display ────────────────────────────────────
function formatVariantMoves(path) {
  const moves = path.slice(1); // exclude root
  if (moves.length === 0) return '(no moves)';
  const parts = [];
  for (let i = 0; i < moves.length; i++) {
    if (i % 2 === 0) parts.push(`${Math.floor(i / 2) + 1}.${moves[i].san}`);
    else parts.push(moves[i].san);
  }
  return parts.join(' ');
}

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export default function LibraryOpeningPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [opening, setOpening] = useState(null);
  const [variants, setVariants] = useState([]);
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const [stepIdx, setStepIdx] = useState(0); // index into current variant path
  const [boardFen, setBoardFen] = useState(STARTING_FEN);
  const [loading, setLoading] = useState(true);

  // Load the library opening
  useEffect(() => {
    buildLibraryOpening(params.id).then((op) => {
      if (!op) { router.push('/library'); return; }
      const allVariants = getAllVariants(op.root);
      setOpening(op);
      setVariants(allVariants);
      setSelectedVariantIdx(0);
      setStepIdx(0);
      setBoardFen(STARTING_FEN);
      setLoading(false);
    });
  }, [params.id]);

  // When variant or step changes, update board FEN
  const currentVariant = variants[selectedVariantIdx] ?? null;
  const currentPath = currentVariant?.path ?? [];
  const currentNode = currentPath[stepIdx] ?? null;

  useEffect(() => {
    if (currentNode) {
      setBoardFen(currentNode.fen);
    }
  }, [currentNode]);

  function selectVariant(idx) {
    setSelectedVariantIdx(idx);
    setStepIdx(0);
  }

  function stepBack() {
    setStepIdx((s) => Math.max(0, s - 1));
  }

  function stepForward() {
    setStepIdx((s) => Math.min(currentPath.length - 1, s + 1));
  }

  function goToStart() {
    setStepIdx(0);
  }

  function goToEnd() {
    setStepIdx(currentPath.length - 1);
  }

  // Keyboard navigation
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowRight') stepForward();
      if (e.key === 'ArrowLeft') stepBack();
      if (e.key === 'ArrowUp') goToStart();
      if (e.key === 'ArrowDown') goToEnd();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentPath]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontSize: 18 }}>
          Loading…
        </span>
      </div>
    );
  }

  if (!opening) return null;

  const boardOrientation = opening.color === 'black' ? 'black' : 'white';
  const totalSteps = currentPath.length - 1;
  const completedSteps = stepIdx;

  // Build practice URL: path = comma-separated node IDs for current variant
  const practicePathStr = currentPath.map((n) => n.id).join(',');
  const practiceUrl = `/library/${opening.id}/practice?path=${encodeURIComponent(practicePathStr)}`;

  // Move chips for current variant
  const moveNodes = currentPath.slice(1); // exclude root

  return (
    <div className="page">
      {/* ── Top bar ── */}
      <div className="topbar">
        <div className="topbar-left">
          <Link href="/library" className="back-btn">← Library</Link>
          <div className="separator" />
          <span className="opening-name">{opening.name}</span>
          {opening.subtitle && <span className="opening-sub">{opening.subtitle}</span>}
          <div className={`badge ${opening.color === 'white' ? 'badge-white' : 'badge-black'}`}>
            {opening.color === 'white' ? '♔ White' : '♚ Black'}
          </div>
          {opening.eco && <span className="eco-badge">{opening.eco}</span>}
        </div>
        <div className="topbar-right">
          {user ? (
            <Link href="/" className="nav-link">My Openings</Link>
          ) : (
            <Link href="/" className="btn-signin">Sign in to build your own</Link>
          )}
        </div>
      </div>

      <div className="gold-line" />

      {/* ── Body ── */}
      <div className="body">
        {/* Left: Variants panel */}
        <div className="sidebar">
          <div className="sidebar-head">
            <span className="sidebar-title">Variations</span>
            <span className="variant-count">{variants.length}</span>
          </div>

          {opening.description && (
            <div className="opening-desc">{opening.description}</div>
          )}

          <div className="variant-list">
            {variants.map((v, idx) => {
              const leafId = v.path[v.path.length - 1]?.id;
              const name = opening.variantNames?.[leafId] || `Variation ${idx + 1}`;
              const isActive = idx === selectedVariantIdx;
              return (
                <div
                  key={leafId || idx}
                  className={`variant-item ${isActive ? 'active' : ''}`}
                  onClick={() => selectVariant(idx)}
                >
                  <div className="variant-name">{name}</div>
                  <div className="variant-moves">{formatVariantMoves(v.path)}</div>
                  <Link
                    href={`/library/${opening.id}/practice?path=${encodeURIComponent(v.path.map((n) => n.id).join(','))}`}
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

        {/* Center: Board */}
        <div className="board-area">
          <div className="board-wrap">
            <Chessboard
              position={boardFen}
              boardOrientation={boardOrientation}
              arePiecesDraggable={false}
              customBoardStyle={{
                borderRadius: '4px',
                boxShadow: '0 16px 48px rgba(0,0,0,0.75)',
              }}
              customDarkSquareStyle={{ backgroundColor: '#b58863' }}
              customLightSquareStyle={{ backgroundColor: '#f0d9b5' }}
              animationDuration={200}
            />
          </div>

          {/* Navigation controls */}
          <div className="nav-controls">
            <button className="nav-btn" onClick={goToStart} title="Start (↑)" disabled={stepIdx === 0}>⇤</button>
            <button className="nav-btn" onClick={stepBack} title="Back (←)" disabled={stepIdx === 0}>←</button>
            <span className="nav-pos">
              {stepIdx === 0 ? 'Start' : (() => {
                const nodeIdx = stepIdx - 1;
                const moveNum = Math.floor(nodeIdx / 2) + 1;
                const isW = nodeIdx % 2 === 0;
                return `${moveNum}${isW ? '.' : '…'}${moveNodes[nodeIdx]?.san}`;
              })()}
            </span>
            <button className="nav-btn" onClick={stepForward} title="Forward (→)" disabled={stepIdx >= currentPath.length - 1}>→</button>
            <button className="nav-btn" onClick={goToEnd} title="End (↓)" disabled={stepIdx >= currentPath.length - 1}>⇥</button>
          </div>

          {/* Move chips */}
          <div className="move-strip">
            {moveNodes.length === 0 ? (
              <span className="no-moves">Starting position</span>
            ) : (
              moveNodes.map((node, i) => {
                const isW = i % 2 === 0;
                const isCurrent = i === stepIdx - 1;
                return (
                  <span
                    key={node.id}
                    className={`move-chip ${isCurrent ? 'chip-current' : i < stepIdx ? 'chip-done' : 'chip-future'}`}
                    onClick={() => setStepIdx(i + 1)}
                  >
                    {isW && <span className="mn">{Math.floor(i / 2) + 1}.</span>}
                    {node.san}
                  </span>
                );
              })
            )}
          </div>

          {/* Practice button */}
          <Link href={practiceUrl} className="btn-practice-main">
            ▶ Practice this variation
          </Link>
        </div>
      </div>

      <Footer />

      <style jsx>{`
        .page {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          background: var(--bg-primary);
        }

        /* Topbar */
        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          height: 60px;
          border-bottom: 1px solid var(--border);
          background: var(--bg-secondary);
          flex-shrink: 0;
          gap: 12px;
        }

        .topbar-left {
          display: flex;
          align-items: center;
          gap: 10px;
          overflow: hidden;
          flex: 1;
          min-width: 0;
        }

        .topbar-right { flex-shrink: 0; }

        .back-btn {
          color: var(--text-muted);
          text-decoration: none;
          font-size: 13px;
          white-space: nowrap;
          transition: color 0.2s;
          flex-shrink: 0;
        }

        .back-btn:hover { color: var(--accent); }

        .separator {
          width: 1px;
          height: 18px;
          background: var(--border);
          flex-shrink: 0;
        }

        .opening-name {
          font-family: var(--font-display);
          font-size: 17px;
          font-weight: 700;
          color: var(--accent-light);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .opening-sub {
          font-size: 12px;
          color: var(--text-muted);
          white-space: nowrap;
          font-style: italic;
        }

        .badge {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 3px 9px;
          border-radius: 2px;
          flex-shrink: 0;
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
          flex-shrink: 0;
        }

        .nav-link {
          font-size: 13px;
          color: var(--text-secondary);
          text-decoration: none;
          padding: 5px 10px;
          border-radius: 3px;
          transition: color 0.2s;
        }

        .nav-link:hover { color: var(--accent); }

        .btn-signin {
          background: var(--accent);
          color: #1a1408;
          font-size: 12px;
          font-weight: 700;
          padding: 7px 14px;
          border-radius: 3px;
          text-decoration: none;
          letter-spacing: 0.04em;
          white-space: nowrap;
        }

        .gold-line {
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--accent), transparent);
          opacity: 0.4;
        }

        /* Body layout */
        .body {
          display: flex;
          flex: 1;
          overflow: hidden;
          min-height: 0;
        }

        /* Sidebar */
        .sidebar {
          width: 300px;
          flex-shrink: 0;
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          background: var(--bg-secondary);
        }

        .sidebar-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px 12px;
          border-bottom: 1px solid var(--border);
        }

        .sidebar-title {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-muted);
        }

        .variant-count {
          font-size: 11px;
          color: var(--text-muted);
          background: rgba(255,255,255,0.06);
          padding: 1px 7px;
          border-radius: 10px;
        }

        .opening-desc {
          padding: 12px 20px 14px;
          font-size: 12px;
          color: var(--text-secondary);
          line-height: 1.55;
          border-bottom: 1px solid var(--border);
        }

        .variant-list {
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .variant-item {
          padding: 12px 20px;
          border-bottom: 1px solid var(--border);
          cursor: pointer;
          transition: background 0.15s;
        }

        .variant-item:hover { background: rgba(255,255,255,0.03); }

        .variant-item.active {
          background: rgba(201,168,76,0.07);
          border-left: 3px solid var(--accent);
        }

        .variant-item.active .variant-name { color: var(--accent-light); }

        .variant-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .variant-moves {
          font-size: 11px;
          font-family: var(--font-mono);
          color: var(--text-muted);
          line-height: 1.5;
          margin-bottom: 8px;
          word-break: break-word;
        }

        .practice-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.04em;
          color: var(--accent);
          background: rgba(201,168,76,0.08);
          border: 1px solid rgba(201,168,76,0.2);
          border-radius: 3px;
          padding: 4px 10px;
          text-decoration: none;
          transition: all 0.2s;
        }

        .practice-btn:hover {
          background: rgba(201,168,76,0.16);
          border-color: rgba(201,168,76,0.4);
          color: var(--accent-light);
        }

        /* Board area */
        .board-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          padding: 28px 32px;
          overflow-y: auto;
          gap: 16px;
        }

        .board-wrap {
          width: 100%;
          max-width: 500px;
        }

        /* Nav controls */
        .nav-controls {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .nav-btn {
          background: rgba(255,255,255,0.06);
          border: 1px solid var(--border);
          color: var(--text-secondary);
          padding: 5px 12px;
          font-size: 14px;
          border-radius: 3px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .nav-btn:hover:not(:disabled) {
          background: rgba(201,168,76,0.1);
          border-color: rgba(201,168,76,0.3);
          color: var(--accent);
        }

        .nav-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .nav-pos {
          font-family: var(--font-mono);
          font-size: 13px;
          color: var(--text-muted);
          min-width: 80px;
          text-align: center;
        }

        /* Move strip */
        .move-strip {
          display: flex;
          flex-wrap: wrap;
          gap: 3px;
          align-items: baseline;
          max-width: 500px;
          width: 100%;
          line-height: 1.8;
        }

        .no-moves { font-size: 12px; color: var(--text-muted); font-style: italic; }

        .move-chip {
          display: inline-flex;
          align-items: baseline;
          gap: 1px;
          padding: 2px 6px;
          border-radius: 3px;
          font-family: var(--font-mono);
          font-size: 13px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .chip-done {
          color: var(--text-muted);
          background: rgba(255,255,255,0.03);
        }

        .chip-done:hover { background: rgba(255,255,255,0.07); color: var(--text-secondary); }

        .chip-current {
          color: var(--accent-light);
          background: rgba(201,168,76,0.15);
          font-weight: 600;
        }

        .chip-future {
          color: var(--text-muted);
          opacity: 0.5;
        }

        .chip-future:hover { opacity: 0.8; background: rgba(255,255,255,0.04); }

        .mn {
          font-size: 11px;
          color: var(--text-muted);
          margin-right: 1px;
        }

        /* Practice main button */
        .btn-practice-main {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: var(--accent);
          color: #1a1408;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.04em;
          padding: 11px 28px;
          border-radius: 4px;
          text-decoration: none;
          transition: background 0.2s, transform 0.15s;
        }

        .btn-practice-main:hover {
          background: var(--accent-light);
          transform: translateY(-1px);
        }

        /* ── Responsive / Mobile ── */
        @media (max-width: 768px) {
          .topbar { padding: 0 12px; height: 52px; flex-wrap: wrap; }
          .opening-sub { display: none; }
          .eco-badge { display: none; }
          .btn-signin { font-size: 11px; padding: 6px 10px; }

          .body { flex-direction: column; overflow: visible; }

          .sidebar {
            width: 100%;
            border-right: none;
            border-bottom: 1px solid var(--border);
            max-height: 300px;
            overflow-y: auto;
          }

          .board-area {
            padding: 14px 10px;
            gap: 10px;
          }

          .board-wrap { max-width: 100%; }

          .nav-controls { gap: 4px; }
          .nav-btn { padding: 6px 10px; font-size: 16px; }

          .move-strip { font-size: 12px; }

          .btn-practice-main { width: 100%; justify-content: center; }
        }

        @media (max-width: 480px) {
          .sidebar-head { padding: 12px 14px 10px; }
          .opening-desc { padding: 10px 14px; font-size: 11px; }
          .variant-item { padding: 10px 14px; }
        }
      `}</style>
    </div>
  );
}
