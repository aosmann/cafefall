# cafefall

Cafefall: a café quiz for the EduGames portal. The chef is a cat; hungry animals walk up and order toast, pizza, cake and more. Tap the dish on the menu shelf and answer its question: right, it's cooked and served with coins and a tip; wrong, it burns and a new question comes up for the same dish. Keep customers happy before their patience runs out.

Play: https://aosmann.github.io/cafefall/

- **Easy:** one customer at a time, one dish each, slow patience.
- **Medium:** two or three customers waiting; you choose whom to serve.
- **Hard:** a moving queue, faster patience, two-dish orders (two questions).
- 3 right in a row doubles tips, 5 in a row triples them. Score = coins.
- Answer with the big buttons or keys 1 · 2 · 3. Pause with Esc / P.

No build step, works offline after the first visit (service worker), installable on iPhone.
`questions.js` and `flags/` are the shared EduGames bank, byte-identical to the other games. Never edit them here.

## EduGames contract (v1)

`game.json` settings: `level` (topic default) and `mode`: `o10` / `o20` orders, `t60` / `t90` seconds (default `o10`), or Custom: `o<n>` (3–50 orders) / `t<n>` (20–600 s).

```
?topic=<id>&level=1-3&mode=o10&regions=eu,as&lang=ro&lock=1
```

With `topic` in the address the run starts at once with no menu and no in-game hint. Posts `edu-ready`, `edu-progress` after every answer (`score`, `right`, `asked`, `last`, plus `served`, `coins`) and `edu-result` at the end; every result is also appended to `localStorage['edu-results']` (last 200). Extra result fields: `served`, `coins`, `orders`, `walkouts`, `mode`, `cause` (`full` | `time` | `quit`), `timeUsed`.

Café words in Romanian live in `game.js` (so `questions.js` stays identical).

## Credits

- Animal heads: **Kenney – Animal Pack Redux**, CC0 (https://kenney.nl/assets/animal-pack-redux). Bodies, chef cat, food, café and sounds are original to this project.
- Country, capital and continent data: [mledoze/countries](https://github.com/mledoze/countries), Open Database License (ODbL 1.0).
- Flags: [flag-icons](https://github.com/lipis/flag-icons), MIT licence, compressed into `flags/`.
