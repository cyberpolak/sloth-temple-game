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

  /** Speaker cab face (Marshall / Orange / Ampeg) pour textures mur */
  function drawCabFace(ctx, x, y, w, h, brand) {
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
    rect(ctx, x + 4, y + 2, w - 8, 2, badge);
    if (isOrange) rect(ctx, x + 6, y + 2, w - 12, 1, '#ffaa44');
    else if (isAmpeg) rect(ctx, x + 6, y + 2, w - 12, 1, '#c8e0c8');
    else {
      px(ctx, (x + w / 2) | 0, y + 2, COL.goldL);
      px(ctx, ((x + w / 2) | 0) + 3, y + 2, COL.goldL);
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
  function drawMonkFrame(ctx, pose) {
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
      rect(ctx, lx - 2, top, 4, len - 1, COL.robeVD);
      rect(ctx, lx - 1, top + 1, 2, len - 2, COL.robeD);
      if (leg.planted) {
        rect(ctx, lx - 4, footY - 3, 8, 3, COL.robeVD);
        rect(ctx, lx - 3, footY - 2, 6, 2, '#060504');
        px(ctx, lx + 3, footY - 3, COL.goldD);
      } else {
        rect(ctx, lx - 1, top + len - 2, 5, 2, COL.robeVD);
        px(ctx, lx + 3, top + len - 3, COL.robe);
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
      px(ctx, ox - half - 1, y, COL.robeVD);
      px(ctx, ox + half + 1, y, COL.robeVD);
      rect(ctx, ox - half, y, half * 2 + 1, 1, t > 0.72 ? COL.robeD : COL.robe);
      // 4 value steps
      if (t < 0.55) rect(ctx, ox - half + 1, y, Math.max(2, half * 2 - 3), 1, COL.robeM);
      if (t < 0.22) {
        rect(ctx, ox - half + 2, y, Math.max(1, half - 3), 1, COL.robeL);
        px(ctx, ox - half + 3, y, COL.robeH);
      }
      // fold seams
      if ((y % 4) === 0) px(ctx, ox - 2, y, COL.robeVD);
      if ((y % 5) === 1) px(ctx, ox + 3 + (bias > 0 ? 1 : 0), y, COL.robeD);
    }

    // Overlapping asymmetric panels
    tri(ctx, cx - 1, shoulderY + 3, cx - 9, waistY + 1, cx + 2, hemY - 10, COL.robeD);
    tri(ctx, cx + 2, shoulderY + 5, cx + 10, waistY - 1, cx + 4, hemY - 8, COL.robe);
    rect(ctx, cx - 1, shoulderY + 2, 2, waistY - shoulderY, COL.robeL);
    // Side underlaps
    rect(ctx, cx - 11 + (hemBias * 0.15) | 0, waistY, 3, hemY - waistY - 1, COL.robeVD);
    rect(ctx, cx + 8 + (hemBias * 0.15) | 0, waistY + 1, 4, hemY - waistY - 3, COL.robeD);
    // Hem scallops
    for (let i = -4; i <= 4; i++) {
      const hx = cx + hemBias + i * 3;
      px(ctx, hx, hemY + 1, COL.robeVD);
      px(ctx, hx, hemY, i & 1 ? COL.robeL : COL.robeM);
      px(ctx, hx + 1, hemY - 1, COL.robeD);
    }

    // Chest inset
    rect(ctx, cx - 5, shoulderY + 2, 10, 13, COL.robeVD);
    rect(ctx, cx - 4, shoulderY + 3, 8, 11, COL.cerbD);
    rect(ctx, cx - 3, shoulderY + 4, 6, 9, COL.robeD);
    rect(ctx, cx - 2, shoulderY + 4, 1, 10, COL.robeVD);
    rect(ctx, cx + 1, shoulderY + 4, 1, 10, COL.robeVD);

    // Thin ritual sash
    rect(ctx, cx - 8, waistY, 16, 1, COL.goldD);
    rect(ctx, cx - 7, waistY, 14, 1, COL.gold);
    px(ctx, cx - 4, waistY, COL.goldL);
    px(ctx, cx + 3, waistY, COL.goldL);
    rect(ctx, cx, waistY + 1, 1, 4, COL.goldD);
    px(ctx, cx, waistY + 5, COL.glow);

    // Capelet / shoulders (narrow — avoid squat top-heavy read)
    oval(ctx, cx - 6, shoulderY, 5, 2, COL.robeL);
    oval(ctx, cx + 6, shoulderY, 5, 2, COL.robeM);
    rect(ctx, cx - 8, shoulderY - 1, 16, 2, COL.robe);
    px(ctx, cx - 7, shoulderY - 1, COL.robeH);

    // Sleeves
    function drawSleeve(sx, sy, billow, raised) {
      if (raised) {
        shadeOval(ctx, sx, sy + 3, 4 + (billow / 2) | 0, 6, COL.robeVD, COL.robeD, COL.robe);
        shadeOval(ctx, sx + 3, sy - 4, 5 + (billow > 3 ? 2 : 0), 7, COL.robeD, COL.robe, COL.robeL);
        if (billow > 3) {
          px(ctx, sx + 9, sy - 2, COL.robeL);
          px(ctx, sx + 10, sy, COL.robeM);
          px(ctx, sx + 8, sy + 3, COL.robeVD);
          px(ctx, sx - 4, sy + 5, COL.robeD);
        }
        clawHand(ctx, sx + 4, sy - 8, 1, true);
      } else {
        shadeOval(ctx, sx, sy + 2, 4 + (billow / 2) | 0, 10, COL.robeVD, COL.robeD, COL.robe);
        rect(ctx, sx - 2, sy + 9, 5, 5, COL.robeD);
        rect(ctx, sx - 1, sy + 10, 3, 3, COL.robe);
        px(ctx, sx - 3, sy + 11, COL.robeVD);
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
      rect(ctx, sx - 1, sy + 16, 5, 2, COL.goldD);
      rect(ctx, sx, sy + 16, 3, 1, COL.goldL);
      rect(ctx, sx - 1, sy + 36, 5, 2, COL.goldD);
      px(ctx, sx + 1, sy + 24, COL.corrupt);
      rect(ctx, sx - 3, shoulderY - 4, 8, 5, COL.robeD);
      rect(ctx, sx - 2, shoulderY - 3, 6, 3, COL.robeL);
      clawHand(ctx, sx + 1, shoulderY - 6, 1, true);
      disk(ctx, sx + 1, sy + 5, 4, 'rgba(8,32,16,0.5)');
      pixelFlame(ctx, sx + 1, sy + 6, 15, COL.glowSoft, COL.glow, '#1a6840');
      pixelFlame(ctx, sx, sy + 5, 10, COL.glow, '#2aff6a', COL.glowSoft);
      px(ctx, sx - 4, sy + 1, COL.glow);
      px(ctx, sx + 6, sy + 3, COL.glowSoft);
      px(ctx, sx + 1, sy - 1, '#ffffff');
      rect(ctx, sx, sy + 5, 3, 2, COL.goldD);
      px(ctx, sx + 1, sy + 4, COL.goldL);
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
    tri(ctx, hx - 10, hy + 16, hx, hy, hx + 10, hy + 16, COL.robeVD);
    tri(ctx, hx - 8, hy + 16, hx, hy + 2, hx + 8, hy + 16, COL.robeD);
    // Vertical hood shaft (elongation)
    rect(ctx, hx - 6, hy + 6, 12, 12, COL.robeD);
    rect(ctx, hx - 5, hy + 7, 10, 10, COL.robe);
    rect(ctx, hx - 1, hy + 2, 2, 10, COL.robeL);
    px(ctx, hx, hy + 1, COL.robeH);
    px(ctx, hx, hy, COL.robeVD); // peak tip outline
    // Cowl rim
    oval(ctx, hx, hy + 14, 8, 2, COL.robeL);
    px(ctx, hx - 6, hy + 14, COL.robeH);
    px(ctx, hx + 5, hy + 14, COL.robeM);
    // Asymmetric side flaps
    tri(ctx, hx - 9, hy + 14, hx - 13, hy + 22, hx - 3, hy + 20, COL.robeD);
    tri(ctx, hx + 7, hy + 15, hx + 12, hy + 21, hx + 2, hy + 19, COL.robeVD);

    // Deep void face — pin slits only (never cute rectangles / grille)
    rect(ctx, hx - 5, hy + 13, 10, 9, COL.void);
    rect(ctx, hx - 4, hy + 14, 8, 7, '#010201');
    // Deep socket pits
    rect(ctx, hx - 4, hy + 15, 2, 3, '#000000');
    rect(ctx, hx + 2, hy + 15, 2, 3, '#000000');
    const eyeCol = hurt ? '#ffe8c0' : COL.eye;
    const eyeHi = hurt ? '#ffffff' : COL.glowSoft;
    // 2×1 menacing slits buried in void
    px(ctx, hx - 4, hy + 16, eyeCol);
    px(ctx, hx - 3, hy + 16, eyeHi);
    px(ctx, hx + 2, hy + 16, eyeCol);
    px(ctx, hx + 3, hy + 16, eyeHi);
    // Brow ridge
    rect(ctx, hx - 5, hy + 14, 10, 1, COL.robeVD);
    // Chin void
    rect(ctx, hx - 2, hy + 20, 4, 2, COL.void);
    // Hood outline readability
    px(ctx, hx - 10, hy + 16, COL.robeVD);
    px(ctx, hx + 10, hy + 16, COL.robeVD);

    if (hurt) {
      hurtSparks(ctx, [
        [hx - 5, hy + 4], [hx + 7, hy + 8], [cx - 12, shoulderY + 2],
        [cx + 11, waistY - 2], [cx - 8, hemY - 4], [cx + 9, shoulderY + 10],
        [hx, hy], [cx + lean, waistY + 3],
      ]);
    }
  }

  /* ═══════════════════════════════════════════════════════════
     Hound — low predatory ash-beast (64×64)
     Long body (~50px), thick haunches, thin forelegs, arched
     jagged spine, tapered snout, slit eyes
     Poses: idle | walk0 | walk1 | attack | hurt
     ═══════════════════════════════════════════════════════════ */
  function drawHoundFrame(ctx, pose) {
    const hurt = pose === 'hurt';
    const atk = pose === 'attack';
    const w1 = pose === 'walk1';
    const walk = pose === 'walk0' || pose === 'walk1';
    const shake = hurt ? 1 : 0;

    let stretch = 0;
    let crouch = 0;
    let arch = 0;
    let headDip = 0;
    let tailSwing = 0;
    let legs = [
      { x: 18, lift: 0, planted: true, rear: false },
      { x: 26, lift: 0, planted: true, rear: false },
      { x: 40, lift: 0, planted: true, rear: true },
      { x: 49, lift: 0, planted: true, rear: true },
    ];

    if (walk) {
      crouch = w1 ? 1 : 0;
      arch = w1 ? 2 : 1;
      headDip = w1 ? 0 : -2;
      tailSwing = w1 ? -5 : 5;
      if (w1) {
        legs = [
          { x: 15, lift: 9, planted: false, rear: false },
          { x: 29, lift: 0, planted: true, rear: false },
          { x: 43, lift: 0, planted: true, rear: true },
          { x: 46, lift: 8, planted: false, rear: true },
        ];
      } else {
        legs = [
          { x: 21, lift: 0, planted: true, rear: false },
          { x: 23, lift: 9, planted: false, rear: false },
          { x: 37, lift: 8, planted: false, rear: true },
          { x: 51, lift: 0, planted: true, rear: true },
        ];
      }
    } else if (atk) {
      stretch = 5;
      crouch = -3;
      arch = 4;
      headDip = -4;
      tailSwing = -6;
      legs = [
        { x: 24, lift: 0, planted: true, rear: false },
        { x: 32, lift: 0, planted: true, rear: false },
        { x: 40, lift: 3, planted: false, rear: true },
        { x: 48, lift: 4, planted: false, rear: true },
      ];
    } else if (hurt) {
      stretch = -3;
      crouch = 3;
      arch = -2;
      headDip = 4;
      tailSwing = 4;
      legs = [
        { x: 16, lift: 2, planted: false, rear: false },
        { x: 25, lift: 0, planted: true, rear: false },
        { x: 41, lift: 0, planted: true, rear: true },
        { x: 47, lift: 3, planted: false, rear: true },
      ];
    } else {
      crouch = 2;
      arch = 3;
      headDip = -1;
      tailSwing = 2;
      legs = [
        { x: 19, lift: 0, planted: true, rear: false },
        { x: 26, lift: 1, planted: true, rear: false },
        { x: 41, lift: 0, planted: true, rear: true },
        { x: 50, lift: 0, planted: true, rear: true },
      ];
    }

    const bodyY = 33 + crouch;
    const spineY = bodyY - 7 - arch;
    const bellyY = bodyY + 9;
    const footY = 58 + (crouch > 0 ? 1 : 0);

    oval(ctx, 32 + shake, footY + 1, 22, 2, 'rgba(0,0,0,0.55)');

    // Legs — thin fore / thick rear haunches
    for (let i = 0; i < legs.length; i++) {
      const L = legs[i];
      const lx = L.x + stretch * (L.rear ? 0 : 0.4) + shake;
      const thick = L.rear ? 9 : 4;
      const top = bodyY + (L.rear ? 1 : 4) - L.lift;
      const len = footY - top - (L.planted ? 0 : 1);
      const hx0 = (lx - thick / 2) | 0;
      rect(ctx, hx0, top, thick, Math.max(3, (len * 0.42) | 0), COL.cerbD);
      rect(ctx, hx0 + 1, top + 1, Math.max(1, thick - 2), Math.max(2, (len * 0.38) | 0), COL.cerb);
      if (L.rear) {
        shadeOval(ctx, lx - 1, top - 3, 8, 7, COL.cerbVD, COL.cerb, COL.cerbL);
        px(ctx, lx - 5, top - 2, COL.cerbH);
        px(ctx, lx + 3, top - 1, COL.cerbH);
        px(ctx, lx, top - 4, COL.cerbL);
      } else {
        // Foreleg shoulder knuckle (not a stick from the torso)
        shadeOval(ctx, lx, top - 1, 3, 3, COL.cerbD, COL.cerb, COL.cerbL);
      }
      const mid = top + ((len * 0.42) | 0);
      const shinW = L.rear ? 4 : 2;
      const sx0 = (lx - shinW / 2) | 0;
      rect(ctx, sx0, mid, shinW, Math.max(3, len - ((len * 0.42) | 0)), COL.cerbVD);
      if (shinW > 2) rect(ctx, sx0 + 1, mid, shinW - 2, Math.max(2, len - ((len * 0.42) | 0) - 1), COL.cerbL);
      px(ctx, lx, mid, COL.cerbH);
      if (L.planted) {
        const pw = L.rear ? 9 : 5;
        const px0 = (lx - pw / 2) | 0;
        rect(ctx, px0, footY - 2, pw, 3, COL.ashD);
        rect(ctx, px0 + 1, footY - 1, pw - 2, 2, COL.cerbVD);
        px(ctx, lx - 2, footY, COL.clawL);
        px(ctx, lx, footY, COL.claw);
        px(ctx, lx + 2, footY, COL.clawL);
        if (L.rear) px(ctx, lx + 3, footY - 1, COL.claw);
      } else {
        rect(ctx, lx - 1, top + len - 2, 3, 2, COL.clawD);
        px(ctx, lx + 1, top + len - 3, COL.clawL);
      }
    }

    // Continuous long body (x≈8→56) — overlapping masses, not vertical stripes
    const bx0 = 8 + shake;
    const bx1 = 56 + stretch + shake;
    // Haunch mass (rear — thick predatory drive)
    shadeOval(ctx, 14 + shake, bodyY + 1, 12, 11, COL.cerbVD, COL.cerbD, COL.cerb);
    shadeOval(ctx, 12 + shake, bodyY - 2, 9, 8, COL.cerbD, COL.cerb, COL.cerbL);
    px(ctx, 9 + shake, bodyY - 4, COL.cerbH);
    px(ctx, 10 + shake, bodyY - 1, COL.cerbH);
    // Mid torso bridge (smooth ovals following arch)
    shadeOval(ctx, 28 + stretch * 0.2 + shake, bodyY - arch * 0.3, 14, 7, COL.cerbVD, COL.cerbD, COL.cerb);
    shadeOval(ctx, 34 + stretch * 0.3 + shake, bodyY - 1 - arch * 0.2, 11, 6, COL.cerbD, COL.cerb, COL.cerbL);
    // Spine ridge fill (arched top silhouette)
    oval(ctx, 30 + stretch * 0.2 + shake, spineY + 6, 16, 4, COL.cerbD);
    oval(ctx, 30 + stretch * 0.2 + shake, spineY + 5, 14, 3, COL.cerb);
    // Chest / shoulders
    shadeOval(ctx, 46 + stretch + shake, bodyY - 1, 9, 8, COL.cerbD, COL.cerb, COL.cerbH);
    px(ctx, 48 + stretch + shake, bodyY - 5, COL.cerbH);
    // Belly tuck
    shadeOval(ctx, 28 + shake, bellyY - 1, 14, 3, COL.cerbVD, COL.ashD, COL.ash);
    // Muscle / rib ticks (sparse — not segment bars)
    px(ctx, 22 + shake, bodyY + 2, COL.cerbVD);
    px(ctx, 27 + shake, bodyY - 2, COL.cerbH);
    px(ctx, 32 + shake, bodyY + 1, COL.cerbVD);
    px(ctx, 37 + shake, bodyY - 2, COL.cerbH);
    px(ctx, 42 + stretch * 0.3 + shake, bodyY + 1, COL.cerbVD);
    // Outline edges for dark BG
    px(ctx, bx0 + 1, bellyY, COL.cerbVD);
    px(ctx, bx1 - 3, bodyY + 2, COL.cerbVD);

    // Jagged dorsal spines + fur
    const spines = [
      [12, 5], [17, 8], [22, 6], [27, 10], [32, 7], [37, 11], [42, 7], [47, 5], [51, 3],
    ];
    for (let i = 0; i < spines.length; i++) {
      const sx = spines[i][0] + stretch * (spines[i][0] / 55) + shake;
      const sh = spines[i][1] + (atk && i > 4 ? 2 : 0) + (walk && w1 && (i & 1) ? 1 : 0);
      const base = spineY + 5;
      tri(ctx, sx, base, sx + 2, base - sh, sx + 4, base, (i & 1) ? COL.cerbD : COL.cerbVD);
      tri(ctx, sx + 1, base, sx + 2, base - sh + 1, sx + 3, base, (i & 1) ? COL.ashL : COL.cerbL);
      if (!(i & 1)) {
        px(ctx, sx - 1, base + 1, COL.cerbH);
        px(ctx, sx + 4, base, COL.ash);
      }
    }
    furTuft(ctx, 14 + shake, spineY + 4, 5, -2.3, COL.cerbL);
    furTuft(ctx, 34 + stretch * 0.3 + shake, spineY + 1, 5, -0.5, COL.ashL);
    furTuft(ctx, 48 + stretch + shake, bodyY - 5, 4, 0.7, COL.cerbH);
    oval(ctx, 19 + shake, spineY - 1, 3, 2, COL.smoke);
    oval(ctx, 38 + stretch * 0.3 + shake, spineY - 3, 4, 3, COL.smokeL);

    // Tail ash plume
    const tx = 7 + shake;
    const ty = bodyY + (walk ? (w1 ? -2 : 2) : 1);
    shadeOval(ctx, tx + 3, ty + 1, 5, 4, COL.cerbVD, COL.cerbD, COL.cerb);
    oval(ctx, tx - 1 + tailSwing * 0.3, ty - 1, 4, 3, COL.cerbD);
    oval(ctx, tx - 4 + tailSwing * 0.6, ty - 3, 4, 3, COL.smoke);
    oval(ctx, tx - 7 + tailSwing, ty - 6, 3, 2, COL.smokeL);
    px(ctx, tx - 8 + tailSwing, ty - 7, COL.ashL);

    // Head — elongated tapered snout
    const hx = 48 + stretch + shake;
    const hy = bodyY - 5 + headDip;
    shadeOval(ctx, hx - 8, hy + 3, 6, 5, COL.cerbVD, COL.cerbD, COL.cerb);
    furTuft(ctx, hx - 10, hy, 4, -1.9, COL.cerbL);
    // Angular skull
    rect(ctx, hx - 6, hy - 3, 11, 8, COL.cerbD);
    rect(ctx, hx - 5, hy - 2, 9, 6, COL.cerb);
    px(ctx, hx - 4, hy - 4, COL.cerbH);
    rect(ctx, hx - 5, hy - 3, 8, 1, COL.cerbL);

    // Ears swept back
    const earBack = hurt ? 2 : 0;
    tri(ctx, hx - 6, hy - 1 + earBack, hx - 10, hy - 8 + earBack, hx - 3, hy + 1, COL.cerbD);
    tri(ctx, hx - 5, hy - 1 + earBack, hx - 9, hy - 7 + earBack, hx - 4, hy, COL.cerbL);
    tri(ctx, hx + 1, hy - 2 + earBack, hx + 5, hy - 9 + earBack, hx + 5, hy + 1, COL.cerbVD);
    tri(ctx, hx + 2, hy - 2 + earBack, hx + 5, hy - 8 + earBack, hx + 4, hy, COL.cerb);
    px(ctx, hx - 9, hy - 6 + earBack, COL.cerbH);

    // Tapered snout wedge (~to x=62)
    const jawGap = atk ? 6 : 0;
    tri(ctx, hx + 2, hy - 1, hx + 17, hy + 2, hx + 3, hy + 5, COL.cerb);
    tri(ctx, hx + 3, hy, hx + 16, hy + 2, hx + 4, hy + 4, COL.cerbL);
    rect(ctx, hx + 2, hy + 1, 12, 3, COL.cerbD);
    px(ctx, hx + 16, hy + 2, COL.cerbVD);
    px(ctx, hx + 17, hy + 2, '#080604');
    px(ctx, hx + 15, hy + 1, '#080604');

    if (atk) {
      tri(ctx, hx + 2, hy + 5, hx + 15, hy + 5 + jawGap, hx + 3, hy + 9 + jawGap, COL.cerbD);
      rect(ctx, hx + 3, hy + 5, 10, jawGap + 1, '#080404');
      tri(ctx, hx + 4, hy + 4, hx + 5, hy + 12, hx + 6, hy + 4, COL.boneL);
      tri(ctx, hx + 7, hy + 4, hx + 8, hy + 11, hx + 9, hy + 4, COL.bone);
      tri(ctx, hx + 10, hy + 4, hx + 11, hy + 10, hx + 12, hy + 4, COL.boneL);
      tri(ctx, hx + 13, hy + 4, hx + 14, hy + 8, hx + 15, hy + 4, COL.bone);
      tri(ctx, hx + 5, hy + 9 + jawGap, hx + 6, hy + 5 + jawGap, hx + 7, hy + 9 + jawGap, COL.boneD);
      tri(ctx, hx + 9, hy + 9 + jawGap, hx + 10, hy + 5 + jawGap, hx + 11, hy + 9 + jawGap, COL.bone);
      oval(ctx, hx + 13, hy + 6 + jawGap, 6, 3, 'rgba(74,255,138,0.42)');
      oval(ctx, hx + 17, hy + 5 + jawGap, 4, 2, COL.smokeL);
      px(ctx, hx + 19, hy + 3 + jawGap, COL.glow);
      px(ctx, hx + 16, hy + 2 + jawGap, COL.glowSoft);
      pixelFlame(ctx, hx + 15, hy + 8 + jawGap, 6, COL.glow, '#2a8848', COL.glowSoft);
    } else {
      rect(ctx, hx + 3, hy + 4, 12, 1, COL.cerbVD);
      px(ctx, hx + 6, hy + 4, COL.boneD);
      px(ctx, hx + 10, hy + 4, COL.boneD);
      rect(ctx, hx + 3, hy + 5, 10, 2, COL.cerbD);
    }

    // Eyes: single-pixel pin-glow in deep sockets
    const eye = hurt ? '#ffffff' : COL.eye;
    const eg = hurt ? '#ffe8c0' : COL.glowSoft;
    rect(ctx, hx - 5, hy, 3, 3, '#010201');
    rect(ctx, hx, hy, 3, 3, '#010201');
    px(ctx, hx - 4, hy + 1, eye);
    px(ctx, hx - 3, hy + 1, eg);
    px(ctx, hx + 1, hy + 1, eye);
    px(ctx, hx + 2, hy + 1, eg);

    px(ctx, hx - 6, hy - 3, COL.cerbVD);
    px(ctx, hx + 16, hy + 2, COL.cerbVD);
    px(ctx, bx0, bellyY, COL.cerbVD);
    px(ctx, bx1 - 2, bodyY, COL.cerbVD);

    if (hurt) {
      hurtSparks(ctx, [
        [hx + 5, hy - 5], [14 + shake, spineY], [36 + shake, bodyY - 7],
        [hx - 8, hy + 2], [22 + shake, bellyY], [48 + stretch + shake, bodyY - 4],
        [tx - 4, ty - 4], [hx + 12, hy],
      ]);
    }
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
    drawHoundFrame,
  };
})(window.ST3 = window.ST3 || {});
