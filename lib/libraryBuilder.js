import { getLibraryDefinition } from './library';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/**
 * Create a deterministic node ID from the opening ID and the canonical
 * SAN move path from root to this node.
 * Deterministic IDs are critical so that practice URLs stay stable
 * even though the tree is rebuilt on every page load.
 */
function makeNodeId(openingId, sanPath) {
  const segment = sanPath
    .map((s) => s.replace(/[^a-zA-Z0-9]/g, ''))
    .join('_');
  return `lib_${openingId}_${segment}`;
}

/**
 * Build a full opening tree (with FENs) from a library definition.
 * Uses chess.js to validate moves and compute positions.
 * Returns an opening object in the same shape as user openings from Firestore.
 *
 * @param {string} id - The library opening ID (e.g. 'ruy-lopez')
 * @returns {Promise<object|null>} Opening object or null if id not found
 */
export async function buildLibraryOpening(id) {
  const def = getLibraryDefinition(id);
  if (!def) return null;

  const { Chess } = await import('chess.js');

  const root = {
    id: 'root',
    san: null,
    fen: STARTING_FEN,
    notes: '',
    children: [],
  };

  const variantNames = {};

  for (const variant of def.variants) {
    const chess = new Chess();
    let current = root;
    const sanPath = []; // canonical SAN path from root to current node
    let lastNode = root;

    for (const san of variant.moves) {
      let result;
      try {
        result = chess.move(san);
      } catch {
        console.warn(`[Library] Invalid move "${san}" in variant "${variant.name}" of "${def.name}"`);
        break;
      }
      if (!result) break;

      // chess.js gives us the canonical SAN (handles disambiguation, etc.)
      sanPath.push(result.san);

      // Reuse existing node if another variant already created this position
      let child = current.children.find((c) => c.san === result.san);
      if (!child) {
        child = {
          id: makeNodeId(def.id, sanPath),
          san: result.san,
          fen: chess.fen(),
          notes: '',
          children: [],
        };
        current.children.push(child);
      }

      lastNode = child;
      current = child;
    }

    // Tag the leaf node with this variant's display name
    if (lastNode !== root) {
      variantNames[lastNode.id] = variant.name;
    }
  }

  return {
    id: def.id,
    name: def.name,
    subtitle: def.subtitle || '',
    color: def.color,
    eco: def.eco || '',
    description: def.description || '',
    variantNames,
    root,
    isLibrary: true,
  };
}
