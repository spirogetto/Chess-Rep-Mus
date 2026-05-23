# ♟ Opening Lab — Chess Repertoire Builder

Build and study chess openings with move trees and variations.

## Features

- **Create openings** for White or Black
- **Interactive chess board** — drag & drop pieces to enter moves
- **Automatic variation trees** — if a position already exists, navigates to it; otherwise creates a new branch
- **Navigate any line** — click any move in the tree to jump to that position
- **Delete subtrees** — hover a move in the tree and click × to remove it and all continuations
- **Notes per move** — add positional notes, plans, or tactical motifs to any position
- **Rename openings** — click the opening title to rename
- **Persistent storage** — everything saved in localStorage

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploying to Vercel

```bash
npm install -g vercel
vercel
```

Or push to GitHub and import the repo at [vercel.com/new](https://vercel.com/new).

No environment variables or backend required — the app runs entirely client-side with localStorage.

## Tech Stack

- **Next.js 14** (App Router)
- **react-chessboard** — interactive board UI
- **chess.js** — move validation & FEN management
- **localStorage** — client-side persistence
- **Playfair Display + Lora** — Google Fonts

## Usage

1. Click **+ New Opening** on the home page
2. Name your opening, choose White or Black
3. On the editor, drag pieces on the board to enter moves
4. Each new move is automatically added to the tree
5. Playing a move that already exists navigates to the existing branch
6. Click any move in the **Full Tree** to jump to that position
7. Add analysis notes in the **Notes** tab
8. Hover a move and click × to delete that subtree
