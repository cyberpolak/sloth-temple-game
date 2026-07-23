/* SHA'UR'NA — carte du temple scellé */
(function (ST3) {
  'use strict';

  /**
   * Cellules :
   *  0 = vide
   *  1 = pierre du temple
   *  2 = grille Marshall (noir/or)
   *  3 = baffle Orange
   *  4 = bande de flamme verte
   *  5 = mur Ampeg (vert olive)
   *  6 = autel fuzz
   *  7 = mur de câbles / LED
   *  8 = graffiti SOMNUL (wayfinding)
   *  9 = Marshall délabré (mousse / grille déchirée)
   * 10 = Orange délabré
   * 11 = Ampeg délabré
   * 12 = Marshall wrecked (court-circuit / brûlé)
   * 13 = Orange wrecked
   * 14 = Ampeg wrecked
   */

  const W = 28;
  const H = 28;

  // Légende: . vide  # pierre  M marshall  O orange  F flamme  A ampeg  Z fuzz  C câbles  G graffiti
  // Nef centrale, 4 chambres de sceaux aux coins, couloirs en croix.
  // Variété cosmétique — seuls des murs solides (#) sont recolorés (navigabilité intacte).
  const ASCII2 = [
    '############################', // 0
    '#......#..........#........#', // 1  NW chamber access
    '#.#ZZ#.#.########.#.AAAAA#.#', // 2  fuzz NW wall, ampeg NE wall
    '#.#..#.#.#......#.#.#....#.#', // 3  seals at (3,3) and (24,3)
    '#.#..#...#.####.#...####.#.#', // 4
    '#.#..#####.#..#.#####....#.#', // 5
    '#.G........#MM#..........G.#', // 6  graffiti NW(2,6) / NE(25,6)
    '#.##########..##########.#.#', // 7
    '#..........................#', // 8  east-west corridor
    '#####.####.CCCC.####.#######', // 9  câbles sur pilier central E-W
    '#...#.#..........#.#.......#', // 10
    '#.#.#.#.########.#.#.#####.#', // 11
    '#.#.....#......#.....#...#.#', // 12
    '#.#####.#..##..#.#####.#.#.#', // 13
    '#.....#....##....#.....#...#', // 14  SPAWN ROW (center open)
    '#.#.#.######FF######.#.###.#', // 15
    '#.#.#......##......#.#.#...#', // 16
    '#.#.######.##.######.#.#.#.#', // 17
    '#.#.#....#....#....#.#...#.#', // 18
    '#...#.##.#OOOO#.##.#.#####.#', // 19
    '#####.#..#....#..#.#########', // 20
    '#.....#..######..#.........#', // 21  south corridor
    '#.G##.#..........#.######G.#', // 22  graffiti SW(2,22) / SE(25,22)
    '#.#...############...#...#.#', // 23
    '#.#.##............##.#.#.#.#', // 24  seals (3,24) (24,24)
    '#.C.#..##########..#.O.#.#.#', // 25  câble SW, orange SE (murs)
    '#...#..............#...#...#', // 26
    '############################', // 27
  ];

  // Remplacements cosmétiques : pierre → texture (appliqués seulement si cellule === 1)
  const COSMETIC_PATCHES = [
    // Couloir E-W nord : Marshall / Orange
    { x: 5, y: 7, id: 2 },
    { x: 6, y: 7, id: 2 },
    { x: 7, y: 7, id: 2 },
    // Graffiti près du mur Marshall (wall of fame)
    { x: 4, y: 7, id: 8 },
    { x: 8, y: 7, id: 8 },
    { x: 20, y: 7, id: 3 },
    { x: 21, y: 7, id: 3 },
    { x: 22, y: 7, id: 3 },
    // Couloir E-W sud : Ampeg
    { x: 6, y: 20, id: 5 },
    { x: 21, y: 20, id: 5 },
    { x: 22, y: 20, id: 5 },
    // Couloir N-S : flamme / câbles sur parois
    { x: 13, y: 11, id: 4 },
    { x: 15, y: 11, id: 4 },
    { x: 15, y: 17, id: 7 },
    { x: 13, y: 5, id: 7 },
    { x: 15, y: 5, id: 7 },
    // Chambre NW — Marshall / fuzz
    { x: 2, y: 2, id: 2 },
    { x: 5, y: 2, id: 2 },
    { x: 2, y: 5, id: 6 },
    { x: 5, y: 5, id: 6 },
    // Chambre NE — Orange / câbles
    { x: 25, y: 2, id: 3 },
    { x: 20, y: 3, id: 7 },
    { x: 25, y: 5, id: 7 },
    // Chambre SW — flamme + fuzz
    { x: 2, y: 22, id: 6 },
    { x: 5, y: 23, id: 4 },
    { x: 2, y: 25, id: 6 },
    // Chambre SE — Ampeg / Marshall
    { x: 24, y: 22, id: 2 },
    { x: 25, y: 23, id: 5 },
    { x: 22, y: 25, id: 5 },
    // Nef — accents autour du spawn
    { x: 9, y: 9, id: 5 },
    { x: 18, y: 9, id: 5 },
    { x: 18, y: 13, id: 3 },
    { x: 11, y: 17, id: 6 },
    { x: 16, y: 17, id: 6 },
    { x: 9, y: 4, id: 2 },
    { x: 16, y: 4, id: 3 },
    // Approches sceaux — graffiti supplémentaires (murs hors chemins carve)
    { x: 2, y: 4, id: 8 },
    { x: 25, y: 4, id: 8 },
    { x: 17, y: 20, id: 8 },
    { x: 6, y: 22, id: 8 },
  ];

  const CHAR_TO_ID = {
    '.': 0,
    '#': 1,
    M: 2,
    O: 3,
    F: 4,
    A: 5,
    Z: 6,
    C: 7,
    G: 8,
  };

  const DECOR_IDS = { 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: true };

  const grid = [];
  for (let y = 0; y < H; y++) {
    const row = [];
    const line = ASCII2[y] || '#'.repeat(W);
    for (let x = 0; x < W; x++) {
      const ch = line[x] || '#';
      row.push(CHAR_TO_ID[ch] != null ? CHAR_TO_ID[ch] : 1);
    }
    grid.push(row);
  }

  // Carve guaranteed paths to seal chambers (safety)
  function carve(x0, y0, x1, y1) {
    let x = x0;
    let y = y0;
    while (x !== x1 || y !== y1) {
      if (grid[y] && grid[y][x] !== undefined) {
        // keep decorative walls; only carve solid stone
        if (grid[y][x] === 1) grid[y][x] = 0;
        else if (grid[y][x] > 0 && !DECOR_IDS[grid[y][x]]) grid[y][x] = 0;
      }
      if (x < x1) x++;
      else if (x > x1) x--;
      else if (y < y1) y++;
      else if (y > y1) y--;
    }
    if (grid[y1][x1] === 1) grid[y1][x1] = 0;
  }

  // Ensure seal cells + paths from center
  [[3, 3], [24, 3], [3, 24], [24, 24], [14, 14]].forEach(function (p) {
    grid[p[1]][p[0]] = 0;
  });
  carve(14, 14, 14, 8);
  carve(14, 8, 3, 8);
  carve(3, 8, 3, 3);
  carve(14, 8, 24, 8);
  carve(24, 8, 24, 3);
  carve(14, 14, 14, 21);
  carve(14, 21, 3, 21);
  carve(3, 21, 3, 24);
  carve(14, 21, 24, 21);
  carve(24, 21, 24, 24);

  // Appliquer patches cosmétiques (pierre → texture) sans toucher au vide
  for (let i = 0; i < COSMETIC_PATCHES.length; i++) {
    const p = COSMETIC_PATCHES[i];
    if (grid[p.y] && grid[p.y][p.x] === 1) {
      grid[p.y][p.x] = p.id;
    }
  }

  // Keep outer walls (pierre — silhouette temple)
  for (let x = 0; x < W; x++) {
    grid[0][x] = 1;
    grid[H - 1][x] = 1;
  }
  for (let y = 0; y < H; y++) {
    grid[y][0] = 1;
    grid[y][W - 1] = 1;
  }

  const AMP_IDS = { 2: true, 3: true, 5: true, 9: true, 10: true, 11: true, 12: true, 13: true, 14: true };
  const WRECKED_IDS = { 12: true, 13: true, 14: true };
  const BRAND_FRESH = [2, 3, 5];
  const BRAND_DECAYED = [9, 10, 11];
  const BRAND_WRECKED = [12, 13, 14];

  function cellHash(x, y) {
    let n = (x * 374761393 + y * 668265263) >>> 0;
    n = (n ^ (n >>> 13)) >>> 0;
    return (n % 10000) / 10000;
  }

  function isOuter(x, y) {
    return x === 0 || y === 0 || x === W - 1 || y === H - 1;
  }

  function bordersEmpty(x, y) {
    return (
      (grid[y][x - 1] === 0) ||
      (grid[y][x + 1] === 0) ||
      (grid[y - 1] && grid[y - 1][x] === 0) ||
      (grid[y + 1] && grid[y + 1][x] === 0)
    );
  }

  function ampIdForBrand(brandIdx, x, y) {
    const h = cellHash(x, y);
    // ~8% wrecked (sparks), ~20% decayed, rest fresh
    if (h < 0.08) return BRAND_WRECKED[brandIdx];
    if (h < 0.28) return BRAND_DECAYED[brandIdx];
    return BRAND_FRESH[brandIdx];
  }

  /** Post-pass : ~70% des solides intérieurs → baffles (runs de marque + pierre isolée). */
  function ampifyInterior() {
    let interiorSolids = 0;
    let ampCount = 0;
    const candidates = [];
    const corridor = [];

    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const id = grid[y][x];
        if (id <= 0) continue;
        interiorSolids++;
        if (AMP_IDS[id]) ampCount++;
        if (id === 1) {
          candidates.push({ x: x, y: y });
          if (bordersEmpty(x, y)) corridor.push({ x: x, y: y });
        }
      }
    }

    const targetAmp = Math.round(interiorSolids * 0.7);
    let need = Math.max(0, targetAmp - ampCount);
    if (need === 0 || !candidates.length) return;

    const visited = {};
    function key(x, y) {
      return y * W + x;
    }

    // Corridor brand runs : composantes connexes bordant le vide → une marque
    const runs = [];
    for (let i = 0; i < corridor.length; i++) {
      const start = corridor[i];
      const sk = key(start.x, start.y);
      if (visited[sk] || grid[start.y][start.x] !== 1) continue;
      const stack = [start];
      const run = [];
      visited[sk] = true;
      while (stack.length) {
        const c = stack.pop();
        run.push(c);
        const nbs = [
          [c.x - 1, c.y],
          [c.x + 1, c.y],
          [c.x, c.y - 1],
          [c.x, c.y + 1],
        ];
        for (let n = 0; n < 4; n++) {
          const nx = nbs[n][0];
          const ny = nbs[n][1];
          if (isOuter(nx, ny)) continue;
          const nk = key(nx, ny);
          if (visited[nk]) continue;
          if (grid[ny][nx] !== 1) continue;
          if (!bordersEmpty(nx, ny)) continue;
          visited[nk] = true;
          stack.push({ x: nx, y: ny });
        }
      }
      if (run.length) runs.push(run);
    }

    // Longues runs d'abord — esthétique « mur de marque »
    runs.sort(function (a, b) {
      return b.length - a.length;
    });

    for (let r = 0; r < runs.length && need > 0; r++) {
      const run = runs[r];
      const seed = run[0];
      const brandIdx = (Math.floor(cellHash(seed.x, seed.y) * 3) + run.length) % 3;
      for (let i = 0; i < run.length && need > 0; i++) {
        const c = run[i];
        if (grid[c.y][c.x] !== 1) continue;
        grid[c.y][c.x] = ampIdForBrand(brandIdx, c.x, c.y);
        need--;
        ampCount++;
      }
    }

    // Pierre intérieure restante (isolée / non-couloir) → marque aléatoire déterministe
    const leftover = [];
    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      if (grid[c.y][c.x] === 1) leftover.push(c);
    }
    leftover.sort(function (a, b) {
      return cellHash(a.x, a.y) - cellHash(b.x, b.y);
    });
    for (let i = 0; i < leftover.length && need > 0; i++) {
      const c = leftover[i];
      const brandIdx = Math.floor(cellHash(c.x + 3, c.y + 7) * 3) % 3;
      grid[c.y][c.x] = ampIdForBrand(brandIdx, c.x, c.y);
      need--;
    }
  }

  ampifyInterior();

  /** Cells with wrecked amps (sparks) — world centers for FX */
  const wreckedAmps = [];
  for (let wy = 1; wy < H - 1; wy++) {
    for (let wx = 1; wx < W - 1; wx++) {
      const wid = grid[wy][wx];
      if (WRECKED_IDS[wid]) {
        wreckedAmps.push({
          x: wx + 0.5,
          y: wy + 0.5,
          cx: wx,
          cy: wy,
          id: wid,
          phase: cellHash(wx, wy) * Math.PI * 2,
        });
      }
    }
  }

  const inscriptions = [
    { x: 14, y: 14, text: '« Les sceaux chantent encore. »' },
    { x: 6, y: 8, text: '« L\'ampli Marshall veille dans le couloir. »' },
    { x: 20, y: 8, text: '« Les baffles n\'oublient pas. »' },
    { x: 14, y: 15, text: '« La flamme verte n\'est pas un rêve. »' },
    { x: 14, y: 19, text: '« L\'ampli Orange brûle sous la pierre. »' },
    { x: 10, y: 14, text: '« Somnul s\'engoufre dans le riff. »' },
    { x: 14, y: 8, text: '« Les câbles rampent. »' },
    { x: 3, y: 4, text: '« Autel fuzz — ne touche pas le knob. »' },
  ];

  const entities = [
    { type: 'playerSpawn', x: 14.5, y: 14.5 },

    { type: 'seal', sealIndex: 0, x: 3.5, y: 3.5, name: 'Sceau du Silence' },
    { type: 'seal', sealIndex: 1, x: 24.5, y: 3.5, name: 'Sceau du Riff' },
    { type: 'seal', sealIndex: 2, x: 3.5, y: 24.5, name: 'Sceau de la Fumée' },
    { type: 'seal', sealIndex: 3, x: 24.5, y: 24.5, name: 'Sceau de Sha\'ur\'na' },

    { type: 'ammo', x: 10.5, y: 14.5, amount: 12 },
    { type: 'ammo', x: 18.5, y: 14.5, amount: 12 },
    { type: 'ammo', x: 14.5, y: 10.5, amount: 8 },
    { type: 'ammo', x: 14.5, y: 18.5, amount: 8 },
    { type: 'ammo', x: 7.5, y: 8.5, amount: 10 },
    { type: 'ammo', x: 20.5, y: 21.5, amount: 10 },
    { type: 'health', x: 9.5, y: 14.5, amount: 25 },
    { type: 'health', x: 19.5, y: 14.5, amount: 25 },
    { type: 'health', x: 8.5, y: 21.5, amount: 20 },
    { type: 'health', x: 19.5, y: 8.5, amount: 20 },

    // Moines variants : chambres et approches — nef centrale libre au spawn (~12)
    { type: 'monk', variant: 'ash', x: 4.5, y: 5.5 },
    { type: 'monk', variant: 'riff', x: 23.5, y: 5.5 },
    { type: 'monk', variant: 'smoke', x: 3.5, y: 21.5 },
    { type: 'monk', variant: 'somnul', x: 24.5, y: 21.5 },
    { type: 'monk', variant: 'ash', x: 6.5, y: 3.5 },
    { type: 'monk', variant: 'riff', x: 22.5, y: 24.5 },
    { type: 'monk', variant: 'smoke', x: 3.5, y: 8.5 },
    { type: 'monk', variant: 'somnul', x: 24.5, y: 8.5 },
    { type: 'monk', variant: 'ash', x: 3.5, y: 19.5 },
    { type: 'monk', variant: 'riff', x: 25.5, y: 26.5 },
    { type: 'monk', variant: 'smoke', x: 7.5, y: 24.5 },
    { type: 'monk', variant: 'somnul', x: 22.5, y: 5.5 },

    // Flaques — miettes de pain spawn → sceaux NW / NE / SW / SE
    { type: 'puddle', x: 14.5, y: 12.5 },
    { type: 'puddle', x: 14.5, y: 10.5 },
    { type: 'puddle', x: 10.5, y: 8.5 },
    { type: 'puddle', x: 6.5, y: 8.5 },
    { type: 'puddle', x: 3.5, y: 6.5 },
    { type: 'puddle', x: 18.5, y: 8.5 },
    { type: 'puddle', x: 22.5, y: 8.5 },
    { type: 'puddle', x: 24.5, y: 6.5 },
    { type: 'puddle', x: 14.5, y: 16.5 },
    { type: 'puddle', x: 10.5, y: 21.5 },
    { type: 'puddle', x: 6.5, y: 21.5 },
    { type: 'puddle', x: 3.5, y: 23.5 },
    { type: 'puddle', x: 18.5, y: 21.5 },
    { type: 'puddle', x: 22.5, y: 21.5 },
    { type: 'puddle', x: 24.5, y: 21.5 },
    { type: 'puddle', x: 26.5, y: 24.5 },
  ];

  function inBounds(cx, cy) {
    return cx >= 0 && cy >= 0 && cx < W && cy < H;
  }

  function isSolid(cx, cy) {
    if (!inBounds(cx, cy)) return true;
    return grid[cy][cx] > 0;
  }

  function wallId(cx, cy) {
    if (!inBounds(cx, cy)) return 1;
    return grid[cy][cx];
  }

  function getPlayerSpawn() {
    const e = entities.find(function (x) {
      return x.type === 'playerSpawn';
    });
    return e ? { x: e.x, y: e.y } : { x: 14.5, y: 14.5 };
  }

  ST3.Map = {
    W,
    H,
    grid,
    entities,
    inscriptions,
    wreckedAmps,
    inBounds,
    isSolid,
    wallId,
    getPlayerSpawn,
    isWreckedAmp: function (id) {
      return !!WRECKED_IDS[id];
    },
  };
})(window.ST3 = window.ST3 || {});
