import { db } from './firebase';
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';

const COL = 'openings';
const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// Convert Firestore Timestamp → ISO string (safe for non-Timestamp values too)
function toIso(ts) {
  if (!ts) return new Date().toISOString();
  if (typeof ts.toDate === 'function') return ts.toDate().toISOString();
  return ts;
}

// Strip undefined values recursively (Firestore rejects undefined)
function clean(obj) {
  return JSON.parse(JSON.stringify(obj, (_, v) => (v === undefined ? null : v)));
}

// ─── CRUD ─────────────────────────────────────────────────────────────────

/** Fetch all openings for a user, sorted newest-first. */
export async function getOpenings(userId) {
  const q = query(
    collection(db, COL),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...d.data(), id: d.id, createdAt: toIso(d.data().createdAt) }));
}

/** Fetch a single opening by Firestore document ID. */
export async function getOpening(id) {
  const snap = await getDoc(doc(db, COL, id));
  if (!snap.exists()) return null;
  const data = snap.data();
  return { ...data, id: snap.id, createdAt: toIso(data.createdAt) };
}

/** Fetch all public openings across all users, sorted newest-first. */
export async function getPublicOpenings() {
  const q = query(
    collection(db, COL),
    where('isPublic', '==', true),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...d.data(), id: d.id, createdAt: toIso(d.data().createdAt) }));
}

/** Partially update an opening document (e.g. toggle isFavorite or isPublic). */
export async function patchOpening(id, patch) {
  await updateDoc(doc(db, COL, id), patch);
}

/** Create a new opening and return it (with its assigned Firestore id). */
export async function createOpening(user, { name, color, description = '' }) {
  const userId = typeof user === 'string' ? user : user.uid;
  const payload = {
    userId,
    name,
    color,           // 'white' | 'black'
    description,
    variantNames: {}, // leafNodeId → custom variant name
    isFavorite: false,
    isPublic: false,
    createdBy: {
      uid: userId,
      displayName: (typeof user === 'object' && (user.displayName || user.email)) || 'Anonymous',
      photoURL: (typeof user === 'object' && user.photoURL) || null,
    },
    createdAt: serverTimestamp(),
    root: {
      id: 'root',
      san: null,
      fen: STARTING_FEN,
      notes: '',
      children: [],
    },
  };
  const ref = await addDoc(collection(db, COL), payload);
  return { ...payload, id: ref.id, createdAt: new Date().toISOString() };
}

/** Overwrite (merge) an opening document. */
export async function saveOpening(opening) {
  const { id, ...data } = opening;
  await setDoc(doc(db, COL, id), clean(data));
}

/** Delete an opening document. */
export async function deleteOpening(id) {
  await deleteDoc(doc(db, COL, id));
}

// ─── Tree helpers (all synchronous — work on in-memory data) ──────────────

/** Deep-clone an opening so mutations are safe. */
export function cloneOpening(opening) {
  return JSON.parse(JSON.stringify(opening));
}

/** Find a node by id in a tree rooted at `root`. */
export function findNode(root, id) {
  if (root.id === id) return root;
  for (const child of root.children) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
}

/** Return array of node ids from root → targetId, or null if not found. */
export function findPath(root, targetId, acc = []) {
  const path = [...acc, root.id];
  if (root.id === targetId) return path;
  for (const child of root.children) {
    const result = findPath(child, targetId, path);
    if (result) return result;
  }
  return null;
}

/**
 * Add a new child move to the node identified by `parentId`.
 * If the move (by SAN) already exists, returns that existing child's id.
 * Otherwise creates a new node and returns its id.
 */
export function addMoveToTree(root, parentId, { san, fen }) {
  const parent = findNode(root, parentId);
  if (!parent) return null;

  const existing = parent.children.find((c) => c.san === san);
  if (existing) return existing.id;

  const node = {
    id: `node_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    san,
    fen,
    notes: '',
    children: [],
  };
  parent.children.push(node);
  return node.id;
}

/**
 * Delete the subtree rooted at `nodeId` (cannot delete root).
 * Mutates `root` in place; returns true if deleted.
 */
export function deleteSubtree(root, nodeId) {
  for (let i = 0; i < root.children.length; i++) {
    if (root.children[i].id === nodeId) {
      root.children.splice(i, 1);
      return true;
    }
    if (deleteSubtree(root.children[i], nodeId)) return true;
  }
  return false;
}

/** Update notes on a node. Mutates root in place. */
export function updateNotes(root, nodeId, notes) {
  const node = findNode(root, nodeId);
  if (node) node.notes = notes;
}

/** Count total moves in the tree (excluding root). */
export function countMoves(root) {
  let count = 0;
  for (const child of root.children) {
    count += 1 + countMoves(child);
  }
  return count;
}

/** Get the deepest line length from a node. */
export function maxDepth(root) {
  if (root.children.length === 0) return 0;
  return 1 + Math.max(...root.children.map(maxDepth));
}

// ─── Variant helpers ───────────────────────────────────────────────────────

/**
 * Get all root-to-leaf paths through the tree.
 * Each path is an array of node objects starting from `root`.
 */
export function getAllVariants(root) {
  if (root.children.length === 0) return [[root]];
  const results = [];
  for (const child of root.children) {
    for (const subPath of getAllVariants(child)) {
      results.push([root, ...subPath]);
    }
  }
  return results;
}

/**
 * Return the node ID to delete in order to remove a variant without
 * affecting other variants. Finds the first branching node in the path.
 */
export function getVariantDeleteNodeId(root, pathIds) {
  for (let i = 1; i < pathIds.length; i++) {
    const parent = findNode(root, pathIds[i - 1]);
    if (parent && parent.children.length > 1) return pathIds[i];
  }
  return pathIds.length > 1 ? pathIds[1] : null;
}

/**
 * Save a custom display name for a variant (keyed by leaf node ID).
 * Mutates opening.variantNames. Call saveOpening() after.
 */
export function setVariantName(opening, leafNodeId, name) {
  if (!opening.variantNames) opening.variantNames = {};
  if (name && name.trim()) {
    opening.variantNames[leafNodeId] = name.trim();
  } else {
    delete opening.variantNames[leafNodeId];
  }
}
