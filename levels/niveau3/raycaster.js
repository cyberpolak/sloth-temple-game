/* SHA'UR'NA — DDA raycast + textures procédurales premium */
(function (ST3) {
  'use strict';

  const TEX_SIZE = 64;
  const textures = [];

  function texCanvas() {
    const art = ST3.Art.createCanvas(TEX_SIZE, TEX_SIZE);
    return art;
  }

  /** 1 — pierre cyclopéenne, mousse, runes, fissures */
  function genStone() {
    const { canvas, ctx } = texCanvas();
    const A = ST3.Art;
    const C = A.COL;

    A.rect(ctx, 0, 0, TEX_SIZE, TEX_SIZE, C.stoneD);

    // Blocs irréguliers (cyclopéens) — offsets par rangée
    const rows = [
      { y: 0, h: 18, offs: [0, 22, 40, 58] },
      { y: 18, h: 16, offs: [-8, 14, 36, 54] },
      { y: 34, h: 15, offs: [4, 26, 44, 62] },
      { y: 49, h: 15, offs: [-6, 18, 38, 56] },
    ];
    for (let ri = 0; ri < rows.length; ri++) {
      const row = rows[ri];
      for (let bi = 0; bi < row.offs.length; bi++) {
        const x0 = row.offs[bi];
        const x1 = bi + 1 < row.offs.length ? row.offs[bi + 1] : TEX_SIZE + 8;
        const bw = x1 - x0;
        const shade = (ri + bi) % 3 === 0 ? C.stoneL : C.stone;
        A.rect(ctx, x0, row.y, bw - 1, row.h - 1, shade);
        // Highlight haut / ombre bas
        A.rect(ctx, x0 + 1, row.y + 1, bw - 3, 2, C.stoneL);
        A.rect(ctx, x0 + 1, row.y + row.h - 3, bw - 3, 1, C.stoneD);
        // Grain
        for (let g = 0; g < 6; g++) {
          const gx = x0 + 3 + ((bi * 11 + g * 7 + ri * 3) % Math.max(4, bw - 6));
          const gy = row.y + 4 + ((g * 5 + ri * 2) % Math.max(4, row.h - 6));
          A.px(ctx, gx, gy, C.stoneD);
        }
      }
    }

    // Joints mousse verte
    A.rect(ctx, 0, 17, TEX_SIZE, 2, '#1a4830');
    A.rect(ctx, 0, 33, TEX_SIZE, 2, '#143828');
    A.rect(ctx, 0, 48, TEX_SIZE, 2, '#1a4830');
    for (let mx = 4; mx < TEX_SIZE; mx += 9) {
      A.px(ctx, mx, 17, C.glow);
      A.px(ctx, mx + 2, 34, '#2a6840');
      A.px(ctx, mx + 1, 49, '#1e5038');
    }

    // Fissures profondeur
    const cracks = [
      [12, 6, 14, 20],
      [12, 20, 10, 28],
      [38, 8, 42, 22],
      [42, 22, 48, 40],
      [22, 36, 28, 52],
      [50, 40, 46, 58],
    ];
    for (let i = 0; i < cracks.length; i++) {
      const c = cracks[i];
      ctx.strokeStyle = C.void;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(c[0], c[1]);
      ctx.lineTo(c[2], c[3]);
      ctx.stroke();
      A.px(ctx, c[0], c[1], C.stoneD);
    }

    // Rayures runiques subtiles
    ctx.fillStyle = 'rgba(74,255,138,0.22)';
    const runes = [
      [8, 10, 2, 6],
      [9, 12, 4, 1],
      [28, 24, 1, 7],
      [26, 27, 5, 1],
      [48, 14, 2, 5],
      [47, 16, 4, 1],
      [18, 42, 6, 1],
      [20, 40, 1, 5],
      [52, 50, 3, 1],
      [53, 48, 1, 5],
    ];
    for (let i = 0; i < runes.length; i++) {
      const r = runes[i];
      ctx.fillRect(r[0], r[1], r[2], r[3]);
    }

    A.ditherDarken(ctx, 0, 0, TEX_SIZE, TEX_SIZE, 0.12);
    return canvas;
  }

  /** Mur de baffles en grille (Marshall / Orange / Ampeg) */
  function genCabWall(brand) {
    const { canvas, ctx } = texCanvas();
    const A = ST3.Art;
    const C = A.COL;
    const bg =
      brand === 'orange' ? C.orangeD : brand === 'ampeg' ? '#0a100c' : C.marshallD;
    A.rect(ctx, 0, 0, TEX_SIZE, TEX_SIZE, bg);

    // Grille 2×2 de faces 4×12 (32×32 chacune)
    const cw = 32;
    const ch = 32;
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 2; col++) {
        A.drawCabFace(ctx, col * cw, row * ch, cw, ch, brand);
        // Séparateurs / rails entre baffles
        A.rect(ctx, col * cw, row * ch, cw, 1, C.void);
        A.rect(ctx, col * cw, row * ch, 1, ch, C.void);
      }
    }
    // Rivets coins
    const rivets = [
      [2, 2],
      [30, 2],
      [34, 2],
      [61, 2],
      [2, 30],
      [61, 30],
      [2, 34],
      [61, 34],
      [2, 61],
      [30, 61],
      [34, 61],
      [61, 61],
    ];
    const rivCol = brand === 'orange' ? '#3a2010' : brand === 'ampeg' ? '#6a9070' : C.gold;
    for (let i = 0; i < rivets.length; i++) {
      A.px(ctx, rivets[i][0], rivets[i][1], rivCol);
    }
    A.ditherDarken(ctx, 0, 0, TEX_SIZE, TEX_SIZE, 0.08);
    return canvas;
  }

  function genMarshall() {
    return genCabWall('marshall');
  }

  function genOrange() {
    return genCabWall('orange');
  }

  function genAmpeg() {
    return genCabWall('ampeg');
  }

  /** 4 — bande flamme verte runique (statique, aspect animé) */
  function genFlame() {
    const { canvas, ctx } = texCanvas();
    const A = ST3.Art;
    const C = A.COL;

    // Fond pierre sombre
    A.rect(ctx, 0, 0, TEX_SIZE, TEX_SIZE, C.stoneD);
    A.rect(ctx, 0, 0, 10, TEX_SIZE, C.stone);
    A.rect(ctx, 54, 0, 10, TEX_SIZE, C.stone);
    A.rect(ctx, 1, 1, 8, TEX_SIZE - 2, C.stoneL);
    A.rect(ctx, 55, 1, 8, TEX_SIZE - 2, C.stoneL);
    // Joints mousse sur les montants
    for (let y = 4; y < TEX_SIZE; y += 8) {
      A.rect(ctx, 0, y, 10, 1, '#1a4830');
      A.rect(ctx, 54, y, 10, 1, '#1a4830');
    }

    // Cœur sombre de la faille
    A.rect(ctx, 10, 0, 44, TEX_SIZE, '#04140c');

    // Tongues de flamme verticales (formes + glow)
    const tongues = [
      { x: 18, w: 6, phase: 0.7, tip: 4 },
      { x: 26, w: 10, phase: 1.0, tip: 0 },
      { x: 38, w: 7, phase: 0.85, tip: 8 },
      { x: 22, w: 5, phase: 0.55, tip: 14 },
      { x: 34, w: 4, phase: 0.45, tip: 20 },
    ];
    for (let t = 0; t < tongues.length; t++) {
      const fl = tongues[t];
      for (let y = TEX_SIZE - 1; y >= fl.tip; y--) {
        const rise = (TEX_SIZE - y) / TEX_SIZE;
        const wobble = Math.sin(y * 0.35 + t * 1.7) * (2 + rise * 3);
        const taper = 1 - rise * 0.55;
        const hw = (fl.w * taper * fl.phase) / 2;
        const cx = fl.x + wobble;
        // Glow externe
        A.rect(ctx, (cx - hw - 2) | 0, y, (hw * 2 + 4) | 0, 1, 'rgba(20,80,40,0.45)');
        // Corps
        const g = (80 + rise * 140) | 0;
        const r = (20 + rise * 50) | 0;
        A.rect(ctx, (cx - hw) | 0, y, (hw * 2) | 0, 1, 'rgb(' + r + ',' + g + ',' + ((40 + rise * 60) | 0) + ')');
        // Noyau clair
        if (hw > 1.5) {
          A.rect(
            ctx,
            (cx - hw * 0.35) | 0,
            y,
            Math.max(1, (hw * 0.7) | 0),
            1,
            rise > 0.55 ? C.glowSoft : C.glow
          );
        }
      }
    }

    // Étincelles / braises figées
    const sparks = [
      [16, 12],
      [30, 6],
      [42, 14],
      [24, 22],
      [36, 18],
      [20, 40],
      [44, 36],
      [28, 48],
    ];
    for (let i = 0; i < sparks.length; i++) {
      A.px(ctx, sparks[i][0], sparks[i][1], C.glowSoft);
      A.px(ctx, sparks[i][0], sparks[i][1] + 1, C.glow);
    }

    // Runes gravées dans la pierre latérale
    ctx.fillStyle = 'rgba(191,255,200,0.35)';
    ctx.fillRect(3, 20, 1, 8);
    ctx.fillRect(2, 23, 4, 1);
    ctx.fillRect(58, 28, 1, 6);
    ctx.fillRect(57, 30, 4, 1);

    return canvas;
  }

  /** 6 — autel fuzz : pierre + relief pédale géante + câbles */
  function genFuzzAltar() {
    const { canvas, ctx } = texCanvas();
    const A = ST3.Art;
    const C = A.COL;

    A.rect(ctx, 0, 0, TEX_SIZE, TEX_SIZE, C.stoneD);
    // Dalles
    for (let y = 0; y < TEX_SIZE; y += 16) {
      for (let x = 0; x < TEX_SIZE; x += 20) {
        const ox = ((y / 16) | 0) % 2 === 0 ? 0 : -10;
        A.rect(ctx, x + ox, y, 18, 14, C.stone);
        A.rect(ctx, x + ox + 1, y + 1, 16, 2, C.stoneL);
      }
    }
    A.rect(ctx, 0, 15, TEX_SIZE, 2, '#1a4830');
    A.rect(ctx, 0, 31, TEX_SIZE, 2, '#143828');
    A.rect(ctx, 0, 47, TEX_SIZE, 2, '#1a4830');

    // Niche sombre derrière la pédale
    A.rect(ctx, 10, 8, 44, 48, '#0a100c');
    A.rect(ctx, 12, 10, 40, 44, C.void);

    // Pédale fuzz géante (relief)
    A.drawFuzzPedal(ctx, 16, 14, 32, 36);

    // Câbles jack sortant
    ctx.strokeStyle = '#2a2018';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(18, 48);
    ctx.bezierCurveTo(8, 52, 4, 40, 2, 28);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(46, 48);
    ctx.bezierCurveTo(56, 54, 60, 42, 62, 30);
    ctx.stroke();
    ctx.strokeStyle = '#4a3a28';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, 46);
    ctx.bezierCurveTo(10, 50, 6, 38, 3, 26);
    ctx.stroke();

    // Points LED câbles
    A.shadeDisk(ctx, 4, 30, 2, '#0a2810', C.glow, C.glowSoft);
    A.shadeDisk(ctx, 60, 32, 2, '#0a2810', C.glow, null);

    // Ornements runiques autour
    ctx.fillStyle = 'rgba(200,160,64,0.4)';
    ctx.fillRect(14, 10, 36, 1);
    ctx.fillRect(14, 54, 36, 1);
    A.px(ctx, 12, 12, C.gold);
    A.px(ctx, 51, 12, C.gold);
    A.px(ctx, 12, 52, C.gold);
    A.px(ctx, 51, 52, C.gold);

    A.ditherDarken(ctx, 0, 0, TEX_SIZE, TEX_SIZE, 0.1);
    return canvas;
  }

  /** 7 — mur de câbles serpentins + LED vertes */
  function genCableWall() {
    const { canvas, ctx } = texCanvas();
    const A = ST3.Art;
    const C = A.COL;

    A.rect(ctx, 0, 0, TEX_SIZE, TEX_SIZE, C.stoneD);
    // Pierre de fond
    for (let y = 0; y < TEX_SIZE; y += 12) {
      for (let x = 0; x < TEX_SIZE; x += 16) {
        A.rect(ctx, x, y, 15, 11, (x + y) % 32 < 16 ? C.stone : '#152820');
      }
    }
    A.ditherDarken(ctx, 0, 0, TEX_SIZE, TEX_SIZE, 0.25);

    // Câbles serpentins
    const cables = [
      { color: '#1a1410', lite: '#3a3028', phase: 0, amp: 8, thick: 3 },
      { color: '#0c1810', lite: '#2a4030', phase: 1.8, amp: 10, thick: 2 },
      { color: '#181410', lite: '#4a3a28', phase: 3.2, amp: 6, thick: 2 },
      { color: '#101808', lite: '#284028', phase: 4.5, amp: 9, thick: 3 },
    ];
    for (let ci = 0; ci < cables.length; ci++) {
      const cab = cables[ci];
      const baseX = 10 + ci * 14;
      for (let y = 0; y < TEX_SIZE; y++) {
        const x = (baseX + Math.sin(y * 0.22 + cab.phase) * cab.amp) | 0;
        A.rect(ctx, x, y, cab.thick, 1, cab.color);
        A.px(ctx, x, y, cab.lite);
      }
    }

    // Croisements / noeuds
    const knots = [
      [18, 16],
      [32, 28],
      [46, 20],
      [24, 44],
      [40, 52],
      [12, 36],
      [52, 40],
    ];
    for (let i = 0; i < knots.length; i++) {
      A.rect(ctx, knots[i][0] - 1, knots[i][1] - 1, 4, 3, '#0a0806');
      A.rect(ctx, knots[i][0], knots[i][1], 2, 1, '#3a3028');
    }

    // LED vertes le long des câbles
    const leds = [
      [14, 8],
      [22, 18],
      [30, 12],
      [38, 26],
      [48, 16],
      [20, 40],
      [36, 48],
      [50, 44],
      [16, 56],
      [44, 8],
      [28, 34],
      [56, 30],
    ];
    for (let i = 0; i < leds.length; i++) {
      const bright = i % 3 === 0;
      A.shadeDisk(
        ctx,
        leds[i][0],
        leds[i][1],
        bright ? 2 : 1,
        '#0a2810',
        C.glow,
        bright ? C.glowSoft : null
      );
    }

    // Connecteurs jack en bas
    A.rect(ctx, 8, 58, 6, 4, '#2a2018');
    A.rect(ctx, 28, 58, 6, 4, '#2a2018');
    A.rect(ctx, 48, 58, 6, 4, '#2a2018');
    A.px(ctx, 10, 59, C.gold);
    A.px(ctx, 30, 59, C.gold);
    A.px(ctx, 50, 59, C.gold);

    return canvas;
  }

  /** 8 — graffiti SOMNUL : pierre sombre + lettres vertes + rayures occultes */
  function genSomnulGraffiti() {
    const { canvas, ctx } = texCanvas();
    const A = ST3.Art;
    const C = A.COL;

    // Base pierre (réutilise le look cyclopéen simplifié)
    A.rect(ctx, 0, 0, TEX_SIZE, TEX_SIZE, C.stoneD);
    for (let y = 0; y < TEX_SIZE; y += 16) {
      for (let x = 0; x < TEX_SIZE; x += 20) {
        const ox = ((y / 16) | 0) % 2 === 0 ? 0 : -8;
        A.rect(ctx, x + ox, y, 18, 14, (x + y) % 40 < 20 ? C.stone : '#152820');
        A.rect(ctx, x + ox + 1, y + 1, 16, 2, C.stoneL);
      }
    }
    A.rect(ctx, 0, 15, TEX_SIZE, 2, '#1a4830');
    A.rect(ctx, 0, 31, TEX_SIZE, 2, '#143828');
    A.rect(ctx, 0, 47, TEX_SIZE, 2, '#1a4830');
    A.ditherDarken(ctx, 0, 0, TEX_SIZE, TEX_SIZE, 0.2);

    // Zone sombre où le graffiti brûle
    A.rect(ctx, 4, 18, 56, 28, '#06140c');
    A.rect(ctx, 6, 20, 52, 24, '#0a1c10');

    // Halo vert sous les lettres
    ctx.fillStyle = 'rgba(20,80,40,0.45)';
    ctx.fillRect(8, 26, 48, 14);
    ctx.fillStyle = 'rgba(74,255,138,0.12)';
    ctx.fillRect(10, 28, 44, 10);

    // SOMNUL — glow soft puis core
    A.drawPixelWord(ctx, 'SOMNUL', 10, 30, 'rgba(20,80,48,0.9)', 2);
    A.drawPixelWord(ctx, 'SOMNUL', 9, 29, C.glow, 2);
    A.drawPixelWord(ctx, 'SOMNUL', 9, 29, C.glowSoft, 1);

    // Rayures occultes / griffures
    const scratches = [
      [6, 8, 22, 16],
      [40, 6, 58, 18],
      [8, 52, 28, 60],
      [36, 50, 56, 58],
      [18, 12, 14, 48],
      [48, 10, 52, 54],
      [24, 22, 40, 26],
      [12, 44, 50, 48],
    ];
    ctx.strokeStyle = 'rgba(10,40,24,0.85)';
    ctx.lineWidth = 1;
    for (let i = 0; i < scratches.length; i++) {
      const s = scratches[i];
      ctx.beginPath();
      ctx.moveTo(s[0], s[1]);
      ctx.lineTo(s[2], s[3]);
      ctx.stroke();
    }
    // Griffures vertes lumineuses
    ctx.strokeStyle = 'rgba(74,255,138,0.35)';
    ctx.beginPath();
    ctx.moveTo(14, 24);
    ctx.lineTo(20, 50);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(50, 22);
    ctx.lineTo(44, 52);
    ctx.stroke();

    // Points runiques aux coins
    A.px(ctx, 8, 10, C.glow);
    A.px(ctx, 55, 12, C.glow);
    A.px(ctx, 10, 54, C.glowSoft);
    A.px(ctx, 54, 56, C.glow);
    A.px(ctx, 32, 8, '#2a6840');
    A.px(ctx, 30, 56, '#2a6840');

    return canvas;
  }

  function initTextures() {
    textures[0] = null;
    textures[1] = genStone();
    textures[2] = genMarshall();
    textures[3] = genOrange();
    textures[4] = genFlame();
    textures[5] = genAmpeg();
    textures[6] = genFuzzAltar();
    textures[7] = genCableWall();
    textures[8] = genSomnulGraffiti();
  }

  function getTex(id) {
    return textures[id] || textures[1];
  }

  /**
   * Cast un rayon depuis (px,py) dans la direction (rdx,rdy).
   * Retourne { dist, side, mapX, mapY, wallId, wallX }
   */
  function castRay(px, py, rdx, rdy) {
    const map = ST3.Map;
    if (!Number.isFinite(px) || !Number.isFinite(py) || !Number.isFinite(rdx) || !Number.isFinite(rdy)) {
      return { dist: 1, side: 0, mapX: 0, mapY: 0, wallId: 1, wallX: 0 };
    }
    let mapX = px | 0;
    let mapY = py | 0;

    const deltaDistX = rdx === 0 ? 1e30 : Math.abs(1 / rdx);
    const deltaDistY = rdy === 0 ? 1e30 : Math.abs(1 / rdy);

    let stepX, stepY;
    let sideDistX, sideDistY;

    if (rdx < 0) {
      stepX = -1;
      sideDistX = (px - mapX) * deltaDistX;
    } else {
      stepX = 1;
      sideDistX = (mapX + 1 - px) * deltaDistX;
    }
    if (rdy < 0) {
      stepY = -1;
      sideDistY = (py - mapY) * deltaDistY;
    } else {
      stepY = 1;
      sideDistY = (mapY + 1 - py) * deltaDistY;
    }

    let hit = 0;
    let side = 0;
    let guard = 0;
    while (hit === 0 && guard++ < 64) {
      if (sideDistX < sideDistY) {
        sideDistX += deltaDistX;
        mapX += stepX;
        side = 0;
      } else {
        sideDistY += deltaDistY;
        mapY += stepY;
        side = 1;
      }
      if (map.isSolid(mapX, mapY)) hit = 1;
    }

    let perpWallDist;
    if (side === 0) perpWallDist = (mapX - px + (1 - stepX) / 2) / rdx;
    else perpWallDist = (mapY - py + (1 - stepY) / 2) / rdy;

    if (!Number.isFinite(perpWallDist) || perpWallDist < 0.01) perpWallDist = 0.01;

    let wallX;
    if (side === 0) wallX = py + perpWallDist * rdy;
    else wallX = px + perpWallDist * rdx;
    wallX -= Math.floor(wallX);

    return {
      dist: perpWallDist,
      side: side,
      mapX: mapX,
      mapY: mapY,
      wallId: map.wallId(mapX, mapY),
      wallX: wallX,
    };
  }

  /** Marshall / Orange / Ampeg — murs qui tremblent et crachent des ondes */
  function isAmpWall(id) {
    return id === 2 || id === 3 || id === 5;
  }

  /**
   * Pulse par cellule : période 1.2–2.5s, phase décalée par (mapX,mapY).
   * Retourne 0 hors pulse, sinon enveloppe 0→1→0 (~0.28s).
   */
  function ampPulse(animT, mapX, mapY) {
    const at = animT || 0;
    const hash = (mapX * 17 + mapY * 31) & 255;
    const period = 1.2 + (hash % 14) * 0.1;
    const phase = ((mapX * 7.3 + mapY * 13.1) % (Math.PI * 2)) * 0.18;
    let t = (at + phase) % period;
    if (t < 0) t += period;
    const pulseDur = 0.28;
    if (t > pulseDur) return 0;
    return Math.sin((t / pulseDur) * Math.PI);
  }

  /** Ondes sonores : arcs concentriques translucides (max 8 sources). */
  function drawAmpWaves(ctx, waves, animT) {
    if (!waves.length) return;
    ctx.save();
    ctx.lineWidth = 1;
    for (let i = 0; i < waves.length; i++) {
      const w = waves[i];
      const pulse = ampPulse(animT, w.mapX, w.mapY);
      if (pulse < 0.08) continue;
      const near = ST3.Utils.clamp(1 - w.dist / 6, 0.15, 1);
      const expand = 1 - pulse; // arcs s'ouvrent pendant le decay
      let stroke;
      if (w.wallId === 3) stroke = '255,160,60';
      else if (w.wallId === 5) stroke = '120,255,160';
      else stroke = '200,180,80';
      for (let r = 0; r < 3; r++) {
        const rad = 5 + near * 10 + expand * (14 + r * 9) + r * 5;
        const alpha = pulse * near * (0.32 - r * 0.08);
        if (alpha < 0.03) continue;
        ctx.strokeStyle = 'rgba(' + stroke + ',' + alpha.toFixed(3) + ')';
        ctx.beginPath();
        ctx.ellipse(w.sx, w.cy, rad, rad * 0.42, 0, Math.PI * 0.12, Math.PI * 0.88);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  /**
   * Remplit zBuffer[x] et dessine les colonnes de murs sur ctx (buffer interne).
   * dirX/dirY = direction joueur, planeX/planeY = plan caméra.
   * animT : temps pour tremblement / ondes des baffles.
   * Retourne { ampBass } (0–1) pour vignette basse optionnelle.
   */
  function renderWalls(ctx, w, h, px, py, dirX, dirY, planeX, planeY, zBuffer, fogMax, animT) {
    const halfH = h / 2;
    const t = animT || 0;
    // Sur mobile, un rayon sur deux — plus fluide
    const step =
      typeof SlothDevice !== 'undefined' && SlothDevice.isTouchPrimary() ? 2 : 1;

    const ampSeen = {};
    const ampWaves = [];
    let ampBass = 0;

    for (let x = 0; x < w; x += step) {
      const cameraX = (2 * x) / w - 1;
      const rdx = dirX + planeX * cameraX;
      const rdy = dirY + planeY * cameraX;
      const hit = castRay(px, py, rdx, rdy);
      zBuffer[x] = hit.dist;
      if (step === 2 && x + 1 < w) zBuffer[x + 1] = hit.dist;

      const lineH = Math.min(h * 4, (h / hit.dist) | 0);
      let drawStart = (-lineH / 2 + halfH) | 0;
      let drawEnd = (lineH / 2 + halfH) | 0;
      if (drawStart < 0) drawStart = 0;
      if (drawEnd >= h) drawEnd = h - 1;

      const tex = getTex(hit.wallId);
      let texX = (hit.wallX * TEX_SIZE) | 0;
      if (hit.side === 0 && rdx > 0) texX = TEX_SIZE - texX - 1;
      if (hit.side === 1 && rdy < 0) texX = TEX_SIZE - texX - 1;
      texX = ST3.Utils.clamp(texX, 0, TEX_SIZE - 1);

      // Brouillard mystique vert (#04140c)
      const fog = ST3.Utils.clamp(1 - hit.dist / fogMax, 0.12, 1);
      const sideShade = hit.side === 1 ? 0.72 : 1;
      const shade = fog * sideShade;
      const colW = step;

      // Tremblement baffle : offset horizontal ±1–2px pendant le pulse
      let drawX = x;
      if (isAmpWall(hit.wallId)) {
        const pulse = ampPulse(t, hit.mapX, hit.mapY);
        if (pulse > 0.05) {
          const shake =
            Math.sin(t * 52 + hit.mapX * 2.7 + hit.mapY * 4.1) * pulse * 2;
          drawX = x + (shake | 0);
          if (drawX < 0) drawX = 0;
          if (drawX + colW > w) drawX = w - colW;
          if (hit.dist < 8) {
            const near = ST3.Utils.clamp(1 - hit.dist / 8, 0, 1);
            if (pulse * near > ampBass) ampBass = pulse * near;
          }
        }
        // Collecte sources d'ondes (une par cellule, dist < 6, max 8)
        if (hit.dist < 6) {
          const key = hit.mapX + (hit.mapY << 8);
          if (ampSeen[key] != null) {
            const aw = ampWaves[ampSeen[key]];
            aw.n += 1;
            aw.sx += (x + (colW >> 1) - aw.sx) / aw.n;
            if (hit.dist < aw.dist) aw.dist = hit.dist;
          } else if (ampWaves.length < 8) {
            ampSeen[key] = ampWaves.length;
            ampWaves.push({
              sx: x + (colW >> 1),
              cy: (drawStart + drawEnd) >> 1,
              dist: hit.dist,
              wallId: hit.wallId,
              mapX: hit.mapX,
              mapY: hit.mapY,
              n: 1,
            });
          }
        }
      }

      ctx.drawImage(tex, texX, 0, 1, TEX_SIZE, drawX, drawStart, colW, drawEnd - drawStart + 1);
      ctx.fillStyle = 'rgba(4,20,12,' + (1 - shade).toFixed(3) + ')';
      ctx.fillRect(drawX, drawStart, colW, drawEnd - drawStart + 1);
      if (hit.side === 1) {
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.fillRect(drawX, drawStart, colW, drawEnd - drawStart + 1);
      }
    }

    drawAmpWaves(ctx, ampWaves, t);
    return { ampBass: ampBass };
  }

  ST3.Raycaster = {
    TEX_SIZE,
    initTextures,
    getTex,
    castRay,
    renderWalls,
    isAmpWall,
    ampPulse,
  };
})(window.ST3 = window.ST3 || {});
