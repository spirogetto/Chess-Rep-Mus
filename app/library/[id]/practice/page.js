'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { buildLibraryOpening } from '../../../../lib/libraryBuilder';
import { findNode } from '../../../../lib/store';
import Footer from '../../../../components/Footer';

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

// ─── Chess logic (chess.js) ───────────────────────────────────────────────
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

// ─── Format move list for sidebar display ────────────────────────────────
function formatMoveList(nodes) {
  return nodes.map((node, i) => ({
    node,
    moveNum: Math.floor(i / 2) + 1,
    isWhite: i % 2 === 0,
    index: i,
  }));
}

// ─── Completion screen ────────────────────────────────────────────────────
function CompletionScreen({ opening, variantName, score, onRetry }) {
  const accuracy = (score.correct + score.wrong) > 0
    ? Math.round((score.correct / (score.correct + score.wrong)) * 100)
    : 100;

  return (
    <div className="completion">
      <div className="completion-inner">
        <div className="completion-icon">♛</div>
        <h2 className="completion-title">Variant Complete!</h2>
        <p className="completion-subtitle">{variantName}</p>

        <div className="score-grid">
          <div className="score-cell">
            <div className="score-val score-correct">{score.correct}</div>
            <div className="score-lbl">Correct</div>
          </div>
          <div className="score-cell">
            <div className="score-val score-wrong">{score.wrong}</div>
            <div className="score-lbl">Mistakes</div>
          </div>
          <div className="score-cell">
            <div className="score-val">{accuracy}%</div>
            <div className="score-lbl">Accuracy</div>
          </div>
        </div>

        {accuracy === 100 && (
          <div className="perfect-msg">Perfect! You played the entire variant without a mistake.</div>
        )}

        <div className="completion-actions">
          <button className="btn-primary" onClick={onRetry}>Practice Again</button>
          <Link href={`/library/${opening.id}`} className="btn-ghost">Back to Opening</Link>
          <Link href="/library" className="btn-ghost">Library</Link>
        </div>
      </div>

      <style jsx>{`
        .completion {
          min-height: 100vh;
          background: var(--bg-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }

        .completion-inner {
          background: var(--bg-card);
          border: 1px solid var(--border-strong);
          border-radius: 8px;
          padding: 48px 40px;
          max-width: 460px;
          width: 100%;
          text-align: center;
          box-shadow: var(--shadow-lg);
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .completion-icon {
          font-size: 52px;
          margin-bottom: 20px;
          filter: drop-shadow(0 0 16px rgba(201,168,76,0.5));
        }

        .completion-title {
          font-family: var(--font-display);
          font-size: 28px;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: var(--accent-light);
          margin-bottom: 6px;
        }

        .completion-subtitle {
          font-size: 14px;
          color: var(--text-muted);
          margin-bottom: 32px;
        }

        .score-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1px;
          background: var(--border);
          border-radius: 6px;
          overflow: hidden;
          margin-bottom: 24px;
        }

        .score-cell {
          background: var(--bg-secondary);
          padding: 20px 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .score-val {
          font-family: var(--font-display);
          font-size: 28px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .score-correct { color: #6dba7c; }
        .score-wrong   { color: #e07070; }

        .score-lbl {
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-muted);
        }

        .perfect-msg {
          background: rgba(109,186,124,0.1);
          border: 1px solid rgba(109,186,124,0.25);
          border-radius: 4px;
          padding: 12px 16px;
          font-size: 13px;
          color: #6dba7c;
          margin-bottom: 24px;
          line-height: 1.5;
        }

        .completion-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .completion-actions .btn-ghost {
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          padding: 9px 20px;
        }
      `}</style>
    </div>
  );
}

// ─── Main practice content ────────────────────────────────────────────────
function PracticeContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [opening, setOpening] = useState(null);
  const [variantNodes, setVariantNodes] = useState([]);
  const [variantName, setVariantName] = useState('');
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState('loading');
  const [wrongMove, setWrongMove] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [score, setScore] = useState({ correct: 0, wrong: 0 });
  const [isRetry, setIsRetry] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [squareHighlights, setSquareHighlights] = useState({});

  useEffect(() => {
    const pathStr = searchParams.get('path');
    if (!pathStr) { router.push(`/library/${params.id}`); return; }

    buildLibraryOpening(params.id).then((op) => {
      if (!op) { router.push('/library'); return; }

      const pathIds = pathStr.split(',').filter(Boolean);
      const nodes = pathIds.map((id) => findNode(op.root, id)).filter(Boolean);

      if (nodes.length < 2) { router.push(`/library/${params.id}`); return; }

      const leafId = nodes[nodes.length - 1]?.id;
      const vName = op.variantNames?.[leafId] || 'Variation';

      setOpening(op);
      setVariantNodes(nodes);
      setVariantName(vName);
      setStep(0);
      setStatus('loading');
      setScore({ correct: 0, wrong: 0 });
      setWrongMove('');
      setShowHint(false);
    });
  }, [params.id, searchParams, isRetry]);

  const currentNode = variantNodes[step] ?? null;
  const nextNode = variantNodes[step + 1] ?? null;

  function isPlayersTurn() {
    if (!currentNode || !opening) return false;
    const sideToMove = currentNode.fen.split(' ')[1];
    return sideToMove === opening.color[0];
  }

  useEffect(() => {
    if (!opening || variantNodes.length === 0 || status === 'loading') return;
    if (step >= variantNodes.length - 1) { setStatus('complete'); return; }
    if (isPlayersTurn()) {
      setStatus('player');
    } else {
      setStatus('opponent');
      const timer = setTimeout(() => setStep((s) => s + 1), 750);
      return () => clearTimeout(timer);
    }
  }, [step, opening, variantNodes, status]);

  useEffect(() => {
    if (status === 'loading' && opening && variantNodes.length > 0) {
      if (variantNodes.length === 1) {
        setStatus('complete');
      } else if (isPlayersTurn()) {
        setStatus('player');
      } else {
        setStatus('opponent');
      }
    }
  }, [opening, variantNodes]);

  const handlePieceDrop = useCallback(
    async (sourceSquare, targetSquare) => {
      if (status !== 'player' || !currentNode || !nextNode) return false;
      const chess = await getChess(currentNode.fen);
      let result = null;
      try {
        result = chess.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
      } catch { return false; }
      if (!result) return false;

      setSelectedSquare(null);
      setSquareHighlights({});

      if (result.san === nextNode.san) {
        setScore((s) => ({ ...s, correct: s.correct + 1 }));
        setShowHint(false);
        setWrongMove('');
        setStep((s) => s + 1);
        return true;
      } else {
        setWrongMove(result.san);
        setStatus('wrong');
        setScore((s) => ({ ...s, wrong: s.wrong + 1 }));
        return false;
      }
    },
    [status, currentNode, nextNode]
  );

  const handleSquareClick = useCallback(
    async (square) => {
      if (status !== 'player' || !currentNode || !nextNode) return;
      const chess = await getChess(currentNode.fen);

      if (selectedSquare) {
        const moves = chess.moves({ square: selectedSquare, verbose: true });
        if (moves.some((m) => m.to === square)) {
          setSelectedSquare(null);
          setSquareHighlights({});
          handlePieceDrop(selectedSquare, square);
          return;
        }
      }

      const piece = chess.get(square);
      if (!piece) { setSelectedSquare(null); setSquareHighlights({}); return; }

      const moves = chess.moves({ square, verbose: true });
      if (moves.length === 0) { setSelectedSquare(null); setSquareHighlights({}); return; }

      const highlights = { [square]: { background: 'rgba(255,255,100,0.4)' } };
      moves.forEach((m) => {
        highlights[m.to] = chess.get(m.to)
          ? { background: 'radial-gradient(circle, rgba(0,0,0,.22) 86%, transparent 86%)', borderRadius: '50%' }
          : { background: 'radial-gradient(circle, rgba(0,0,0,.15) 25%, transparent 25%)', borderRadius: '50%' };
      });
      setSelectedSquare(square);
      setSquareHighlights(highlights);
    },
    [status, currentNode, nextNode, selectedSquare, handlePieceDrop]
  );

  function handleTryAgain() { setWrongMove(''); setShowHint(false); setStatus('player'); }
  function handleSkip() { setWrongMove(''); setShowHint(false); setStep((s) => s + 1); }
  function handleRetry() {
    setIsRetry((r) => !r);
    setStep(0);
    setStatus('loading');
    setScore({ correct: 0, wrong: 0 });
    setWrongMove('');
    setShowHint(false);
  }

  if (status === 'complete' && opening) {
    return (
      <CompletionScreen
        opening={opening}
        variantName={variantName}
        score={score}
        onRetry={handleRetry}
      />
    );
  }

  if (!opening || variantNodes.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>Loading…</span>
      </div>
    );
  }

  const boardFen = currentNode?.fen || 'start';
  const boardOrientation = opening.color === 'black' ? 'black' : 'white';
  const totalMoves = variantNodes.length - 1;
  const completedMoves = Math.max(0, step);
  const progressPct = totalMoves > 0 ? (completedMoves / totalMoves) * 100 : 0;
  const moveItems = formatMoveList(variantNodes.slice(1));

  return (
    <div className="practice-page">
      {/* ── Top bar ── */}
      <div className="topbar">
        <div className="topbar-left">
          <Link href={`/library/${opening.id}`} className="back-btn">← {opening.name}</Link>
          <div className="separator" />
          <span className="variant-label">{variantName}</span>
          <span className={`badge ${opening.color === 'white' ? 'badge-white' : 'badge-black'}`}>
            {opening.color === 'white' ? '♔ White' : '♚ Black'}
          </span>
        </div>
        <div className="topbar-right">
          <span className="progress-text">{completedMoves} / {totalMoves} moves</span>
        </div>
      </div>

      {/* ── Progress bar ── */}
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progressPct}%` }} />
      </div>

      {/* ── Body ── */}
      <div className="body">
        {/* Sidebar */}
        <div className="sidebar">
          <div className="sidebar-section">
            <div className="sidebar-label">Variant Moves</div>
            <div className="move-list">
              {moveItems.map(({ node, moveNum, isWhite, index }) => {
                const isDone = index < step;
                const isCurrent = index === step - 1;
                const isNext = index === step;
                return (
                  <span
                    key={node.id}
                    className={`move-chip ${isDone ? 'done' : isCurrent ? 'is-current' : isNext ? 'is-next' : 'upcoming'}`}
                  >
                    {isWhite && <span className="mn">{moveNum}.</span>}
                    <span className="san">{node.san}</span>
                  </span>
                );
              })}
            </div>
          </div>

          {/* Status panel */}
          <div className="status-panel">
            {status === 'player' && (
              <>
                <div className="status-icon">{opening.color === 'white' ? '♙' : '♟'}</div>
                <div className="status-msg your-turn">Your move</div>
                <div className="status-sub">
                  {nextNode ? `Find the right move for position ${completedMoves + 1}` : ''}
                </div>
                {showHint && nextNode && (
                  <div className="hint-box">Hint: <strong>{nextNode.san}</strong></div>
                )}
                <div className="status-actions">
                  {!showHint && (
                    <button className="btn-hint" onClick={() => setShowHint(true)}>Show hint</button>
                  )}
                  <button className="btn-skip" onClick={handleSkip}>Skip move</button>
                </div>
              </>
            )}

            {status === 'opponent' && (
              <>
                <div className="status-icon opp-icon">{opening.color === 'white' ? '♟' : '♙'}</div>
                <div className="status-msg opp-turn">Opponent playing…</div>
                <div className="status-sub">{nextNode?.san}</div>
              </>
            )}

            {status === 'wrong' && (
              <>
                <div className="status-icon wrong-icon">✕</div>
                <div className="status-msg wrong-msg">
                  You played <strong>{wrongMove}</strong>
                </div>
                <div className="status-sub">
                  The correct move is <strong className="correct-move">{nextNode?.san}</strong>
                </div>
                <div className="status-actions">
                  <button className="btn-retry" onClick={handleTryAgain}>Try again</button>
                  <button className="btn-skip" onClick={handleSkip}>Play {nextNode?.san}</button>
                </div>
              </>
            )}
          </div>

          {/* Score */}
          <div className="score-bar">
            <span className="score-correct-badge">✓ {score.correct}</span>
            <span className="score-wrong-badge">✕ {score.wrong}</span>
          </div>
        </div>

        {/* Board */}
        <div className="board-area">
          <div className="board-wrap">
            <Chessboard
              position={boardFen}
              onPieceDrop={handlePieceDrop}
              onSquareClick={handleSquareClick}
              boardOrientation={boardOrientation}
              arePiecesDraggable={status === 'player'}
              customBoardStyle={{
                borderRadius: '4px',
                boxShadow: '0 16px 48px rgba(0,0,0,0.75)',
                opacity: status === 'opponent' ? 0.85 : 1,
                transition: 'opacity 0.3s ease',
              }}
              customDarkSquareStyle={{ backgroundColor: '#b58863' }}
              customLightSquareStyle={{ backgroundColor: '#f0d9b5' }}
              customSquareStyles={squareHighlights}
              animationDuration={200}
            />
          </div>

          <div className={`board-status ${status === 'wrong' ? 'board-status-wrong' : status === 'player' ? 'board-status-player' : 'board-status-opp'}`}>
            {status === 'player' && 'Make your move'}
            {status === 'opponent' && 'Opponent thinking…'}
            {status === 'wrong' && `Wrong — correct move: ${nextNode?.san}`}
          </div>
        </div>
      </div>

      {/* ── Styles ── */}
      <style jsx>{`
        .practice-page {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          background: var(--bg-primary);
        }

        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          height: 56px;
          border-bottom: 1px solid var(--border);
          background: var(--bg-secondary);
          flex-shrink: 0;
        }

        .topbar-left {
          display: flex;
          align-items: center;
          gap: 12px;
          overflow: hidden;
          flex: 1;
          min-width: 0;
        }

        .topbar-right { flex-shrink: 0; margin-left: 16px; }

        .back-btn {
          color: var(--text-muted);
          text-decoration: none;
          font-size: 13px;
          white-space: nowrap;
          flex-shrink: 0;
          transition: color 0.2s;
        }

        .back-btn:hover { color: var(--accent); }

        .separator {
          width: 1px;
          height: 18px;
          background: var(--border);
          flex-shrink: 0;
        }

        .variant-label {
          font-family: var(--font-display);
          font-size: 16px;
          font-weight: 600;
          color: var(--accent-light);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
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

        .progress-text {
          font-family: var(--font-mono);
          font-size: 12px;
          color: var(--text-muted);
          letter-spacing: 0.05em;
        }

        .progress-bar { height: 3px; background: var(--border); flex-shrink: 0; }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--accent-dim), var(--accent));
          transition: width 0.4s ease;
          border-radius: 0 2px 2px 0;
        }

        .body { display: flex; flex: 1; overflow: hidden; }

        /* Sidebar */
        .sidebar {
          width: 280px;
          flex-shrink: 0;
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          background: var(--bg-secondary);
        }

        .sidebar-section {
          padding: 20px;
          border-bottom: 1px solid var(--border);
        }

        .sidebar-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-muted);
          margin-bottom: 12px;
        }

        .move-list {
          display: flex;
          flex-wrap: wrap;
          align-items: baseline;
          gap: 3px;
          line-height: 1.8;
        }

        .move-chip {
          display: inline-flex;
          align-items: baseline;
          gap: 1px;
          padding: 2px 5px;
          border-radius: 3px;
          font-family: var(--font-mono);
          font-size: 13px;
          transition: all 0.2s;
        }

        .move-chip.done { color: var(--text-muted); background: rgba(255,255,255,0.03); }
        .move-chip.is-current {
          color: var(--accent-light);
          background: rgba(201,168,76,0.15);
          font-weight: 600;
        }
        .move-chip.is-next {
          color: var(--text-secondary);
          background: rgba(255,255,255,0.06);
          box-shadow: 0 0 0 1px var(--border);
        }
        .move-chip.upcoming { color: var(--text-muted); }

        .mn { font-size: 11px; color: var(--text-muted); margin-right: 1px; }

        /* Status panel */
        .status-panel {
          padding: 24px 20px;
          border-bottom: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          text-align: center;
          min-height: 180px;
          justify-content: center;
        }

        .status-icon { font-size: 36px; line-height: 1; margin-bottom: 4px; }
        .opp-icon { opacity: 0.5; }

        .wrong-icon {
          font-size: 28px;
          color: #e07070;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(224,112,112,0.12);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .status-msg {
          font-family: var(--font-display);
          font-size: 18px;
          font-weight: 600;
          letter-spacing: -0.01em;
        }

        .your-turn { color: var(--accent-light); }
        .opp-turn  { color: var(--text-secondary); }
        .wrong-msg { color: #e07070; }

        .status-sub {
          font-size: 13px;
          color: var(--text-muted);
          line-height: 1.5;
        }

        .correct-move { color: #6dba7c; }

        .hint-box {
          background: rgba(201,168,76,0.1);
          border: 1px solid rgba(201,168,76,0.25);
          border-radius: 4px;
          padding: 8px 16px;
          font-size: 13px;
          color: var(--accent-light);
        }

        .status-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: 100%;
          margin-top: 4px;
        }

        .btn-hint, .btn-skip, .btn-retry {
          width: 100%;
          padding: 8px 16px;
          border-radius: 3px;
          font-family: var(--font-body);
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-hint {
          background: rgba(201,168,76,0.08);
          border: 1px solid rgba(201,168,76,0.2);
          color: var(--accent-light);
        }

        .btn-hint:hover { background: rgba(201,168,76,0.15); }

        .btn-skip {
          background: rgba(255,255,255,0.04);
          border: 1px solid var(--border);
          color: var(--text-muted);
        }

        .btn-skip:hover { color: var(--text-secondary); border-color: var(--border-strong); }

        .btn-retry {
          background: rgba(224,112,112,0.1);
          border: 1px solid rgba(224,112,112,0.25);
          color: #e07070;
        }

        .btn-retry:hover { background: rgba(224,112,112,0.16); }

        /* Score bar */
        .score-bar {
          display: flex;
          gap: 12px;
          padding: 16px 20px;
          justify-content: center;
        }

        .score-correct-badge {
          font-size: 14px;
          font-weight: 700;
          color: #6dba7c;
          background: rgba(109,186,124,0.1);
          border: 1px solid rgba(109,186,124,0.2);
          padding: 4px 14px;
          border-radius: 3px;
        }

        .score-wrong-badge {
          font-size: 14px;
          font-weight: 700;
          color: #e07070;
          background: rgba(224,112,112,0.1);
          border: 1px solid rgba(224,112,112,0.2);
          padding: 4px 14px;
          border-radius: 3px;
        }

        /* Board */
        .board-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 32px;
          gap: 16px;
        }

        .board-wrap {
          width: 100%;
          max-width: 520px;
        }

        .board-status {
          font-size: 13px;
          padding: 8px 20px;
          border-radius: 4px;
          font-weight: 600;
          letter-spacing: 0.02em;
        }

        .board-status-player {
          color: var(--accent-light);
          background: rgba(201,168,76,0.08);
          border: 1px solid rgba(201,168,76,0.2);
        }

        .board-status-opp {
          color: var(--text-muted);
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--border);
        }

        .board-status-wrong {
          color: #e07070;
          background: rgba(224,112,112,0.08);
          border: 1px solid rgba(224,112,112,0.25);
        }

        /* ── Responsive / Mobile ── */
        @media (max-width: 768px) {
          .topbar { padding: 0 12px; height: 50px; }
          .variant-label { font-size: 14px; }

          .body { flex-direction: column-reverse; overflow: visible; }

          .sidebar {
            width: 100%;
            border-right: none;
            border-top: 1px solid var(--border);
            flex-direction: row;
            flex-wrap: wrap;
            overflow: visible;
          }

          .sidebar-section {
            flex: 1;
            min-width: 0;
            border-bottom: none;
            border-right: 1px solid var(--border);
          }

          .status-panel {
            flex: 1;
            min-width: 200px;
            border-bottom: none;
            min-height: 140px;
          }

          .score-bar { width: 100%; justify-content: center; border-top: 1px solid var(--border); }

          .board-area { padding: 14px 10px; gap: 10px; }
          .board-wrap { max-width: 100%; }
          .board-status { font-size: 12px; padding: 6px 14px; }
        }

        @media (max-width: 480px) {
          .sidebar { flex-direction: column; }
          .sidebar-section { border-right: none; border-bottom: 1px solid var(--border); }
          .status-panel { border-bottom: 1px solid var(--border); }
        }
      `}</style>
    </div>
  );
}

// ─── Page wrapper with Suspense (required for useSearchParams) ────────────
export default function LibraryPracticePage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>Loading…</span>
      </div>
    }>
      <PracticeContent />
    </Suspense>
  );
}
