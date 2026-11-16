# cafefall

Cafefall: a 3D café quiz for the EduGames portal. Customers walk up to the counter and order; every dish is a question. Right: the chef cooks it and serves it, with coins and a tip. Wrong: it burns on the stove and a new question comes up for the same dish. Keep customers happy before their patience runs out.

Play: https://aosmann.github.io/cafefall/

- **Easy:** one customer at a time, one dish each, slow patience.
- **Medium:** two or three customers waiting; you choose whom to serve (tap their order ticket, or tap them).
- **Hard:** a moving queue, faster patience, two-dish orders (two questions).
- 3 right in a row doubles tips, 5 in a row triples them. Score = coins.
- Every run has its own menu mixed from six kinds of food: fast food, Asian, breakfast, healthy, mains, desserts and drinks (36 dishes; 6 on Easy, 9 on Medium, 12 on Hard).
- Answer with the buttons or keys 1 · 2 · 3 (with no question open, 1 · 2 · 3 picks an order). Pause with Esc / P.

No build step. three.js r170 is kept locally in `lib/`; everything works offline after the first visit (service worker) and installs on iPhone.
`questions.js` and `flags/` are the shared EduGames bank, byte-identical to the other games. Never edit them here.

## EduGames contract (v1)

`game.json` settings: `level` (topic default) and `mode`: `o10` / `o20` orders, `t60` / `t90` seconds (default `o10`), or Custom: `o<n>` (3–50 orders) / `t<n>` (20–600 s).

```
?topic=<id>&level=1-3&mode=o10&regions=eu,as&lang=ro&lock=1
```

With `topic` in the address the run starts at once with no menu and no in-game hint. Posts `edu-ready`, `edu-progress` after every answer (`score`, `right`, `asked`, `last`, plus `served`, `coins`) and `edu-result` at the end; every result is also appended to `localStorage['edu-results']` (last 200). Extra result fields: `served`, `coins`, `orders`, `walkouts`, `mode`, `cause` (`full` | `time` | `quit`), `timeUsed`.

Café words in Romanian live in `game.js` (so `questions.js` stays identical).

## Credits

- Food: **Kenney – Food Kit 2.0**, CC0 (https://kenney.nl/assets/food-kit), 39 models in `models/food/`.
- 3D models: **KayKit – Restaurant Bits** and **KayKit – Character Pack: Adventurers** by Kay Lousberg, CC0 (https://kaylousberg.itch.io). Characters were trimmed (weapons and unused animations removed). Licence files are in `models/`.
- 3D engine: [three.js](https://threejs.org) r170, MIT licence.
- Country, capital and continent data: [mledoze/countries](https://github.com/mledoze/countries), Open Database License (ODbL 1.0).
- Flags: [flag-icons](https://github.com/lipis/flag-icons), MIT licence, compressed into `flags/`.
- Chef's hat, effects, interface and sounds are original to this project.
