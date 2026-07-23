/* SHA'UR'NA — palette + helpers pixel art (style niveau 2) */
(function (ST3) {
  'use strict';

  const COL = {
    glow: '#4aff8a',
    glowSoft: '#bfffc8',
    eye: '#5aff9a',
    eyeGlow: '#7affaa',
    mist: '#6a9aaa',
    mistL: '#a8d8c8',
    fur: '#3a3228',
    furL: '#5a4a38',
    furH: '#7a6850',
    furD: '#1e1812',
    belly: '#2a2820',
    bellyL: '#3a3830',
    claw: '#9a8868',
    clawL: '#c8b898',
    clawD: '#6a5840',
    robe: '#1a2820',
    robeL: '#2a3c30',
    robeD: '#0a100c',
    robeM: '#3a5040',
    robeH: '#4a6850',
    robeVD: '#050806',
    skin: '#2a2018',
    skinL: '#3a3020',
    skinD: '#1a1410',
    cerb: '#1e2a22',
    cerbL: '#324038',
    cerbH: '#4a5c50',
    cerbD: '#0c120e',
    cerbVD: '#060806',
    ash: '#3a4440',
    ashL: '#5a6860',
    ashD: '#1a201c',
    smoke: 'rgba(60,90,70,0.35)',
    smokeL: 'rgba(90,120,100,0.45)',
    bone: '#c8c0a8',
    boneL: '#e8e0d0',
    boneD: '#8a8470',
    corrupt: '#8a9a40',
    corruptL: '#c8b060',
    corruptD: '#4a5020',
    marshall: '#1a1814',
    marshallL: '#2e2a24',
    marshallD: '#0c0a08',
    gold: '#c8a040',
    goldL: '#ffe89a',
    goldD: '#8a6820',
    orange: '#c45a18',
    orangeL: '#e87828',
    orangeD: '#8a3a10',
    stone: '#1a3028',
    stoneL: '#2a4a34',
    stoneD: '#0c1810',
    blood: '#8a2a2a',
    void: '#020503',
  };

  function createCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    return { canvas: c, ctx };
  }

  function px(ctx, x, y, color, s) {
    const n = s || 1;
    ctx.fillStyle = color;
    ctx.fillRect(x | 0, y | 0, n, n);
  }

  function rect(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
  }

  /** Disque pixel (rempli) */
  function disk(ctx, cx, cy, r, color) {
    ctx.fillStyle = color;
    const rr = r * r;
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        if (x * x + y * y <= rr) ctx.fillRect((cx + x) | 0, (cy + y) | 0, 1, 1);
      }
    }
  }

  /** Volume ovale dark/mid/lite — signature niveau 2 */
  function shadeDisk(ctx, cx, cy, r, dark, mid, lite) {
    disk(ctx, cx, cy, r, dark);
    disk(ctx, cx - r * 0.15, cy - r * 0.2, r * 0.78, mid);
    if (lite) disk(ctx, cx - r * 0.35, cy - r * 0.4, r * 0.28, lite);
  }

  /** Ellipse remplie (approx pixel) */
  function oval(ctx, cx, cy, rx, ry, color) {
    ctx.fillStyle = color;
    const rx2 = rx * rx || 1;
    const ry2 = ry * ry || 1;
    const y0 = -Math.ceil(ry);
    const y1 = Math.ceil(ry);
    for (let y = y0; y <= y1; y++) {
      const w = Math.sqrt(Math.max(0, 1 - (y * y) / ry2)) * rx;
      const x0 = Math.ceil(cx - w);
      const x1 = Math.floor(cx + w);
      if (x1 >= x0) ctx.fillRect(x0, (cy + y) | 0, x1 - x0 + 1, 1);
    }
  }

  function shadeOval(ctx, cx, cy, rx, ry, dark, mid, lite) {
    oval(ctx, cx + 0.6, cy + 0.8, rx, ry, dark);
    oval(ctx, cx, cy, rx * 0.92, ry * 0.9, mid);
    if (lite) oval(ctx, cx - rx * 0.22, cy - ry * 0.28, rx * 0.45, ry * 0.38, lite);
  }

  /** Touffe de fourrure / crête */
  function furTuft(ctx, x, y, len, ang, col) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.fillStyle = col;
    ctx.fillRect(0, -1, len | 0, 2);
    ctx.fillRect((len | 0) - 1, -2, 2, 3);
    ctx.restore();
  }

  /** Flamme verte pixel (VFX) */
  function pixelFlame(ctx, cx, cy, h, core, mid, tip) {
    const hh = h | 0;
    for (let i = 0; i < hh; i++) {
      const t = i / Math.max(1, hh - 1);
      const w = Math.max(1, ((1 - t) * 3.5) | 0);
      ctx.fillStyle = t < 0.35 ? core : t < 0.7 ? mid : tip;
      ctx.fillRect((cx - w) | 0, (cy - i) | 0, w * 2 + 1, 1);
      if (t > 0.5 && (i & 1)) ctx.fillRect((cx + (i & 2 ? 1 : -2)) | 0, (cy - i) | 0, 1, 1);
    }
  }

  function ditherDarken(ctx, x, y, w, h, amount) {
    ctx.fillStyle = 'rgba(0,0,0,' + amount + ')';
    for (let yy = y; yy < y + h; yy += 2) {
      for (let xx = x + (yy & 1); xx < x + w; xx += 2) {
        ctx.fillRect(xx, yy, 1, 1);
      }
    }
  }

  /** Speaker cab face (Marshall / Orange / Ampeg) pour textures mur
   *  6e arg `wear` : false | true/'decayed' | 'wrecked'
   */
  function drawCabFace(ctx, x, y, w, h, brand, wear) {
    const wrecked = wear === 'wrecked';
    const decayed = wrecked || wear === true || wear === 'decayed';
    const isOrange = brand === 'orange';
    const isAmpeg = brand === 'ampeg';
    let body = COL.marshall;
    let bodyL = COL.marshallL;
    let bodyD = COL.marshallD;
    let badge = COL.gold;
    if (isOrange) {
      body = COL.orange;
      bodyL = COL.orangeL;
      bodyD = COL.orangeD;
      badge = COL.marshallD;
    } else if (isAmpeg) {
      body = '#152018';
      bodyL = '#2a4030';
      bodyD = '#0a100c';
      badge = '#8ab890';
    }
    if (wrecked) {
      body = isOrange ? '#5a2008' : isAmpeg ? '#080c08' : '#0c0a08';
      bodyL = isOrange ? '#7a3010' : isAmpeg ? '#142018' : '#181410';
      bodyD = isOrange ? '#3a1004' : isAmpeg ? '#040604' : '#040202';
      badge = isOrange ? '#2a1408' : isAmpeg ? '#2a4030' : '#3a3010';
    } else if (decayed) {
      body = isOrange ? '#8a4010' : isAmpeg ? '#101810' : '#141210';
      bodyL = isOrange ? '#a05018' : isAmpeg ? '#1e3024' : '#22201a';
      bodyD = isOrange ? '#5a2808' : isAmpeg ? '#060a08' : '#080604';
      badge = isOrange ? '#4a2810' : isAmpeg ? '#4a6850' : '#6a5820';
    }
    rect(ctx, x, y, w, h, bodyD);
    rect(ctx, x + 1, y + 1, w - 2, h - 2, body);
    rect(ctx, x + 1, y + 1, 2, h - 3, bodyL);
    rect(ctx, x + 1, y + 1, w - 3, 2, bodyL);
    // Coins protecteurs (volume niveau 2)
    const corner = isOrange ? '#3a2010' : isAmpeg ? '#1a3020' : '#3a3428';
    rect(ctx, x, y, 3, 3, corner);
    rect(ctx, x + w - 3, y, 3, 3, corner);
    rect(ctx, x, y + h - 3, 3, 3, corner);
    rect(ctx, x + w - 3, y + h - 3, 3, 3, corner);
    // grille tissu
    const gx = x + 3;
    const gy = y + 5;
    const gw = w - 6;
    const gh = h - 10;
    rect(ctx, gx, gy, gw, gh, isOrange ? '#2a1810' : '#12100c');
    rect(ctx, gx + 1, gy + 1, gw - 2, gh - 2, '#0a0806');
    // Trame grille
    ctx.fillStyle = isOrange ? 'rgba(60,40,20,0.35)' : 'rgba(40,36,28,0.3)';
    for (let yy = gy + 1; yy < gy + gh - 1; yy += 2) {
      for (let xx = gx + 1 + (yy & 1); xx < gx + gw - 1; xx += 2) {
        ctx.fillRect(xx, yy, 1, 1);
      }
    }
    const cols = 2;
    const rows = 2;
    const cellW = (gw / cols) | 0;
    const cellH = (gh / rows) | 0;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const sx = (gx + col * cellW + cellW / 2) | 0;
        const sy = (gy + row * cellH + cellH / 2) | 0;
        const rr = Math.max(2, (Math.min(cellW, cellH) / 2 - 1) | 0);
        const mid = isOrange ? '#3a2818' : isAmpeg ? '#243828' : '#2a2820';
        const lite = isOrange ? '#6a4828' : isAmpeg ? '#4a6850' : '#4a4840';
        shadeDisk(ctx, sx, sy, rr, '#050403', mid, lite);
        // Dustcap
        disk(ctx, sx, sy, Math.max(1, (rr * 0.25) | 0), '#1a1810');
      }
    }
    // badge
    if (wrecked) {
      // Badge fondu / carbonisé
      px(ctx, x + 5, y + 2, '#2a2010');
      px(ctx, x + 7, y + 2, badge);
    } else if (decayed) {
      // Badge brisé / partiel
      rect(ctx, x + 4, y + 2, (w - 8) >> 1, 2, badge);
      if (((x + y) & 1) === 0) px(ctx, x + w - 6, y + 2, badge);
      else rect(ctx, x + w - 10, y + 2, 4, 1, badge);
    } else {
      rect(ctx, x + 4, y + 2, w - 8, 2, badge);
      if (isOrange) rect(ctx, x + 6, y + 2, w - 12, 1, '#ffaa44');
      else if (isAmpeg) rect(ctx, x + 6, y + 2, w - 12, 1, '#c8e0c8');
      else {
        px(ctx, (x + w / 2) | 0, y + 2, COL.goldL);
        px(ctx, ((x + w / 2) | 0) + 3, y + 2, COL.goldL);
      }
    }
    if (decayed) {
      // Mousse / traînées végétales
      const moss = ['#1a4830', '#2a6840', '#143828', COL.stoneL];
      px(ctx, x + 2, y + h - 4, moss[(x + y) & 3]);
      px(ctx, x + 3, y + h - 3, moss[(x + 1) & 3]);
      px(ctx, x + w - 4, y + 6, moss[(y) & 3]);
      px(ctx, x + 5, gy + 2, moss[2]);
      px(ctx, x + w - 6, gy + gh - 3, moss[0]);
      rect(ctx, gx + 2, gy + gh - 2, 4, 1, moss[1]);
      // Tache / saleté
      px(ctx, gx + (gw >> 1), gy + 1, '#1a1410');
      px(ctx, gx + 3, gy + (gh >> 1), '#0c0a08');
    }
    if (wrecked) {
      // Scorch / exposed copper hint / burnt hole
      rect(ctx, gx + 2, gy + 2, 5, 4, '#050302');
      px(ctx, gx + 3, gy + 3, '#c87820');
      px(ctx, gx + 4, gy + 4, '#ffe89a');
      px(ctx, gx + gw - 5, gy + gh - 5, '#6a2810');
      px(ctx, gx + gw - 4, gy + gh - 4, '#ffb040');
      // Wire stub
      px(ctx, x + w - 3, y + (h >> 1), '#8a9a70');
      px(ctx, x + w - 2, y + (h >> 1) + 1, '#c8e0a0');
    }
  }

  /** Gold ritual cracks across a disc (seals / talismans) */
  function goldCracks(ctx, cx, cy, segs, color, lite) {
    const col = color || COL.gold;
    const hi = lite || COL.goldL;
    ctx.strokeStyle = col;
    ctx.lineWidth = 1;
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      ctx.beginPath();
      ctx.moveTo(cx + s[0], cy + s[1]);
      for (let p = 2; p < s.length; p += 2) {
        ctx.lineTo(cx + s[p], cy + s[p + 1]);
      }
      ctx.stroke();
      if (s.length >= 4) px(ctx, cx + s[0], cy + s[1], hi);
    }
  }

  /** Glyphes 3×5 pour graffiti SOMNUL (LTR; L = stem left + base; N ≠ M) */
  const GLYPH_3x5 = {
    S: ['111', '100', '111', '001', '111'],
    O: ['111', '101', '101', '101', '111'],
    M: ['101', '111', '101', '101', '101'],
    // Diagonal + both stems — never a closed box (≠ O), never M peaks
    N: ['101', '110', '101', '011', '101'],
    U: ['101', '101', '101', '101', '111'],
    L: ['100', '100', '100', '100', '111'],
  };

  function drawPixelWord(ctx, word, x, y, color, scale) {
    const s = scale || 1;
    let ox = x;
    for (let i = 0; i < word.length; i++) {
      const g = GLYPH_3x5[word[i]];
      if (!g) {
        ox += 4 * s;
        continue;
      }
      for (let row = 0; row < g.length; row++) {
        for (let col = 0; col < 3; col++) {
          if (g[row][col] === '1') rect(ctx, ox + col * s, y + row * s, s, s, color);
        }
      }
      ox += 4 * s;
    }
  }

  /** Flaque vert occult — tache de sol ancrée en bas du canvas (décor, pas un pickup) */
  function drawGreenPuddle(ctx, s) {
    const cx = (s / 2) | 0;
    // Flush to canvas bottom so floorBias pins the stain to the ground plane
    const cy = s - 4;
    ctx.globalAlpha = 0.5;
    oval(ctx, cx, cy, 26, 5, '#03140a');
    oval(ctx, cx - 12, cy + 1, 9, 3, '#04180c');
    oval(ctx, cx + 13, cy, 8, 3, '#04180c');
    oval(ctx, cx + 3, cy + 2, 11, 2, '#061810');
    // Wet body — muddy green, not neon glow
    ctx.globalAlpha = 0.62;
    oval(ctx, cx - 1, cy, 19, 3.5, '#0a2418');
    oval(ctx, cx + 7, cy + 1, 9, 2.5, '#0c2014');
    oval(ctx, cx - 9, cy + 1, 8, 2, '#081c12');
    // Matte sheen (no orb / no bob pickup look)
    ctx.globalAlpha = 0.28;
    oval(ctx, cx - 4, cy - 1, 9, 1.5, '#163828');
    ctx.globalAlpha = 0.18;
    oval(ctx, cx - 6, cy - 1, 4, 1, '#1a4030');
    ctx.globalAlpha = 1;
    px(ctx, cx + 22, cy, '#04180c');
    px(ctx, cx + 24, cy + 1, '#03140a');
    px(ctx, cx - 24, cy + 1, '#03140a');
    px(ctx, cx - 18, cy + 2, '#061810');
    px(ctx, cx + 14, cy + 2, '#0a2418');
    px(ctx, cx - 3, cy + 3, '#061810');
    px(ctx, cx + 8, cy + 3, '#04180c');
    px(ctx, cx + 1, cy - 2, '#143020');
    px(ctx, cx - 11, cy - 1, '#0e2418');
  }

  /** Autel pédale fuzz — clear LED + gold foot for pickup stacks */
  function drawFuzzPedal(ctx, x, y, w, h) {
    rect(ctx, x, y, w, h, '#1a1410');
    rect(ctx, x + 2, y + 2, w - 4, h - 4, '#2a2018');
    rect(ctx, x + 1, y + 1, 2, h - 3, '#3a3028');
    rect(ctx, x + 4, y + 4, w - 8, Math.max(4, h - 14), '#0c1810');
    // LED verte (cry charge)
    const lx = (x + w / 2) | 0;
    const ly = y + Math.max(6, (h * 0.35) | 0);
    shadeDisk(ctx, lx, ly, Math.max(2, (h / 5) | 0), '#0a2810', COL.glow, COL.glowSoft);
    px(ctx, lx, ly - 1, '#ffffff');
    // knobs
    const ky = y + h - Math.max(6, (h * 0.35) | 0);
    shadeDisk(ctx, x + 8, ky, Math.max(3, (h / 5) | 0), '#0a0806', '#3a3028', '#6a5a48');
    shadeDisk(ctx, x + w - 8, ky, Math.max(3, (h / 5) | 0), '#0a0806', '#3a3028', '#6a5a48');
    rect(ctx, x + 6, y + h - 4, w - 12, 2, COL.gold);
    rect(ctx, x + 8, y + h - 3, w - 16, 1, COL.goldL);
  }

  /** Triangle fill (hood peaks, spine ridges, fangs) */
  function tri(ctx, x0, y0, x1, y1, x2, y2, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.closePath();
    ctx.fill();
  }

  /** Clawed / wrapped skeletal hand (3–4 finger tips) */
  function clawHand(ctx, hx, hy, dir, raised) {
    const d = dir || 1;
    rect(ctx, hx - 1, hy - 1, 3, 3, COL.skinD);
    rect(ctx, hx, hy, 2, 2, COL.boneD);
    px(ctx, hx, hy, COL.bone);
    const tipY = raised ? hy - 3 : hy + 3;
    px(ctx, hx - 1 * d, tipY, COL.boneL);
    px(ctx, hx, tipY + (raised ? 0 : 1), COL.clawL);
    px(ctx, hx + 1 * d, tipY, COL.bone);
    px(ctx, hx + 2 * d, tipY + (raised ? 1 : 0), COL.claw);
    px(ctx, hx - 1, hy + 1, COL.ashL);
  }

  /** Hurt flash: sparse edge sparks — never a filled blob/rect */
  function hurtSparks(ctx, pts) {
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      px(ctx, p[0], p[1], i & 1 ? '#ffffff' : '#ffe8c0');
      if (i & 2) px(ctx, p[0] + 1, p[1] - 1, COL.goldL);
    }
  }

  /* ═══════════════════════════════════════════════════════════
     Monk — tall pointed-hood cult executioner (64×64)
     Peak y≈2 → shoulders ≈18 → waist ≈36 → hem ≈57 → boots ≈61
     Poses: idle | walk0 | walk1 | attack | hurt
     ═══════════════════════════════════════════════════════════ */

  /* Monk variant robe / eye palettes (merged over COL at draw time) */
  const MONK_PALETTES = {
    ash: null, // default COL (green robes)
    riff: {
      robe: '#2a2418',
      robeL: '#4a3c28',
      robeD: '#141008',
      robeM: '#5a4a30',
      robeH: '#7a6840',
      robeVD: '#080604',
      cerbD: '#1a140c',
      eye: '#ffe89a',
      eyeGlow: '#fff0b0',
      glow: '#c8a040',
      glowSoft: '#ffe89a',
      gold: '#e8c060',
      goldL: '#fff0a8',
      goldD: '#a87820',
    },
    smoke: {
      robe: '#2a302e',
      robeL: '#3a4844',
      robeD: '#121816',
      robeM: '#4a5854',
      robeH: '#5a6864',
      robeVD: '#080a09',
      cerbD: '#1a201c',
      eye: '#6a8a78',
      eyeGlow: '#8aaa98',
      glow: '#5a7a68',
      glowSoft: '#8aaa98',
      mist: '#5a6860',
      mistL: '#7a8880',
    },
    somnul: {
      robe: '#0a0c10',
      robeL: '#161820',
      robeD: '#040508',
      robeM: '#1e2230',
      robeH: '#2a3040',
      robeVD: '#020204',
      cerbD: '#080a10',
      void: '#000002',
      eye: '#7affaa',
      eyeGlow: '#bfffc8',
      glow: '#5aff9a',
      glowSoft: '#d0ffe0',
    },
  };

  function resolveMonkPalette(variant) {
    const key = variant && MONK_PALETTES[variant] !== undefined ? variant : 'ash';
    const over = MONK_PALETTES[key];
    if (!over) return COL;
    return Object.assign({}, COL, over);
  }

  function drawMonkFrame(ctx, pose, palette) {
    const C = palette || COL;
    const hurt = pose === 'hurt';
    const atk = pose === 'attack';
    const walk = pose === 'walk0' || pose === 'walk1';
    const w1 = pose === 'walk1';
    const shake = hurt ? 1 : 0;

    let lean = 1;
    let bob = 0;
    let hemBias = 0;
    let hoodTilt = 0;
    let legL = { ox: -6, lift: 0, planted: true };
    let legR = { ox: 5, lift: 0, planted: true };
    let sleeveL = { ox: -12, oy: 0, billow: 1 };
    let sleeveR = { ox: 11, oy: 0, billow: 1 };

    if (walk) {
      lean = w1 ? 4 : -3;
      bob = w1 ? 1 : 0;
      hemBias = w1 ? -6 : 6;
      hoodTilt = w1 ? 2 : -2;
      if (w1) {
        legL = { ox: -10, lift: 9, planted: false };
        legR = { ox: 8, lift: 0, planted: true };
        sleeveL = { ox: -11, oy: 4, billow: 2 };
        sleeveR = { ox: 12, oy: -3, billow: 1 };
      } else {
        legL = { ox: -8, lift: 0, planted: true };
        legR = { ox: 7, lift: 9, planted: false };
        sleeveL = { ox: -13, oy: -3, billow: 1 };
        sleeveR = { ox: 10, oy: 4, billow: 2 };
      }
    } else if (atk) {
      lean = 8;
      bob = 1;
      hemBias = -4;
      hoodTilt = 3;
      legL = { ox: -3, lift: 0, planted: true };
      legR = { ox: 9, lift: 0, planted: true };
      sleeveL = { ox: -16, oy: 3, billow: 4 };
      sleeveR = { ox: 7, oy: -16, billow: 5 };
    } else if (hurt) {
      lean = -7;
      bob = 2;
      hemBias = 5;
      hoodTilt = -4;
      legL = { ox: -4, lift: 0, planted: true };
      legR = { ox: 2, lift: 3, planted: false };
      sleeveL = { ox: -8, oy: -5, billow: 2 };
      sleeveR = { ox: 13, oy: -6, billow: 2 };
    }

    const cx = 32 + lean + shake;
    const peakY = 2 + bob;
    const shoulderY = 17 + bob;
    const waistY = 35 + bob;
    const hemY = 56 + bob;
    const footY = 61 + bob;

    oval(ctx, 32 + lean * 0.25 + shake, footY, 11, 2, 'rgba(0,0,0,0.55)');

    // Boots under hem
    function drawBoot(side, leg) {
      const lx = cx + side + leg.ox;
      const top = hemY - 3 - leg.lift;
      const len = Math.max(4, footY - top - (leg.planted ? 0 : 2));
      rect(ctx, lx - 2, top, 4, len - 1, C.robeVD);
      rect(ctx, lx - 1, top + 1, 2, len - 2, C.robeD);
      if (leg.planted) {
        rect(ctx, lx - 4, footY - 3, 8, 3, C.robeVD);
        rect(ctx, lx - 3, footY - 2, 6, 2, '#060504');
        px(ctx, lx + 3, footY - 3, C.goldD);
      } else {
        rect(ctx, lx - 1, top + len - 2, 5, 2, C.robeVD);
        px(ctx, lx + 3, top + len - 3, C.robe);
      }
    }
    drawBoot(-7, legL);
    drawBoot(7, legR);

    // Tall funnel robe — narrow shoulders, cinched waist, late hem flare
    for (let y = shoulderY; y <= hemY; y++) {
      const t = (y - shoulderY) / Math.max(1, hemY - shoulderY);
      let half;
      if (t < 0.32) half = 9 - t * 10;            // shoulder ~9 → taper
      else if (t < 0.52) half = 5.8 - (t - 0.32) * 8; // waist ~4
      else half = 4.2 + (t - 0.52) * 30;          // flare to ~18 at hem
      half = Math.max(4, half | 0);
      const bias = (hemBias * t * t) | 0;
      const ox = cx + bias;
      // outline edge
      px(ctx, ox - half - 1, y, C.robeVD);
      px(ctx, ox + half + 1, y, C.robeVD);
      rect(ctx, ox - half, y, half * 2 + 1, 1, t > 0.72 ? C.robeD : C.robe);
      // 4 value steps
      if (t < 0.55) rect(ctx, ox - half + 1, y, Math.max(2, half * 2 - 3), 1, C.robeM);
      if (t < 0.22) {
        rect(ctx, ox - half + 2, y, Math.max(1, half - 3), 1, C.robeL);
        px(ctx, ox - half + 3, y, C.robeH);
      }
      // fold seams
      if ((y % 4) === 0) px(ctx, ox - 2, y, C.robeVD);
      if ((y % 5) === 1) px(ctx, ox + 3 + (bias > 0 ? 1 : 0), y, C.robeD);
    }

    // Overlapping asymmetric panels
    tri(ctx, cx - 1, shoulderY + 3, cx - 9, waistY + 1, cx + 2, hemY - 10, C.robeD);
    tri(ctx, cx + 2, shoulderY + 5, cx + 10, waistY - 1, cx + 4, hemY - 8, C.robe);
    rect(ctx, cx - 1, shoulderY + 2, 2, waistY - shoulderY, C.robeL);
    // Side underlaps
    rect(ctx, cx - 11 + (hemBias * 0.15) | 0, waistY, 3, hemY - waistY - 1, C.robeVD);
    rect(ctx, cx + 8 + (hemBias * 0.15) | 0, waistY + 1, 4, hemY - waistY - 3, C.robeD);
    // Hem scallops
    for (let i = -4; i <= 4; i++) {
      const hx = cx + hemBias + i * 3;
      px(ctx, hx, hemY + 1, C.robeVD);
      px(ctx, hx, hemY, i & 1 ? C.robeL : C.robeM);
      px(ctx, hx + 1, hemY - 1, C.robeD);
    }

    // Chest inset
    rect(ctx, cx - 5, shoulderY + 2, 10, 13, C.robeVD);
    rect(ctx, cx - 4, shoulderY + 3, 8, 11, C.cerbD);
    rect(ctx, cx - 3, shoulderY + 4, 6, 9, C.robeD);
    rect(ctx, cx - 2, shoulderY + 4, 1, 10, C.robeVD);
    rect(ctx, cx + 1, shoulderY + 4, 1, 10, C.robeVD);

    // Thin ritual sash
    rect(ctx, cx - 8, waistY, 16, 1, C.goldD);
    rect(ctx, cx - 7, waistY, 14, 1, C.gold);
    px(ctx, cx - 4, waistY, C.goldL);
    px(ctx, cx + 3, waistY, C.goldL);
    rect(ctx, cx, waistY + 1, 1, 4, C.goldD);
    px(ctx, cx, waistY + 5, C.glow);

    // Capelet / shoulders (narrow — avoid squat top-heavy read)
    oval(ctx, cx - 6, shoulderY, 5, 2, C.robeL);
    oval(ctx, cx + 6, shoulderY, 5, 2, C.robeM);
    rect(ctx, cx - 8, shoulderY - 1, 16, 2, C.robe);
    px(ctx, cx - 7, shoulderY - 1, C.robeH);

    // Sleeves
    function drawSleeve(sx, sy, billow, raised) {
      if (raised) {
        shadeOval(ctx, sx, sy + 3, 4 + (billow / 2) | 0, 6, C.robeVD, C.robeD, C.robe);
        shadeOval(ctx, sx + 3, sy - 4, 5 + (billow > 3 ? 2 : 0), 7, C.robeD, C.robe, C.robeL);
        if (billow > 3) {
          px(ctx, sx + 9, sy - 2, C.robeL);
          px(ctx, sx + 10, sy, C.robeM);
          px(ctx, sx + 8, sy + 3, C.robeVD);
          px(ctx, sx - 4, sy + 5, C.robeD);
        }
        clawHand(ctx, sx + 4, sy - 8, 1, true);
      } else {
        shadeOval(ctx, sx, sy + 2, 4 + (billow / 2) | 0, 10, C.robeVD, C.robeD, C.robe);
        rect(ctx, sx - 2, sy + 9, 5, 5, C.robeD);
        rect(ctx, sx - 1, sy + 10, 3, 3, C.robe);
        px(ctx, sx - 3, sy + 11, C.robeVD);
        clawHand(ctx, sx, sy + 15, sx < cx ? -1 : 1, false);
      }
    }

    if (atk) {
      drawSleeve(cx + sleeveL.ox, shoulderY + 5 + sleeveL.oy, sleeveL.billow, false);
      drawSleeve(cx + sleeveR.ox, shoulderY + 2 + sleeveR.oy, sleeveR.billow, true);
      // Raised ceremonial staff + green flame corona
      const sx = cx + 15 + shake;
      const sy = peakY;
      rect(ctx, sx, sy + 8, 3, 44, '#100c08');
      rect(ctx, sx + 1, sy + 8, 1, 44, '#2a2218');
      px(ctx, sx + 2, sy + 14, '#3a3020');
      rect(ctx, sx - 1, sy + 16, 5, 2, C.goldD);
      rect(ctx, sx, sy + 16, 3, 1, C.goldL);
      rect(ctx, sx - 1, sy + 36, 5, 2, C.goldD);
      px(ctx, sx + 1, sy + 24, C.corrupt);
      rect(ctx, sx - 3, shoulderY - 4, 8, 5, C.robeD);
      rect(ctx, sx - 2, shoulderY - 3, 6, 3, C.robeL);
      clawHand(ctx, sx + 1, shoulderY - 6, 1, true);
      disk(ctx, sx + 1, sy + 5, 4, 'rgba(8,32,16,0.5)');
      pixelFlame(ctx, sx + 1, sy + 6, 15, C.glowSoft, C.glow, '#1a6840');
      pixelFlame(ctx, sx, sy + 5, 10, C.glow, '#2aff6a', C.glowSoft);
      px(ctx, sx - 4, sy + 1, C.glow);
      px(ctx, sx + 6, sy + 3, C.glowSoft);
      px(ctx, sx + 1, sy - 1, '#ffffff');
      rect(ctx, sx, sy + 5, 3, 2, C.goldD);
      px(ctx, sx + 1, sy + 4, C.goldL);
    } else {
      drawSleeve(cx + sleeveL.ox, shoulderY + 5 + sleeveL.oy, sleeveL.billow, false);
      drawSleeve(cx + sleeveR.ox, shoulderY + 5 + sleeveR.oy, sleeveR.billow, false);
      clawHand(ctx, cx - 2, shoulderY + 11, -1, false);
      clawHand(ctx, cx + 2, shoulderY + 11, 1, false);
    }

    // ── Tall pointed hood (peak near top of canvas) ──
    const hx = cx + hoodTilt;
    const hy = peakY;
    // Elongated peak — not a round ball
    tri(ctx, hx - 10, hy + 16, hx, hy, hx + 10, hy + 16, C.robeVD);
    tri(ctx, hx - 8, hy + 16, hx, hy + 2, hx + 8, hy + 16, C.robeD);
    // Vertical hood shaft (elongation)
    rect(ctx, hx - 6, hy + 6, 12, 12, C.robeD);
    rect(ctx, hx - 5, hy + 7, 10, 10, C.robe);
    rect(ctx, hx - 1, hy + 2, 2, 10, C.robeL);
    px(ctx, hx, hy + 1, C.robeH);
    px(ctx, hx, hy, C.robeVD); // peak tip outline
    // Cowl rim
    oval(ctx, hx, hy + 14, 8, 2, C.robeL);
    px(ctx, hx - 6, hy + 14, C.robeH);
    px(ctx, hx + 5, hy + 14, C.robeM);
    // Asymmetric side flaps
    tri(ctx, hx - 9, hy + 14, hx - 13, hy + 22, hx - 3, hy + 20, C.robeD);
    tri(ctx, hx + 7, hy + 15, hx + 12, hy + 21, hx + 2, hy + 19, C.robeVD);

    // Deep void face — pin slits only (never cute rectangles / grille)
    rect(ctx, hx - 5, hy + 13, 10, 9, C.void);
    rect(ctx, hx - 4, hy + 14, 8, 7, '#010201');
    // Deep socket pits
    rect(ctx, hx - 4, hy + 15, 2, 3, '#000000');
    rect(ctx, hx + 2, hy + 15, 2, 3, '#000000');
    const eyeCol = hurt ? '#ffe8c0' : C.eye;
    const eyeHi = hurt ? '#ffffff' : C.glowSoft;
    // 2×1 menacing slits buried in void
    px(ctx, hx - 4, hy + 16, eyeCol);
    px(ctx, hx - 3, hy + 16, eyeHi);
    px(ctx, hx + 2, hy + 16, eyeCol);
    px(ctx, hx + 3, hy + 16, eyeHi);
    // Brow ridge
    rect(ctx, hx - 5, hy + 14, 10, 1, C.robeVD);
    // Chin void
    rect(ctx, hx - 2, hy + 20, 4, 2, C.void);
    // Hood outline readability
    px(ctx, hx - 10, hy + 16, C.robeVD);
    px(ctx, hx + 10, hy + 16, C.robeVD);

    if (hurt) {
      hurtSparks(ctx, [
        [hx - 5, hy + 4], [hx + 7, hy + 8], [cx - 12, shoulderY + 2],
        [cx + 11, waistY - 2], [cx - 8, hemY - 4], [cx + 9, shoulderY + 10],
        [hx, hy], [cx + lean, waistY + 3],
      ]);
    }
  }

  /** LE ImageData packing: A<<24|B<<16|G<<8|R */
  function packPix(r, g, b, a) {
    return ((a == null ? 255 : a) << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255);
  }

  function hash2(x, y) {
    let n = (x * 374761393 + y * 668265263) | 0;
    n = (n ^ (n >>> 13)) * 1274126177;
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  }

  /** Periodic value noise — lattice wraps every `period` cells (tileable). */
  function smoothNoiseWrap(x, y, period) {
    const p = period || 64;
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    const x0 = ((xi % p) + p) % p;
    const y0 = ((yi % p) + p) % p;
    const x1 = (x0 + 1) % p;
    const y1 = (y0 + 1) % p;
    const a = hash2(x0, y0);
    const b = hash2(x1, y0);
    const c = hash2(x0, y1);
    const d = hash2(x1, y1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  function fbmWrap(x, y, oct, period) {
    let amp = 0.5;
    let freq = 1;
    let sum = 0;
    let norm = 0;
    const p = period || 64;
    for (let i = 0; i < oct; i++) {
      // Integer freq + fixed lattice period p → noise(x)=noise(x+p)
      sum += amp * smoothNoiseWrap(x * freq, y * freq, p);
      norm += amp;
      amp *= 0.5;
      freq *= 2;
    }
    return sum / norm;
  }

  /**
   * 64×64 tileable cracked flagstone pavement (dark greens/greys, mossy joints).
   * Returns Uint32Array LE-packed pixels — no horizontal scanline pattern.
   */
  function genPavementTex() {
    const S = 64;
    const out = new Uint32Array(S * S);
    const cell = 32; // larger flagstones readable under perspective
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        // Irregular stone cell via warped grid (tileable wrap)
        const wx = x + fbmWrap(x, y, 3, S) * 3.5;
        const wy = y + fbmWrap(x + 20, y + 11, 3, S) * 3.5;
        const mx = ((wx % S) + S) % S;
        const my = ((wy % S) + S) % S;
        const cx = (mx / cell) | 0;
        const cy = (my / cell) | 0;
        const lx = mx - cx * cell;
        const ly = my - cy * cell;
        const edge = Math.min(lx, ly, cell - 1 - lx, cell - 1 - ly);
        const jointW = 1.2 + hash2(cx, cy) * 0.8;
        const isJoint = edge < jointW;

        const n = fbmWrap(x + cx * 3.1, y + cy * 2.7, 4, S);
        const crack =
          Math.abs(fbmWrap(x + 40, y + 7, 3, S) - 0.5) < 0.04 &&
          hash2(cx + 3, cy + 9) > 0.45;

        let r, g, b;
        if (isJoint) {
          // Mossy dark joint — readable contrast
          const moss = 0.4 + n * 0.5;
          r = (14 + moss * 22) | 0;
          g = (36 + moss * 48) | 0;
          b = (18 + moss * 20) | 0;
        } else {
          // Flagstone body — lighter grey-green so fog doesn't crush it
          const slab = hash2(cx * 17, cy * 31);
          const base = 48 + slab * 28 + n * 22;
          r = (base * 0.58) | 0;
          g = (base * 0.78 + 10) | 0;
          b = (base * 0.52) | 0;
          if (crack) {
            r = (r * 0.5) | 0;
            g = (g * 0.55) | 0;
            b = (b * 0.45) | 0;
          }
          if (((x * 3 + y * 7) & 7) === 0) {
            r = Math.max(0, r - 5);
            g = Math.max(0, g - 3);
            b = Math.max(0, b - 4);
          }
        }
        out[y * S + x] = packPix(r, g, b, 255);
      }
    }
    return out;
  }

  /**
   * Tileable liquid marble: black + toxic neon green swirls.
   * Large coherent eddies. Runtime animates via UV scroll.
   * @param {{bright?:boolean, size?:number}} [opts]
   */
  function genDreamMarbleTex(opts) {
    const bright = !!(opts && opts.bright);
    const S = (opts && opts.size) || 64;
    const out = new Uint32Array(S * S);
    const TAU = Math.PI * 2;
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const u = x / S;
        const v = y / S;
        const a = Math.sin(u * TAU * 2) * Math.cos(v * TAU * 2);
        const bb = Math.sin((u + v) * TAU * 1.5);
        const cc = Math.cos((u - v * 1.2) * TAU * 2);
        const w1 = fbmWrap(x * 0.35, y * 0.35, 3, S);
        const w2 = fbmWrap(x * 0.35 + 11, y * 0.35 + 7, 3, S);
        const wx = u * 2.4 + a * 0.65 + (w1 - 0.5) * 1.6;
        const wy = v * 2.4 + bb * 0.65 + (w2 - 0.5) * 1.6;
        const ribbon =
          Math.sin(wx * TAU * 0.75 + Math.sin(wy * TAU * 0.55) * 1.8) * 0.55 +
          Math.sin(wy * TAU * 0.9 - Math.cos(wx * TAU * 0.5) * 1.4) * 0.45 +
          cc * 0.18;
        let t = ribbon * 0.5 + 0.5;
        const mid = bright ? 0.58 : 0.62;
        t = 1 / (1 + Math.exp(-(t - mid) * (bright ? 8 : 10)));
        const filament = Math.abs(Math.sin(wx * TAU * 1.8 + wy * TAU * 1.5));
        if (filament > 0.985) t = Math.min(1, t + 0.5);

        const grain = (hash2(x, y) - 0.5) * 6;
        let r = (t * (bright ? 18 : 8)) | 0;
        let g = (t * (bright ? 255 : 220) + (1 - t) * 3 + grain) | 0;
        let b = (t * (bright ? 90 : 60)) | 0;
        if (t < 0.22) {
          r = 0;
          g = Math.min(g, 8);
          b = 0;
        }
        out[y * S + x] = packPix(
          Math.max(0, Math.min(255, r)),
          Math.max(0, Math.min(255, g)),
          Math.max(0, Math.min(255, b)),
          255
        );
      }
    }
    return out;
  }

  ST3.Art = {
    COL,
    createCanvas,
    px,
    rect,
    disk,
    shadeDisk,
    oval,
    shadeOval,
    furTuft,
    tri,
    pixelFlame,
    ditherDarken,
    drawCabFace,
    drawFuzzPedal,
    goldCracks,
    drawPixelWord,
    drawGreenPuddle,
    drawMonkFrame,
    MONK_PALETTES,
    resolveMonkPalette,
    genPavementTex,
    genDreamMarbleTex,
  };
})(window.ST3 = window.ST3 || {});
