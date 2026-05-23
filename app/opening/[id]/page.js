'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  getOpening,
  saveOpening,
  cloneOpening,
  deleteOpening,
  patchOpening,
  findNode,
  findPath,
  addMoveToTree,
  deleteSubtree,
  updateNotes,
  getAllVariants,
  getVariantDeleteNodeId,
  setVariantName,
} from '../../../lib/store';
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

// ─── Utility: format a variant path into a move string ────────────────────
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

// ─── Move Tree (recursive component) ─────────────────────────────────────

function MoveToken({ san, isCurrent, isOnPath, onClick, onDelete }) {
  const [hovered, setHovered] = useState(false);
  return (
    <span
      className={`move-token ${isCurrent ? 'current' : isOnPath ? 'on-path' : ''}`}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 2 }}
    >
      {san}
      {hovered && (
        <span
          className="move-del"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          title="Delete this move and all continuations"
        >×</span>
      )}
    </span>
  );
}

function TreeLine({ node, isBlack, moveNum, currentId, pathIds, onNavigate, onDelete, depth = 0 }) {
  if (!node.san) {
    if (node.children.length === 0) {
      return <span className="tree-empty">No moves yet — make a move on the board</span>;
    }
    return (
      <span>
        {node.children.map((child, i) => (
          <span key={child.id}>
            {i > 0 && <span className="tree-var-sep"> / </span>}
            <TreeLine
              node={child} isBlack={false} moveNum={1}
              currentId={currentId} pathIds={pathIds}
              onNavigate={onNavigate} onDelete={onDelete} depth={depth}
            />
          </span>
        ))}
      </span>
    );
  }

  const isCurrent = node.id === currentId;
  const isOnPath = pathIds.includes(node.id);
  const nextIsBlack = !isBlack;
  const nextMoveNum = isBlack ? moveNum + 1 : moveNum;

  return (
    <span className="tree-node">
      {!isBlack && <span className="move-num">{moveNum}.</span>}
      <MoveToken
        san={node.san} isCurrent={isCurrent} isOnPath={isOnPath}
        onClick={() => onNavigate(node.id)}
        onDelete={() => onDelete(node.id)}
      />
      {node.children.length > 0 && (
        <>
          <TreeLine
            node={node.children[0]} isBlack={nextIsBlack} moveNum={nextMoveNum}
            currentId={currentId} pathIds={pathIds}
            onNavigate={onNavigate} onDelete={onDelete} depth={depth + 1}
          />
          {node.children.slice(1).map((varNode) => (
            <span key={varNode.id} className="variation-block">
              {' ('}
              {nextIsBlack && <span className="move-num">{nextMoveNum - 1}…</span>}
              <TreeLine
                node={varNode} isBlack={nextIsBlack} moveNum={nextMoveNum}
                currentId={currentId} pathIds={pathIds}
                onNavigate={onNavigate} onDelete={onDelete} depth={depth + 1}
              />
              {')'}
            </span>
          ))}
        </>
      )}
    </span>
  );
}

// ─── Opening Editor Page ───────────────────────────────────────────────────

export default function OpeningPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [opening, setOpening] = useState(null);
  const [currentId, setCurrentId] = useState('root');
  const [notes, setNotes] = useState('');
  const [notesTimer, setNotesTimer] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [boardReady, setBoardReady] = useState(false);
  const [rightTab, setRightTab] = useState('variants'); // 'variants' | 'tree' | 'notes'
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState('');
  const nameRef = useRef(null);

  // Variant rename state
  const [editingVariantLeafId, setEditingVariantLeafId] = useState(null);
  const [editVariantName, setEditVariantName] = useState('');

  // ── Click-to-move + legal move highlights ─────────────────────────────────
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [squareHighlights, setSquareHighlights] = useState({});

  useEffect(() => {
    if (!user) return;
    getOpening(params.id).then((op) => {
      if (!op) { router.push('/'); return; }
      setOpening(op);
      setCurrentId('root');
      setBoardReady(true);
    });
  }, [params.id, user]);

  useEffect(() => {
    if (!opening) return;
    const node = findNode(opening.root, currentId);
    setNotes(node?.notes || '');
  }, [currentId, opening]);

  const currentNode = opening ? findNode(opening.root, currentId) : null;
  const currentPath = opening ? (findPath(opening.root, currentId) || ['root']) : ['root'];

  const pathNodes = currentPath
    .map((id) => (opening ? findNode(opening.root, id) : null))
    .filter(Boolean);

  // ── Make a move ──────────────────────────────────────────────────────────
  const handlePieceDrop = useCallback(
    async (sourceSquare, targetSquare) => {
      if (!opening || !currentNode) return false;
      const chess = await getChess(currentNode.fen);
      let result = null;
      try {
        result = chess.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
      } catch { return false; }
      if (!result) return false;

      const newOpening = cloneOpening(opening);
      const newId = addMoveToTree(newOpening.root, currentId, {
        san: result.san,
        fen: chess.fen(),
      });

      await saveOpening(newOpening);
      setOpening(newOpening);
      setCurrentId(newId);
      setSelectedSquare(null);
      setSquareHighlights({});
      flash(result.san);
      return true;
    },
    [opening, currentId, currentNode]
  );

  // ── Square click: show legal moves + click-to-move ───────────────────────
  const handleSquareClick = useCallback(
    async (square) => {
      if (!opening || !currentNode) return;
      const chess = await getChess(currentNode.fen);

      // If a piece is already selected, check if this square is a legal target
      if (selectedSquare) {
        const moves = chess.moves({ square: selectedSquare, verbose: true });
        const isTarget = moves.some((m) => m.to === square);
        if (isTarget) {
          setSelectedSquare(null);
          setSquareHighlights({});
          handlePieceDrop(selectedSquare, square);
          return;
        }
      }

      // Try to select this square's piece
      const piece = chess.get(square);
      if (!piece) {
        setSelectedSquare(null);
        setSquareHighlights({});
        return;
      }

      const moves = chess.moves({ square, verbose: true });
      const highlights = {
        [square]: { background: 'rgba(255,255,100,0.4)' },
      };
      moves.forEach((m) => {
        highlights[m.to] = chess.get(m.to)
          ? { background: 'radial-gradient(circle, rgba(0,0,0,.22) 86%, transparent 86%)', borderRadius: '50%' }
          : { background: 'radial-gradient(circle, rgba(0,0,0,.15) 25%, transparent 25%)', borderRadius: '50%' };
      });

      setSelectedSquare(square);
      setSquareHighlights(highlights);
    },
    [opening, currentNode, selectedSquare, handlePieceDrop]
  );

  // ── Navigate ─────────────────────────────────────────────────────────────
  function navigateTo(id) { setCurrentId(id); }

  function goBack() {
    if (currentPath.length <= 1) return;
    setCurrentId(currentPath[currentPath.length - 2]);
  }

  function goToRoot() { setCurrentId('root'); }

  // ── Delete a move (subtree) ───────────────────────────────────────────────
  async function handleDeleteMove(nodeId) {
    if (!opening) return;
    if (!window.confirm('Delete this move and all continuations?')) return;
    const newOpening = cloneOpening(opening);
    deleteSubtree(newOpening.root, nodeId);
    const stillExists = !!findNode(newOpening.root, currentId);
    await saveOpening(newOpening);
    setOpening(newOpening);
    if (!stillExists) setCurrentId('root');
  }

  // ── Delete a whole variant ────────────────────────────────────────────────
  async function handleDeleteVariant(pathIds) {
    if (!opening) return;
    if (!window.confirm('Delete this variant and all its continuations?')) return;
    const deleteNodeId = getVariantDeleteNodeId(opening.root, pathIds);
    if (!deleteNodeId) return;
    const newOpening = cloneOpening(opening);
    deleteSubtree(newOpening.root, deleteNodeId);
    const stillExists = !!findNode(newOpening.root, currentId);
    await saveOpening(newOpening);
    setOpening(newOpening);
    if (!stillExists) setCurrentId('root');
  }

  // ── Variant rename ────────────────────────────────────────────────────────
  function startEditVariantName(leafId, currentName) {
    setEditingVariantLeafId(leafId);
    setEditVariantName(currentName);
  }

  async function commitVariantName(leafId) {
    if (!opening) return;
    const newOpening = cloneOpening(opening);
    setVariantName(newOpening, leafId, editVariantName);
    await saveOpening(newOpening);
    setOpening(newOpening);
    setEditingVariantLeafId(null);
  }

  // ── Navigate to a variant's leaf on the board ────────────────────────────
  function navigateToVariant(path) {
    const leaf = path[path.length - 1];
    setCurrentId(leaf.id);
  }

  // ── Notes ─────────────────────────────────────────────────────────────────
  function handleNotesChange(val) {
    setNotes(val);
    if (notesTimer) clearTimeout(notesTimer);
    const t = setTimeout(async () => {
      if (!opening) return;
      const newOpening = cloneOpening(opening);
      updateNotes(newOpening.root, currentId, val);
      await saveOpening(newOpening);
      setOpening(newOpening);
    }, 600);
    setNotesTimer(t);
  }

  // ── Rename opening ────────────────────────────────────────────────────────
  function startRename() {
    setNameVal(opening.name);
    setEditingName(true);
    setTimeout(() => nameRef.current?.select(), 0);
  }

  async function commitRename() {
    if (!nameVal.trim()) { setEditingName(false); return; }
    const newOpening = cloneOpening(opening);
    newOpening.name = nameVal.trim();
    await saveOpening(newOpening);
    setOpening(newOpening);
    setEditingName(false);
  }

  // ── Toggle Favorite ────────────────────────────────────────────────────────
  async function handleToggleFavorite() {
    if (!opening) return;
    const next = !opening.isFavorite;
    setOpening((prev) => ({ ...prev, isFavorite: next }));
    await patchOpening(opening.id, { isFavorite: next });
  }

  // ── Toggle Public / Private ───────────────────────────────────────────────
  async function handleTogglePublic() {
    if (!opening) return;
    const next = !opening.isPublic;
    setOpening((prev) => ({ ...prev, isPublic: next }));
    await patchOpening(opening.id, { isPublic: next });
    if (next) flash('Opening is now public — anyone with the link can practice it');
    else flash('Opening is now private');
  }

  // ── Delete entire opening ─────────────────────────────────────────────────
  async function handleDeleteOpening() {
    if (!window.confirm(`Delete "${opening.name}" and all its variations? This cannot be undone.`)) return;
    try {
      await deleteOpening(opening.id);
      router.push('/');
    } catch {
      flash('Failed to delete opening.');
    }
  }

  // ── Flash status ──────────────────────────────────────────────────────────
  function flash(msg) {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(''), 1800);
  }

  if (!opening) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>Loading…</span>
      </div>
    );
  }

  const isAtRoot = currentId === 'root';
  const boardColor = opening.color === 'black' ? 'black' : 'white';
  const currentFen = currentNode?.fen || 'start';
  const fenParts = currentFen.split(' ');
  const sideToMove = fenParts[1] === 'b' ? 'Black' : 'White';
  const fullMove = parseInt(fenParts[5] || '1', 10);

  // All variants (root-to-leaf paths)
  const allVariants = getAllVariants(opening.root);
  // Only show variants that have at least one actual move (path length > 1)
  const realVariants = allVariants.filter((p) => p.length > 1);

  return (
    <div className="editor">
      {/* ── Top bar ── */}
      <div className="topbar">
        <div className="topbar-left">
          <Link href="/" className="back-btn">← Repertoire</Link>
          <div className="separator" />
{editingName ? (
            <input
              ref={nameRef}
              className="name-input"
              value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') setEditingName(false);
              }}
            />
          ) : (
            <h1 className="opening-title" onClick={startRename} title="Click to rename">
              {opening.name}
            </h1>
          )}
          <span className={`badge ${opening.color === 'white' ? 'badge-white' : 'badge-black'}`}>
            {opening.color === 'white' ? '♔ White' : '♚ Black'}
          </span>
        </div>
        <div className="topbar-right">
          <button
            className={`btn-favorite ${opening.isFavorite ? 'btn-favorite-active' : ''}`}
            onClick={handleToggleFavorite}
            title={opening.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            {opening.isFavorite ? '★' : '☆'}
          </button>
          <button
            className={`btn-public ${opening.isPublic ? 'btn-public-on' : ''}`}
            onClick={handleTogglePublic}
            title={opening.isPublic ? 'Public — click to make private' : 'Private — click to make public'}
          >
            {opening.isPublic ? '🌐 Public' : '🔒 Private'}
          </button>
          {opening.isPublic && (
            <button
              className="btn-copy-link"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/explore/${opening.id}`);
                flash('Link copied!');
              }}
              title="Copy shareable link"
            >
              Copy Link
            </button>
          )}
          <button className="btn-delete-opening" onClick={handleDeleteOpening} title="Delete this opening">
            🗑 Delete
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="body">
        {/* Left: Board */}
        <div className="board-col">
          <div className="board-wrap">
            {boardReady && (
              <Chessboard
                position={currentFen}
                onPieceDrop={handlePieceDrop}
                onSquareClick={handleSquareClick}
                boardOrientation={boardColor}
                customBoardStyle={{ borderRadius: '3px', boxShadow: '0 12px 40px rgba(0,0,0,0.7)' }}
                customDarkSquareStyle={{ backgroundColor: '#b58863' }}
                customLightSquareStyle={{ backgroundColor: '#f0d9b5' }}
                customSquareStyles={squareHighlights}
                animationDuration={150}
              />
            )}
          </div>

          {/* Board controls */}
          <div className="board-controls">
            <div className="side-info">
              <span className={`dot ${sideToMove === 'White' ? 'dot-white' : 'dot-black'}`} />
              {sideToMove} to move
              {!isAtRoot && <span className="move-count"> · Move {fullMove}</span>}
            </div>
            <div className="control-btns">
              <button className="btn-ghost" onClick={goToRoot} disabled={isAtRoot} title="Reset to start">↺</button>
              <button className="btn-ghost" onClick={goBack} disabled={isAtRoot} title="Go back one move">← Back</button>
            </div>
          </div>

          {statusMsg && <div className="status-flash">{statusMsg}</div>}

          {/* Path breadcrumb */}
          <div className="path-crumb">
            {pathNodes.filter(n => n.san).length === 0 ? (
              <span className="path-empty">Starting position — make a move</span>
            ) : (
              pathNodes.filter(n => n.san).map((node) => {
                const nodeIdx = pathNodes.findIndex(p => p.id === node.id);
                const isWhiteMove = nodeIdx % 2 === 1;
                const mn = Math.ceil(nodeIdx / 2);
                return (
                  <span key={node.id}>
                    {isWhiteMove && <span className="path-num">{mn}.</span>}
                    <button
                      className={`path-btn ${node.id === currentId ? 'path-current' : ''}`}
                      onClick={() => navigateTo(node.id)}
                    >
                      {node.san}
                    </button>
                  </span>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Variants / Move Tree / Notes */}
        <div className="right-col">
          <div className="tabs">
            <button className={`tab ${rightTab === 'variants' ? 'tab-active' : ''}`} onClick={() => setRightTab('variants')}>
              Variants
              {realVariants.length > 0 && <span className="tab-count">{realVariants.length}</span>}
            </button>
            <button className={`tab ${rightTab === 'tree' ? 'tab-active' : ''}`} onClick={() => setRightTab('tree')}>
              Move Tree
            </button>
            <button className={`tab ${rightTab === 'notes' ? 'tab-active' : ''}`} onClick={() => setRightTab('notes')}>
              Notes
              {currentNode?.notes ? <span className="notes-dot" /> : null}
            </button>
          </div>

          {/* ── VARIANTS TAB ── */}
          {rightTab === 'variants' && (
            <div className="panel">
              {/* Next moves at current position */}
              {currentNode && currentNode.children.length > 0 && (
                <div className="section">
                  <div className="section-label">Moves at this position</div>
                  <div className="next-moves">
                    {currentNode.children.map((child) => (
                      <button key={child.id} className="next-move-btn" onClick={() => navigateTo(child.id)}>
                        {child.san}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Variant list */}
              <div className="section">
                <div className="section-label">
                  {realVariants.length === 0 ? 'No variants yet' : `All Variants · ${realVariants.length}`}
                </div>

                {realVariants.length === 0 ? (
                  <div className="empty-variants">
                    <span className="empty-icon">♟</span>
                    <p>Make moves on the board to build your first variant.</p>
                    <p className="empty-hint">Each different continuation at a position creates a new variant.</p>
                  </div>
                ) : (
                  <div className="variant-list">
                    {realVariants.map((path, idx) => {
                      const leaf = path[path.length - 1];
                      const leafId = leaf.id;
                      const variantName = opening.variantNames?.[leafId] || `Variant ${idx + 1}`;
                      const moveSeq = formatVariantMoves(path);
                      const pathIds = path.map((n) => n.id);
                      const isCurrentVariant = currentPath.includes(leafId) || path.some(n => n.id === currentId);

                      return (
                        <div
                          key={leafId}
                          className={`variant-card ${isCurrentVariant ? 'variant-card-active' : ''}`}
                        >
                          <div className="variant-card-top">
                            {editingVariantLeafId === leafId ? (
                              <input
                                autoFocus
                                className="variant-name-input"
                                value={editVariantName}
                                onChange={(e) => setEditVariantName(e.target.value)}
                                onBlur={() => commitVariantName(leafId)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') commitVariantName(leafId);
                                  if (e.key === 'Escape') setEditingVariantLeafId(null);
                                }}
                                placeholder="Variant name…"
                              />
                            ) : (
                              <button
                                className="variant-name"
                                onClick={() => startEditVariantName(leafId, variantName)}
                                title="Click to rename"
                              >
                                {variantName}
                                <span className="edit-icon">✎</span>
                              </button>
                            )}
                          </div>

                          <div
                            className="variant-moves"
                            onClick={() => navigateToVariant(path)}
                            title="Click to navigate to end of this variant"
                          >
                            {moveSeq}
                          </div>

                          <div className="variant-actions">
                            <button
                              className="btn-practice"
                              onClick={() => router.push(`/opening/${opening.id}/practice?path=${pathIds.join(',')}`)}
                            >
                              ▶ Practice
                            </button>
                            <button
                              className="btn-delete-variant"
                              onClick={() => handleDeleteVariant(pathIds)}
                              title="Delete this variant"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {opening.description && (
                <div className="section">
                  <div className="section-label">About</div>
                  <p className="opening-desc">{opening.description}</p>
                </div>
              )}
            </div>
          )}

          {/* ── MOVE TREE TAB ── */}
          {rightTab === 'tree' && (
            <div className="panel">
              {currentNode && currentNode.children.length > 0 && (
                <div className="section">
                  <div className="section-label">Next moves</div>
                  <div className="next-moves">
                    {currentNode.children.map((child) => (
                      <button key={child.id} className="next-move-btn" onClick={() => navigateTo(child.id)}>
                        {child.san}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {currentNode && currentNode.children.length === 0 && !isAtRoot && (
                <div className="section">
                  <div className="line-end">End of line · Make a move to continue</div>
                </div>
              )}

              <div className="section">
                <div className="section-label">Full tree</div>
                <div className="tree-view">
                  <TreeLine
                    node={opening.root} isBlack={false} moveNum={1}
                    currentId={currentId} pathIds={currentPath}
                    onNavigate={navigateTo} onDelete={handleDeleteMove}
                  />
                </div>
              </div>

              {opening.description && (
                <div className="section">
                  <div className="section-label">About</div>
                  <p className="opening-desc">{opening.description}</p>
                </div>
              )}
            </div>
          )}

          {/* ── NOTES TAB ── */}
          {rightTab === 'notes' && (
            <div className="panel">
              <div className="section">
                <div className="section-label">
                  {isAtRoot ? 'Notes (starting position)' : `Notes for ${currentNode?.san}`}
                </div>
                <textarea
                  className="notes-area"
                  value={notes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  placeholder="Add notes for this position — key ideas, tactical motifs, plans…"
                  rows={10}
                />
              </div>

              <div className="section">
                <div className="section-label">Notes in this line</div>
                <div className="notes-list">
                  {pathNodes.filter(n => n.san && n.notes).length === 0 ? (
                    <span className="notes-empty">No notes yet in this line.</span>
                  ) : (
                    pathNodes.filter(n => n.san && n.notes).map((n) => (
                      <div
                        key={n.id}
                        className={`notes-item ${n.id === currentId ? 'notes-item-current' : ''}`}
                        onClick={() => navigateTo(n.id)}
                      >
                        <span className="notes-item-san">{n.san}</span>
                        <span className="notes-item-text">{n.notes}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Styles ── */}
      <style jsx>{`
        .editor {
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
          padding: 0 20px;
          height: 56px;
          border-bottom: 1px solid var(--border);
          background: var(--bg-secondary);
          flex-shrink: 0;
          gap: 12px;
        }

        .topbar-left {
          display: flex;
          align-items: center;
          gap: 12px;
          overflow: hidden;
          flex: 1;
          min-width: 0;
        }

        .topbar-right { flex-shrink: 0; display: flex; align-items: center; gap: 8px; }

        .btn-favorite {
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text-muted);
          padding: 5px 10px;
          font-size: 16px;
          line-height: 1;
          border-radius: 3px;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .btn-favorite:hover { color: var(--accent); border-color: rgba(201,168,76,0.4); }
        .btn-favorite-active { color: var(--accent) !important; border-color: rgba(201,168,76,0.5) !important; background: rgba(201,168,76,0.08) !important; }

        .btn-public {
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text-muted);
          padding: 5px 12px;
          font-family: var(--font-body);
          font-size: 12px;
          border-radius: 3px;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .btn-public:hover { border-color: var(--border-strong); color: var(--text-secondary); }
        .btn-public-on { color: #6dba7c !important; border-color: rgba(109,186,124,0.35) !important; background: rgba(109,186,124,0.07) !important; }

        .btn-copy-link {
          background: transparent;
          border: 1px solid rgba(201,168,76,0.25);
          color: var(--accent);
          padding: 5px 12px;
          font-family: var(--font-body);
          font-size: 12px;
          border-radius: 3px;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .btn-copy-link:hover { background: rgba(201,168,76,0.1); }

        .btn-delete-opening {
          background: transparent;
          border: 1px solid rgba(224,112,112,0.25);
          color: rgba(224,112,112,0.6);
          padding: 5px 12px;
          font-family: var(--font-body);
          font-size: 12px;
          border-radius: 3px;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .btn-delete-opening:hover {
          background: rgba(224,112,112,0.1);
          border-color: rgba(224,112,112,0.5);
          color: #e07070;
        }

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

        .opening-title {
          font-family: var(--font-display);
          font-size: 17px;
          font-weight: 600;
          letter-spacing: -0.02em;
          cursor: pointer;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          transition: color 0.2s;
        }

        .opening-title:hover { color: var(--accent-light); }

        .name-input {
          font-family: var(--font-display);
          font-size: 17px;
          font-weight: 600;
          background: transparent;
          border: none;
          border-bottom: 1px solid var(--accent);
          border-radius: 0;
          padding: 2px 4px;
          color: var(--text-primary);
          outline: none;
          width: 100%;
          max-width: 320px;
        }

        /* Body layout */
        .body {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        /* Board column */
        .board-col {
          width: 420px;
          min-width: 320px;
          flex-shrink: 0;
          padding: 24px 20px;
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          gap: 14px;
          overflow-y: auto;
        }

        .board-wrap { width: 100%; }

        .board-controls {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .side-info {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 13px;
          color: var(--text-secondary);
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .dot-white {
          background: #f0d9b5;
          border: 1px solid rgba(255,255,255,0.3);
          box-shadow: 0 0 6px rgba(240,217,181,0.6);
        }

        .dot-black {
          background: #3a2a1a;
          border: 1px solid #8a6040;
        }

        .move-count { color: var(--text-muted); font-size: 12px; }

        .control-btns { display: flex; gap: 6px; }

        .control-btns .btn-ghost { padding: 6px 12px; font-size: 13px; }

        .control-btns .btn-ghost:disabled { opacity: 0.3; cursor: not-allowed; }

        .status-flash {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px 14px;
          background: rgba(201, 168, 76, 0.1);
          border: 1px solid rgba(201, 168, 76, 0.25);
          border-radius: 3px;
          color: var(--accent-light);
          font-size: 13px;
          font-weight: 600;
          animation: fadeIn 0.15s ease;
        }

        .path-crumb {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 4px;
          padding: 10px 14px;
          line-height: 1.8;
          min-height: 44px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 1px;
        }

        .path-empty { font-size: 12px; color: var(--text-muted); font-style: italic; }

        .path-num {
          font-size: 12px;
          color: var(--text-muted);
          margin-right: 1px;
          font-family: var(--font-mono);
        }

        .path-btn {
          background: none;
          border: none;
          font-family: var(--font-mono);
          font-size: 13px;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 1px 4px;
          border-radius: 2px;
          transition: all 0.15s;
        }

        .path-btn:hover { color: var(--text-primary); background: rgba(255,255,255,0.06); }

        .path-current {
          color: var(--accent-light) !important;
          background: rgba(201, 168, 76, 0.12) !important;
        }

        /* Right column */
        .right-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          overflow: hidden;
        }

        /* Tabs */
        .tabs {
          display: flex;
          border-bottom: 1px solid var(--border);
          background: var(--bg-secondary);
          flex-shrink: 0;
        }

        .tab {
          background: none;
          border: none;
          padding: 14px 20px;
          font-family: var(--font-body);
          font-size: 13px;
          color: var(--text-muted);
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 6px;
          position: relative;
          bottom: -1px;
        }

        .tab:hover { color: var(--text-secondary); }

        .tab-active {
          color: var(--accent-light) !important;
          border-bottom-color: var(--accent) !important;
        }

        .tab-count {
          font-size: 10px;
          background: rgba(201, 168, 76, 0.15);
          color: var(--accent);
          border-radius: 10px;
          padding: 1px 6px;
          font-weight: 700;
          letter-spacing: 0.02em;
        }

        .notes-dot {
          width: 5px;
          height: 5px;
          background: var(--accent);
          border-radius: 50%;
        }

        /* Panel */
        .panel {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .section { display: flex; flex-direction: column; gap: 10px; }

        .section-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-muted);
        }

        /* Next moves */
        .next-moves { display: flex; flex-wrap: wrap; gap: 7px; }

        .next-move-btn {
          background: var(--bg-card);
          border: 1px solid var(--border-strong);
          color: var(--accent-light);
          font-family: var(--font-mono);
          font-size: 14px;
          font-weight: 600;
          padding: 6px 14px;
          cursor: pointer;
          border-radius: 3px;
          transition: all 0.18s;
        }

        .next-move-btn:hover {
          background: rgba(201, 168, 76, 0.12);
          border-color: var(--accent);
          transform: translateY(-1px);
          box-shadow: 0 3px 10px rgba(0,0,0,0.4);
        }

        .line-end {
          font-size: 12px;
          color: var(--text-muted);
          font-style: italic;
          padding: 8px 0;
        }

        /* ── Variants ── */
        .empty-variants {
          background: var(--bg-secondary);
          border: 1px dashed var(--border);
          border-radius: 6px;
          padding: 32px 24px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .empty-icon {
          font-size: 32px;
          color: var(--accent-dim);
          display: block;
          margin-bottom: 4px;
        }

        .empty-variants p {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.55;
        }

        .empty-hint {
          font-size: 12px !important;
          color: var(--text-muted) !important;
        }

        .variant-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .variant-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 5px;
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          transition: border-color 0.2s;
        }

        .variant-card:hover { border-color: var(--border-strong); }

        .variant-card-active {
          border-color: rgba(201, 168, 76, 0.35);
          background: rgba(201, 168, 76, 0.04);
        }

        .variant-card-top { display: flex; align-items: center; gap: 8px; }

        .variant-name {
          background: none;
          border: none;
          font-family: var(--font-display);
          font-size: 14px;
          font-weight: 600;
          color: var(--accent-light);
          cursor: pointer;
          padding: 0;
          display: flex;
          align-items: center;
          gap: 5px;
          transition: color 0.2s;
        }

        .variant-name:hover { color: var(--accent); }

        .edit-icon {
          font-size: 11px;
          color: var(--text-muted);
          opacity: 0;
          transition: opacity 0.15s;
        }

        .variant-name:hover .edit-icon { opacity: 1; }

        .variant-name-input {
          font-family: var(--font-display);
          font-size: 14px;
          font-weight: 600;
          background: var(--bg-input);
          border: 1px solid var(--accent);
          color: var(--accent-light);
          padding: 4px 8px;
          border-radius: 3px;
          outline: none;
          width: 100%;
          max-width: 240px;
        }

        .variant-moves {
          font-family: var(--font-mono);
          font-size: 12px;
          color: var(--text-secondary);
          line-height: 1.6;
          cursor: pointer;
          padding: 6px 10px;
          background: var(--bg-secondary);
          border-radius: 3px;
          transition: background 0.15s;
          word-break: break-word;
        }

        .variant-moves:hover {
          background: rgba(255,255,255,0.04);
          color: var(--text-primary);
        }

        .variant-actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .btn-practice {
          background: var(--accent);
          color: #0a0810;
          border: none;
          padding: 7px 16px;
          font-family: var(--font-body);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.03em;
          cursor: pointer;
          border-radius: 3px;
          transition: all 0.18s;
        }

        .btn-practice:hover {
          background: var(--accent-light);
          transform: translateY(-1px);
          box-shadow: 0 3px 10px rgba(201, 168, 76, 0.3);
        }

        .btn-delete-variant {
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text-muted);
          padding: 7px 14px;
          font-family: var(--font-body);
          font-size: 12px;
          cursor: pointer;
          border-radius: 3px;
          transition: all 0.18s;
        }

        .btn-delete-variant:hover {
          border-color: #e07070;
          color: #e07070;
          background: rgba(224, 112, 112, 0.06);
        }

        /* Tree view */
        .tree-view {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 4px;
          padding: 14px 16px;
          font-family: var(--font-mono);
          font-size: 13px;
          line-height: 2;
          color: var(--text-secondary);
        }

        .tree-empty {
          font-size: 12px;
          color: var(--text-muted);
          font-style: italic;
          font-family: var(--font-body);
        }

        .opening-desc {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.65;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 4px;
          padding: 12px 14px;
        }

        /* Notes */
        .notes-area {
          font-family: var(--font-body);
          font-size: 14px;
          line-height: 1.65;
          resize: vertical;
          min-height: 120px;
        }

        .notes-empty { font-size: 12px; color: var(--text-muted); font-style: italic; }

        .notes-list { display: flex; flex-direction: column; gap: 8px; }

        .notes-item {
          display: flex;
          gap: 10px;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 4px;
          padding: 10px 12px;
          cursor: pointer;
          transition: border-color 0.2s;
        }

        .notes-item:hover { border-color: var(--border-strong); }

        .notes-item-current { border-color: rgba(201, 168, 76, 0.4); }

        .notes-item-san {
          font-family: var(--font-mono);
          font-size: 13px;
          font-weight: 600;
          color: var(--accent);
          flex-shrink: 0;
          min-width: 40px;
        }

        .notes-item-text {
          font-size: 13px;
          color: var(--text-secondary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* ── Responsive / Mobile ── */
        @media (max-width: 768px) {
          .topbar { padding: 0 12px; height: 50px; gap: 8px; }
          .separator { display: none; }
          .back-btn { font-size: 12px; }
          .opening-title { font-size: 15px; }
          .btn-delete-opening { padding: 4px 8px; font-size: 11px; }
          .btn-public { font-size: 11px; padding: 4px 8px; }
          .btn-copy-link { display: none; }
          .badge { display: none; }

          .body { flex-direction: column; overflow: visible; }

          .board-col {
            width: 100%;
            min-width: 0;
            border-right: none;
            border-bottom: 1px solid var(--border);
            padding: 14px 12px;
            gap: 10px;
          }

          .right-col { min-height: 400px; overflow: visible; }

          .board-controls { flex-wrap: wrap; gap: 8px; }
          .control-btns .btn-ghost { padding: 8px 14px; font-size: 14px; }

          .path-crumb { font-size: 12px; }

          .tab { padding: 12px 14px; font-size: 12px; }

          .panel { padding: 14px; }

          .variant-card { padding: 12px; }
          .variant-actions { flex-wrap: wrap; }
        }

        @media (max-width: 480px) {
          .board-col { padding: 10px 8px; }
          .panel { padding: 10px; }
        }
      `}</style>

      <Footer />

      {/* Global tree token styles */}
      <style jsx global>{`
        .move-token {
          display: inline-flex;
          align-items: center;
          font-family: var(--font-mono);
          font-size: 13px;
          color: var(--text-secondary);
          padding: 1px 5px;
          border-radius: 2px;
          cursor: pointer;
          transition: all 0.15s;
          user-select: none;
        }

        .move-token:hover { color: var(--text-primary); background: rgba(255,255,255,0.07); }

        .move-token.on-path { color: var(--text-primary); }

        .move-token.current {
          background: rgba(201, 168, 76, 0.18);
          color: var(--accent-light);
          font-weight: 600;
        }

        .move-num {
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--text-muted);
          margin-right: 1px;
        }

        .variation-block { font-size: 12px; color: var(--text-muted); }

        .variation-block .move-token { font-size: 12px; }

        .tree-var-sep { color: var(--text-muted); font-size: 12px; margin: 0 2px; }

        .move-del {
          font-size: 11px;
          color: #e07070;
          cursor: pointer;
          padding: 0 2px;
          margin-left: 2px;
          border-radius: 2px;
          line-height: 1;
          transition: background 0.15s;
        }

        .move-del:hover { background: rgba(224, 112, 112, 0.15); }
      `}</style>
    </div>
  );
}
