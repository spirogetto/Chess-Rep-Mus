// ─── Static Library Definitions ───────────────────────────────────────────
// Each opening is defined as a list of named variants, where each variant
// is a flat array of SAN moves from the starting position.
// FENs are computed at runtime by libraryBuilder.js using chess.js.

export const LIBRARY_DEFINITIONS = [
  {
    id: 'ruy-lopez',
    name: 'Ruy Lopez',
    subtitle: 'Spanish Opening',
    color: 'white',
    eco: 'C60–C99',
    description:
      'One of the oldest and most revered openings. White develops the bishop to b5, pressuring the knight that defends the e5 pawn. Leads to rich strategic battles.',
    variants: [
      {
        name: 'Morphy Defense — Closed',
        moves: ['e4','e5','Nf3','Nc6','Bb5','a6','Ba4','Nf6','O-O','Be7','Re1','b5','Bb3','d6'],
      },
      {
        name: 'Morphy Defense — Open',
        moves: ['e4','e5','Nf3','Nc6','Bb5','a6','Ba4','Nf6','O-O','Nxe4'],
      },
      {
        name: 'Berlin Defense',
        moves: ['e4','e5','Nf3','Nc6','Bb5','Nf6','O-O','Nxe4'],
      },
      {
        name: 'Schliemann Defense',
        moves: ['e4','e5','Nf3','Nc6','Bb5','f5'],
      },
    ],
  },

  {
    id: 'sicilian-defense',
    name: 'Sicilian Defense',
    subtitle: '',
    color: 'black',
    eco: 'B20–B99',
    description:
      'The most popular response to 1.e4. Black fights for the center asymmetrically with 1...c5, leading to unbalanced, combative positions with chances for both sides.',
    variants: [
      {
        name: 'Najdorf Variation',
        moves: ['e4','c5','Nf3','d6','d4','cxd4','Nxd4','Nf6','Nc3','a6'],
      },
      {
        name: 'Dragon Variation',
        moves: ['e4','c5','Nf3','d6','d4','cxd4','Nxd4','Nf6','Nc3','g6'],
      },
      {
        name: 'Classical Variation',
        moves: ['e4','c5','Nf3','d6','d4','cxd4','Nxd4','Nf6','Nc3','Nc6'],
      },
      {
        name: 'Sveshnikov Variation',
        moves: ['e4','c5','Nf3','Nc6','d4','cxd4','Nxd4','Nf6','Nc3','e5'],
      },
      {
        name: 'Alapin Variation',
        moves: ['e4','c5','c3'],
      },
    ],
  },

  {
    id: 'queens-gambit',
    name: "Queen's Gambit",
    subtitle: '',
    color: 'white',
    eco: 'D06–D69',
    description:
      "White offers a pawn on c4 to gain central control. One of the most solid and classical openings. Can lead to sharp or positional play depending on Black's response.",
    variants: [
      {
        name: "Queen's Gambit Accepted",
        moves: ['d4','d5','c4','dxc4'],
      },
      {
        name: 'QGD — Orthodox Defense',
        moves: ['d4','d5','c4','e6','Nc3','Nf6','Bg5','Be7'],
      },
      {
        name: 'QGD — Tartakower Variation',
        moves: ['d4','d5','c4','e6','Nc3','Nf6','Bg5','b6'],
      },
      {
        name: 'Slav Defense',
        moves: ['d4','d5','c4','c6'],
      },
      {
        name: 'Semi-Slav Defense',
        moves: ['d4','d5','c4','e6','Nc3','c6'],
      },
    ],
  },

  {
    id: 'kings-indian-defense',
    name: "King's Indian Defense",
    subtitle: '',
    color: 'black',
    eco: 'E60–E99',
    description:
      'Black allows White to build a broad center, then counterattacks dynamically. A favorite of Kasparov and Fischer, known for wild tactical battles.',
    variants: [
      {
        name: 'Classical Variation',
        moves: ['d4','Nf6','c4','g6','Nc3','Bg7','e4','d6','Nf3','O-O','Be2','e5'],
      },
      {
        name: 'Sämisch Variation',
        moves: ['d4','Nf6','c4','g6','Nc3','Bg7','e4','d6','f3'],
      },
      {
        name: 'Four Pawns Attack',
        moves: ['d4','Nf6','c4','g6','Nc3','Bg7','e4','d6','f4'],
      },
      {
        name: 'Fianchetto Variation',
        moves: ['d4','Nf6','c4','g6','Nc3','Bg7','e4','d6','g3'],
      },
    ],
  },

  {
    id: 'french-defense',
    name: 'French Defense',
    subtitle: '',
    color: 'black',
    eco: 'C00–C19',
    description:
      'Black builds a solid but slightly cramped position with 1...e6. Rich in pawn structure complexity. Leads to strategic battles where Black fights for counterplay.',
    variants: [
      {
        name: 'Advance Variation',
        moves: ['e4','e6','d4','d5','e5'],
      },
      {
        name: 'Exchange Variation',
        moves: ['e4','e6','d4','d5','exd5','exd5'],
      },
      {
        name: 'Tarrasch Variation',
        moves: ['e4','e6','d4','d5','Nd2'],
      },
      {
        name: 'Winawer Variation',
        moves: ['e4','e6','d4','d5','Nc3','Bb4'],
      },
      {
        name: 'Classical Variation',
        moves: ['e4','e6','d4','d5','Nc3','Nf6'],
      },
    ],
  },

  {
    id: 'caro-kann-defense',
    name: 'Caro-Kann Defense',
    subtitle: '',
    color: 'black',
    eco: 'B10–B19',
    description:
      'A solid defense to 1.e4. Black supports the d5 pawn with c6, aiming for a stable structure without the weaknesses common in the French Defense.',
    variants: [
      {
        name: 'Advance Variation',
        moves: ['e4','c6','d4','d5','e5'],
      },
      {
        name: 'Classical Variation',
        moves: ['e4','c6','d4','d5','Nc3','dxe4','Nxe4','Bf5'],
      },
      {
        name: 'Exchange Variation',
        moves: ['e4','c6','d4','d5','exd5','cxd5'],
      },
      {
        name: 'Panov Attack',
        moves: ['e4','c6','d4','d5','exd5','cxd5','c4'],
      },
      {
        name: 'Fantasy Variation',
        moves: ['e4','c6','d4','d5','f3'],
      },
    ],
  },

  {
    id: 'english-opening',
    name: 'English Opening',
    subtitle: '',
    color: 'white',
    eco: 'A10–A39',
    description:
      'White opens with 1.c4, controlling d5 without immediately occupying the center with pawns. A highly flexible opening that often transposes to other systems.',
    variants: [
      {
        name: 'Reversed Sicilian',
        moves: ['c4','e5'],
      },
      {
        name: 'Symmetrical Variation',
        moves: ['c4','c5'],
      },
      {
        name: "King's Indian Setup",
        moves: ['c4','Nf6','Nc3','g6'],
      },
      {
        name: 'Botvinnik System',
        moves: ['c4','Nf6','Nc3','e6','g3','d5','Bg2'],
      },
    ],
  },

  {
    id: 'scandinavian-defense',
    name: 'Scandinavian Defense',
    subtitle: 'Center Counter',
    color: 'black',
    eco: 'B01',
    description:
      'Black immediately challenges the e4 pawn with 1...d5. One of the oldest openings in recorded chess history. Simple to learn, with clear plans for Black.',
    variants: [
      {
        name: 'Main Line — Qa5',
        moves: ['e4','d5','exd5','Qxd5','Nc3','Qa5'],
      },
      {
        name: 'Modern Variation',
        moves: ['e4','d5','exd5','Nf6'],
      },
      {
        name: 'Portuguese Gambit',
        moves: ['e4','d5','exd5','Nf6','d4','Bg4'],
      },
    ],
  },

  {
    id: 'nimzo-indian-defense',
    name: 'Nimzo-Indian Defense',
    subtitle: '',
    color: 'black',
    eco: 'E20–E59',
    description:
      'Black pins the c3 knight with Bb4, preventing easy central expansion. One of the most respected defenses against 1.d4, offering Black dynamic counterplay.',
    variants: [
      {
        name: 'Classical Variation',
        moves: ['d4','Nf6','c4','e6','Nc3','Bb4','Qc2'],
      },
      {
        name: 'Rubinstein Variation',
        moves: ['d4','Nf6','c4','e6','Nc3','Bb4','e3'],
      },
      {
        name: 'Leningrad Variation',
        moves: ['d4','Nf6','c4','e6','Nc3','Bb4','Bg5'],
      },
      {
        name: 'Sämisch Variation',
        moves: ['d4','Nf6','c4','e6','Nc3','Bb4','a3'],
      },
    ],
  },

  {
    id: 'italian-game',
    name: 'Italian Game',
    subtitle: 'Giuoco Piano',
    color: 'white',
    eco: 'C50–C59',
    description:
      "White develops quickly to c4, targeting the f7 pawn. One of the oldest and most classical openings. Ranges from quiet positional play to wild gambits.",
    variants: [
      {
        name: 'Giuoco Piano',
        moves: ['e4','e5','Nf3','Nc6','Bc4','Bc5','c3'],
      },
      {
        name: 'Evans Gambit',
        moves: ['e4','e5','Nf3','Nc6','Bc4','Bc5','b4'],
      },
      {
        name: 'Two Knights — Fried Liver Attack',
        moves: ['e4','e5','Nf3','Nc6','Bc4','Nf6','Ng5','d5','exd5','Nxd5','Nxf7'],
      },
      {
        name: 'Italian Classical',
        moves: ['e4','e5','Nf3','Nc6','Bc4','Bc5','d3'],
      },
    ],
  },
];

/** Find a library definition by its id. */
export function getLibraryDefinition(id) {
  return LIBRARY_DEFINITIONS.find((d) => d.id === id) ?? null;
}
