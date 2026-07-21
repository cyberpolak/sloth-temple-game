/* SHA'UR'NA — rendu floor/ceiling + sprites Z-buffer + VFX + ambiance */
(function (ST3) {
  'use strict';

  const VW = 320;
  const VH = 200;
  const FOG_MAX = 14;
  const SPR = 64;
  const MAX_AMBIENT = 40;
  const MAX_FX = 120;

  let buffer = null;
  let bctx = null;
  let screen = null;
  let sctx = null;
  let zBuffer = null;
  let spriteCache = {};
  let ambient = [];
  let ambientT = 0;
  let fxParticles = [];
  let lastFxDt = 0.016;
  let lastAmpBass = 0;
  let camShake = 0;

  function Art() {
    return ST3.Art;
  }
  function COL() {
    return ST3.Art.COL;
  }

  function init(canvas) {
    screen = canvas;
    sctx = canvas.getContext('2d');
    buffer = ST3.Utils.createCanvas(VW, VH);
    bctx = buffer.getContext('2d');
    bctx.imageSmoothingEnabled = false;
    zBuffer = new Float32Array(VW);
    ST3.Raycaster.initTextures();
    buildSprites();
    initAmbient();
    fxParticles = [];
    lastAmpBass = 0;
    camShake = 0;
    resize();
    window.addEventListener('resize', resize);
  }

  function resize() {
    if (!screen) return;
    const scale = Math.min(window.innerWidth / VW, window.innerHeight / VH);
    screen.style.width = Math.floor(VW * scale) + 'px';
    screen.style.height = Math.floor(VH * scale) + 'px';
    screen.width = VW;
    screen.height = VH;
  }

  function makeSprite(drawFn, size) {
    const s = size || SPR;
    const c = ST3.Utils.createCanvas(s, s);
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    drawFn(ctx, s);
    return c;
  }

  /* Monk / hound frames live in art.js (AAA silhouette craft) */
  function drawMonkFrame(ctx, pose) {
    Art().drawMonkFrame(ctx, pose);
  }
  function drawHoundFrame(ctx, pose) {
    Art().drawHoundFrame(ctx, pose);
  }

  /* ─── Boss: awakened seal orb ─── */
  function drawBossFrame(ctx, pose) {
    const A = Art();
    const C = COL();
    const hurt = pose === 'hurt';
    const atk = pose === 'attack';
    const idle = pose === 'idle';
    const pulse = pose === 'walk1' || atk ? 1 : 0;
    const floatY = pose === 'walk0' ? 1 : pose === 'walk1' ? -1 : atk ? -2 : 0;
    const cx = 32;
    const cy = 34 + floatY;
    const r = 19 + pulse;

    // Green flame corona — larger & more violent when attacking
    const corona = atk ? 0.42 : hurt ? 0.3 : 0.2;
    A.disk(ctx, cx, cy, r + 12 + (atk ? 4 : 0), 'rgba(20,90,50,' + corona + ')');
    A.disk(ctx, cx, cy, r + 7, 'rgba(74,255,138,' + (atk ? 0.28 : 0.14) + ')');
    A.disk(ctx, cx, cy, r + 3, 'rgba(191,255,200,' + (atk ? 0.18 : 0.08) + ')');

    const flames = [
      [8, 12],
      [16, 6],
      [24, 3],
      [32, 1],
      [40, 3],
      [48, 6],
      [54, 12],
    ];
    for (let i = 0; i < flames.length; i++) {
      const fh = 9 + ((i + pulse + (atk ? 3 : 0)) % 4) * 3 + (hurt ? 2 : 0);
      A.pixelFlame(ctx, flames[i][0], flames[i][1] + floatY + 5, fh, C.glowSoft, C.glow, '#1a6a38');
    }

    // Cracked totem body — stone + amp-grille silhouette
    A.shadeDisk(ctx, cx, cy, r, '#060e08', '#142418', '#2a4030');
    A.disk(ctx, cx - 5, cy - 7, 7, 'rgba(180,255,200,0.12)');

    // Amp grille body hints (Marshall dark metal band across midsection)
    A.rect(ctx, cx - 14, cy + 4, 28, 10, C.marshallD);
    A.rect(ctx, cx - 13, cy + 5, 26, 8, C.marshall);
    for (let g = 0; g < 7; g++) {
      A.rect(ctx, cx - 11 + g * 4, cy + 6, 2, 6, '#080606');
      A.px(ctx, cx - 10 + g * 4, cy + 7, C.marshallL);
    }
    // Gold corner studs on grille
    A.rect(ctx, cx - 14, cy + 4, 3, 3, C.gold);
    A.rect(ctx, cx + 11, cy + 4, 3, 3, C.gold);
    A.rect(ctx, cx - 14, cy + 11, 3, 3, C.gold);
    A.rect(ctx, cx + 11, cy + 11, 3, 3, C.gold);

    // Cracked gold veins
    ctx.strokeStyle = hurt ? '#ffe89a' : C.gold;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 14, cy - 10);
    ctx.lineTo(cx - 4, cy - 2);
    ctx.lineTo(cx - 10, cy + 8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 12, cy - 12);
    ctx.lineTo(cx + 3, cy - 1);
    ctx.lineTo(cx + 14, cy + 9);
    ctx.stroke();
    ctx.strokeStyle = C.goldL;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 2, cy - 16);
    ctx.lineTo(cx + 1, cy - 4);
    ctx.lineTo(cx - 3, cy + 2);
    ctx.stroke();
    // Extra fracture lines when hurt
    if (hurt || atk) {
      ctx.strokeStyle = C.goldL;
      ctx.beginPath();
      ctx.moveTo(cx + 6, cy - 6);
      ctx.lineTo(cx + 10, cy + 2);
      ctx.stroke();
      A.rect(ctx, cx - 16, cy - 4, 5, 2, C.goldL);
      A.rect(ctx, cx + 10, cy + 2, 6, 2, C.gold);
    }

    // Outer ritual ring
    ctx.strokeStyle = C.glow;
    ctx.lineWidth = atk ? 3 : 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 13 + pulse, 0, Math.PI * 2);
    ctx.stroke();
    if (atk || !idle) {
      ctx.strokeStyle = 'rgba(74,255,138,0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, 16 + pulse, 0.2, Math.PI * 1.4);
      ctx.stroke();
    }

    // Somnul eye — dilated & terrifying
    const eyeR = atk ? 9 : 8;
    A.shadeDisk(ctx, cx, cy - 2, eyeR, '#040a06', C.eye, C.glowSoft);
    A.disk(ctx, cx, cy - 2, eyeR - 2, '#061810');
    A.shadeDisk(ctx, cx, cy - 2, 4, '#041008', C.eye, C.glow);
    A.disk(ctx, cx + 1, cy - 1, 2, '#020804');
    A.px(ctx, cx - 2, cy - 4, '#ffffff');
    A.px(ctx, cx + 2, cy, C.glowSoft);
    // Vertical slit pupil (awakened)
    A.rect(ctx, cx - 1, cy - 6, 2, 9, '#020804');
    A.rect(ctx, cx, cy - 5, 1, 7, C.glow);

    if (atk) {
      A.disk(ctx, cx, cy - 2, 12, 'rgba(74,255,138,0.4)');
      A.rect(ctx, cx - 1, cy - 24, 2, 10, C.glowSoft);
      A.rect(ctx, cx - 12, cy - 20, 2, 8, C.glow);
      A.rect(ctx, cx + 10, cy - 20, 2, 8, C.glow);
      A.rect(ctx, cx - 18, cy - 8, 6, 2, C.glowSoft);
      A.rect(ctx, cx + 12, cy - 8, 6, 2, C.glowSoft);
    }
    if (hurt) {
      A.disk(ctx, cx, cy, r + 3, 'rgba(255,240,200,0.32)');
      A.rect(ctx, cx - 15, cy - 3, 7, 2, C.goldL);
      A.rect(ctx, cx + 8, cy + 7, 6, 2, C.goldL);
      A.disk(ctx, cx, cy - 2, 10, 'rgba(255,200,120,0.2)');
    }
  }

  /* ─── Seals: four distinct ritual discs (64–80px) ─── */
  function sealBaseDisc(ctx, cx, cy, r, dark, mid, lite, auraR, auraA) {
    const A = Art();
    const C = COL();
    A.oval(ctx, cx, cy + r + 6, r * 0.85, 3, 'rgba(0,0,0,0.35)');
    A.disk(ctx, cx, cy, auraR || r + 8, 'rgba(40,100,70,' + (auraA != null ? auraA : 0.18) + ')');
    A.disk(ctx, cx, cy, (auraR || r + 8) - 4, 'rgba(74,255,138,0.08)');
    A.shadeDisk(ctx, cx, cy, r, dark, mid, lite);
    // Beveled rim
    ctx.strokeStyle = C.gold;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 1, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = C.goldL;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 3, -2.2, -0.4);
    ctx.stroke();
  }

  /** 0 — Sceau du Silence: muted moss stone, closed eye, soft green */
  function drawSealSilence(ctx) {
    const A = Art();
    const C = COL();
    const cx = 32;
    const cy = 30;
    sealBaseDisc(ctx, cx, cy, 20, '#0c1810', '#1a3020', '#2a4030', 28, 0.14);
    // Moss flecks
    A.px(ctx, cx - 10, cy - 6, '#2a5840');
    A.px(ctx, cx + 8, cy + 4, '#1a4830');
    A.px(ctx, cx - 4, cy + 10, '#3a6850');
    A.px(ctx, cx + 12, cy - 2, '#243828');
    A.goldCracks(ctx, cx, cy, [
      [-14, -4, -6, -8, 2, -4],
      [8, -10, 12, -2, 14, 6],
      [-10, 8, -2, 12, 6, 10],
    ], '#8a7040', '#c8a868');
    // Closed eyelid (horizontal slit — silence)
    A.shadeOval(ctx, cx, cy, 10, 6, '#061008', '#122018', '#1a3028');
    A.oval(ctx, cx, cy - 1, 9, 3, '#0a1810');
    A.rect(ctx, cx - 8, cy, 16, 2, '#1a2820');
    A.rect(ctx, cx - 6, cy, 12, 1, '#2a4030');
    // Soft lid crease + muted glow (not open)
    A.rect(ctx, cx - 5, cy + 1, 10, 1, 'rgba(74,255,138,0.25)');
    A.px(ctx, cx - 2, cy, C.glowSoft);
    A.disk(ctx, cx, cy, 22, 'rgba(74,255,138,0.06)');
  }

  /** 1 — Sceau du Riff: amp grille, Marshall gold, vibrating look */
  function drawSealRiff(ctx) {
    const A = Art();
    const C = COL();
    const cx = 32;
    const cy = 30;
    // Dual offset aura = vibration read
    A.disk(ctx, cx - 1, cy, 30, 'rgba(40,100,70,0.12)');
    A.disk(ctx, cx + 2, cy - 1, 28, 'rgba(200,160,64,0.1)');
    sealBaseDisc(ctx, cx, cy, 20, C.marshallD, C.marshall, C.marshallL, 26, 0.16);
    // Speaker grille cloth
    A.disk(ctx, cx, cy, 14, '#080606');
    ctx.fillStyle = 'rgba(40,36,28,0.55)';
    for (let yy = cy - 12; yy <= cy + 12; yy += 2) {
      for (let xx = cx - 12 + (yy & 1); xx <= cx + 12; xx += 2) {
        const dx = xx - cx;
        const dy = yy - cy;
        if (dx * dx + dy * dy <= 144) ctx.fillRect(xx, yy, 1, 1);
      }
    }
    // Dual concentric cones (amp face)
    A.shadeDisk(ctx, cx - 5, cy, 6, '#050403', '#2a2820', '#4a4840');
    A.shadeDisk(ctx, cx + 5, cy, 6, '#050403', '#2a2820', '#4a4840');
    A.disk(ctx, cx - 5, cy, 2, '#1a1810');
    A.disk(ctx, cx + 5, cy, 2, '#1a1810');
    // Marshall-gold badge arc + corner protectors
    A.rect(ctx, cx - 8, cy - 16, 16, 2, C.gold);
    A.px(ctx, cx - 4, cy - 16, C.goldL);
    A.px(ctx, cx + 4, cy - 16, C.goldL);
    A.rect(ctx, cx - 18, cy - 6, 3, 3, C.gold);
    A.rect(ctx, cx + 15, cy - 6, 3, 3, C.gold);
    A.rect(ctx, cx - 18, cy + 8, 3, 3, C.gold);
    A.rect(ctx, cx + 15, cy + 8, 3, 3, C.gold);
    A.goldCracks(ctx, cx, cy, [
      [-16, 2, -10, -6, -4, 0],
      [6, -12, 14, -4, 16, 8],
    ]);
    // Sound-wave chevrons (vibrate)
    ctx.strokeStyle = C.glow;
    ctx.lineWidth = 1;
    for (let w = 0; w < 3; w++) {
      ctx.beginPath();
      ctx.arc(cx, cy, 10 + w * 3, -0.9, 0.9);
      ctx.stroke();
    }
    A.px(ctx, cx + 14, cy - 2, C.glowSoft);
    A.px(ctx, cx - 14, cy + 2, C.glow);
  }

  /** 2 — Sceau de la Fumée: ethereal mist wisps around disc */
  function drawSealSmoke(ctx) {
    const A = Art();
    const C = COL();
    const cx = 32;
    const cy = 30;
    // Soft outer mist cloud
    A.oval(ctx, cx - 14, cy - 8, 8, 5, 'rgba(106,154,170,0.35)');
    A.oval(ctx, cx + 16, cy + 2, 9, 6, 'rgba(74,255,138,0.2)');
    A.oval(ctx, cx - 4, cy + 16, 10, 5, 'rgba(168,216,200,0.28)');
    A.oval(ctx, cx + 10, cy - 14, 7, 4, 'rgba(106,154,170,0.3)');
    A.oval(ctx, cx - 18, cy + 6, 6, 4, 'rgba(74,255,138,0.15)');
    sealBaseDisc(ctx, cx, cy, 18, '#0a1814', '#152820', '#2a4038', 32, 0.2);
    // Translucent veil over disc
    A.disk(ctx, cx, cy, 15, 'rgba(106,154,170,0.22)');
    A.shadeOval(ctx, cx - 4, cy - 2, 10, 7, 'rgba(10,24,20,0.5)', 'rgba(40,80,70,0.45)', 'rgba(168,216,200,0.35)');
    A.goldCracks(ctx, cx, cy, [
      [-12, -2, -4, -10, 4, -6],
      [2, 6, 10, 2, 14, 10],
      [-8, 10, 0, 14],
    ], C.gold, C.goldL);
    // Wispy spiral eye (half-formed)
    A.oval(ctx, cx, cy, 7, 4, 'rgba(8,20,16,0.7)');
    A.shadeDisk(ctx, cx + 1, cy, 3, '#061008', C.mistL, C.glowSoft);
    A.px(ctx, cx, cy - 1, '#ffffff');
    // Rising smoke curls (pixel stairs)
    const wisps = [
      [cx - 12, cy - 14],
      [cx + 8, cy - 18],
      [cx + 16, cy - 6],
      [cx - 16, cy + 4],
    ];
    for (let i = 0; i < wisps.length; i++) {
      const wx = wisps[i][0];
      const wy = wisps[i][1];
      A.oval(ctx, wx, wy, 4, 3, 'rgba(74,255,138,0.25)');
      A.oval(ctx, wx + (i % 2 ? 2 : -2), wy - 3, 3, 2, 'rgba(191,255,200,0.35)');
      A.px(ctx, wx, wy - 5, C.glowSoft);
    }
  }

  /** 3 — Sceau de Sha'ur'na: ornate boss foreshadow, open Somnul eye */
  function drawSealShaurNa(ctx) {
    const A = Art();
    const C = COL();
    const cx = 40;
    const cy = 38;
    // Larger aura
    A.disk(ctx, cx, cy, 36, 'rgba(40,120,70,0.22)');
    A.disk(ctx, cx, cy, 28, 'rgba(74,255,138,0.14)');
    A.disk(ctx, cx, cy, 22, 'rgba(200,160,64,0.1)');
    A.oval(ctx, cx, cy + 28, 16, 4, 'rgba(0,0,0,0.4)');
    A.shadeDisk(ctx, cx, cy, 22, '#0a180c', '#1a3020', '#2a4838');
    // Ornate double rim
    ctx.strokeStyle = C.gold;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 21, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = C.goldL;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = C.glow;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 15, 0, Math.PI * 2);
    ctx.stroke();
    // Flame tips around rim (boss foreshadow)
    const tips = [[-16, -14], [-4, -20], [10, -18], [18, -8], [16, 10], [-14, 12]];
    for (let i = 0; i < tips.length; i++) {
      A.pixelFlame(ctx, cx + tips[i][0], cy + tips[i][1] + 4, 5 + (i % 2), C.glowSoft, C.glow, '#2a8a4a');
    }
    A.goldCracks(ctx, cx, cy, [
      [-18, -6, -8, -14, 0, -8, 4, -2],
      [8, -12, 14, -4, 18, 6],
      [-14, 8, -6, 14, 4, 16, 12, 8],
      [-4, 4, 2, 10],
    ]);
    // Open Somnul eye (matches boss orb)
    A.shadeOval(ctx, cx, cy, 11, 7, '#061008', '#0a2010', null);
    A.shadeDisk(ctx, cx, cy, 7, '#061008', C.eye, C.glowSoft);
    A.disk(ctx, cx + 1, cy, 3, '#041008');
    A.px(ctx, cx - 2, cy - 2, '#ffffff');
    A.px(ctx, cx + 2, cy + 1, C.glowSoft);
    // Gold brow / sigil horns
    ctx.strokeStyle = C.goldL;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy - 8);
    ctx.lineTo(cx - 2, cy - 2);
    ctx.lineTo(cx - 6, cy + 8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 8, cy - 10);
    ctx.lineTo(cx + 2, cy - 2);
    ctx.lineTo(cx + 10, cy + 6);
    ctx.stroke();
    A.disk(ctx, cx, cy, 26, 'rgba(74,255,138,0.1)');
  }

  function drawSealByIndex(ctx, index) {
    if (index === 1) drawSealRiff(ctx);
    else if (index === 2) drawSealSmoke(ctx);
    else if (index === 3) drawSealShaurNa(ctx);
    else drawSealSilence(ctx);
  }

  function drawPlayerBolt(ctx) {
    const A = Art();
    const C = COL();
    for (let i = 0; i < 8; i++) {
      A.oval(ctx, 32, 8 + i * 6, 3 + (i % 3) + 2, 3, 'rgba(74,255,138,0.2)');
    }
    A.oval(ctx, 32, 32, 6, 22, 'rgba(90,200,140,0.45)');
    A.rect(ctx, 29, 10, 6, 44, C.glow);
    A.rect(ctx, 30, 12, 4, 40, C.glowSoft);
    A.rect(ctx, 31, 18, 2, 20, '#ffffff');
    A.disk(ctx, 32, 10, 3, C.glowSoft);
    A.px(ctx, 32, 8, '#ffffff');
  }

  function drawEnemyBolt(ctx) {
    const A = Art();
    const C = COL();
    A.oval(ctx, 32, 32, 7, 18, 'rgba(138,154,64,0.35)');
    A.rect(ctx, 28, 14, 8, 36, C.corruptD);
    A.rect(ctx, 29, 16, 6, 32, C.corrupt);
    A.rect(ctx, 30, 20, 4, 24, C.corruptL);
    A.rect(ctx, 31, 24, 2, 12, '#ffe8a0');
    A.disk(ctx, 32, 14, 3, C.corruptL);
    A.px(ctx, 26, 28, C.glow);
    A.px(ctx, 38, 34, '#a8c060');
  }

  /* AMMO — boxy metal amp-crate + stacked fuzz / cry vials (reads as cry fuel) */
  function drawAmmoPickup(ctx) {
    const A = Art();
    const C = COL();
    const cx = 32;

    // Soft green bloom so the crate pops vs dark walls at raycaster scale
    A.disk(ctx, cx, 34, 26, 'rgba(74,255,138,0.18)');
    A.disk(ctx, cx, 30, 18, 'rgba(191,255,200,0.12)');
    A.oval(ctx, cx, 58, 18, 4, 'rgba(0,0,0,0.4)');

    // Amp crate body (Marshall-dark metal) — boxy silhouette
    A.rect(ctx, 10, 28, 44, 28, C.marshallD);
    A.rect(ctx, 12, 30, 40, 24, C.marshall);
    A.rect(ctx, 12, 30, 3, 22, C.marshallL);
    A.rect(ctx, 12, 30, 38, 3, C.marshallL);
    // Gold corner protectors
    A.rect(ctx, 10, 28, 5, 5, C.gold);
    A.rect(ctx, 49, 28, 5, 5, C.gold);
    A.rect(ctx, 10, 51, 5, 5, C.gold);
    A.rect(ctx, 49, 51, 5, 5, C.gold);
    A.px(ctx, 11, 29, C.goldL);
    A.px(ctx, 52, 29, C.goldL);
    // Grill slit
    A.rect(ctx, 16, 48, 32, 4, '#080606');
    for (let g = 0; g < 6; g++) {
      A.rect(ctx, 18 + g * 5, 49, 2, 2, '#1a1810');
    }

    // Stack of 3 fuzz pedals rising from crate (readable steps)
    A.drawFuzzPedal(ctx, 16, 38, 26, 14);
    A.drawFuzzPedal(ctx, 18, 28, 26, 14);
    A.drawFuzzPedal(ctx, 20, 18, 26, 14);

    // Glowing cry vials / charge cells on the right of the stack
    for (let v = 0; v < 3; v++) {
      const vx = 46;
      const vy = 20 + v * 10;
      A.rect(ctx, vx, vy, 8, 9, '#0a1810');
      A.rect(ctx, vx + 1, vy + 1, 6, 7, '#122818');
      A.rect(ctx, vx + 2, vy + 2 + (2 - v), 4, 4 + v, C.glow);
      A.rect(ctx, vx + 2, vy + 2 + (2 - v), 4, 1, C.glowSoft);
      A.rect(ctx, vx + 1, vy, 6, 2, C.gold);
      A.disk(ctx, vx + 4, vy + 4, 1, '#ffffff');
    }

    // Charge bars + tiny "CRI" badge (fuel for the green cry)
    A.rect(ctx, 22, 12, 3, 5, C.glow);
    A.rect(ctx, 26, 10, 3, 7, C.glow);
    A.rect(ctx, 30, 8, 3, 9, C.glowSoft);
    A.rect(ctx, 36, 8, 14, 7, '#0a1810');
    A.rect(ctx, 37, 9, 12, 5, '#1a3020');
    // C R I as pixel blocks
    A.px(ctx, 38, 10, C.goldL);
    A.px(ctx, 38, 11, C.gold);
    A.px(ctx, 38, 12, C.goldL);
    A.px(ctx, 39, 10, C.gold);
    A.px(ctx, 39, 12, C.gold);
    A.px(ctx, 41, 10, C.goldL);
    A.px(ctx, 41, 11, C.gold);
    A.px(ctx, 41, 12, C.goldL);
    A.px(ctx, 42, 10, C.gold);
    A.px(ctx, 43, 11, C.gold);
    A.px(ctx, 45, 10, C.goldL);
    A.px(ctx, 45, 11, C.gold);
    A.px(ctx, 45, 12, C.goldL);
    A.px(ctx, 46, 10, C.gold);
    A.px(ctx, 46, 12, C.gold);

    // Hot LED bloom on top pedal
    A.shadeDisk(ctx, 33, 24, 4, '#0a2810', C.glow, C.glowSoft);
    A.disk(ctx, 33, 24, 1, '#ffffff');
    A.disk(ctx, cx, 28, 22, 'rgba(74,255,138,0.1)');
  }

  /* HEALTH — round Somnul eye talisman / heart-of-moss (NOT a med cross) */
  function drawHealthPickup(ctx) {
    const A = Art();
    const C = COL();
    const cx = 32;
    const cy = 30;

    // Strong vitality bloom (#4aff8a / #bfffc8)
    A.disk(ctx, cx, cy, 28, 'rgba(74,255,138,0.22)');
    A.disk(ctx, cx, cy, 20, 'rgba(191,255,200,0.18)');
    A.oval(ctx, cx, 58, 14, 3, 'rgba(0,0,0,0.35)');

    // Mist-leaf fringe (round silhouette vs ammo crate)
    const leaves = [
      [cx - 14, cy - 2],
      [cx + 14, cy - 2],
      [cx - 10, cy + 12],
      [cx + 10, cy + 12],
      [cx, cy - 16],
      [cx - 16, cy + 6],
      [cx + 16, cy + 6],
    ];
    for (let i = 0; i < leaves.length; i++) {
      A.shadeOval(ctx, leaves[i][0], leaves[i][1], 7, 5, '#0c2010', '#1a4830', C.glow);
    }

    // Heart-of-moss core (two lobes + tip — organic, not a red cross)
    A.shadeOval(ctx, cx - 6, cy - 2, 10, 9, '#0a2810', '#1a5840', C.glow);
    A.shadeOval(ctx, cx + 6, cy - 2, 10, 9, '#0a2810', '#1a5840', C.glow);
    A.shadeOval(ctx, cx, cy + 6, 11, 10, '#061810', '#146038', C.glow);
    A.shadeDisk(ctx, cx, cy + 2, 10, '#0a2810', '#1a7050', C.glow);
    A.disk(ctx, cx - 3, cy - 2, 4, 'rgba(191,255,200,0.45)');

    // Somnul eye talisman inset
    A.shadeDisk(ctx, cx, cy, 9, '#1a1810', '#3a3228', C.furL);
    A.rect(ctx, cx - 7, cy - 1, 14, 2, C.gold);
    A.rect(ctx, cx - 1, cy - 7, 2, 14, C.gold);
    A.shadeDisk(ctx, cx, cy, 5, '#061008', C.eye, C.glowSoft);
    A.disk(ctx, cx, cy, 2, '#041008');
    A.px(ctx, cx - 2, cy - 2, '#ffffff');
    A.px(ctx, cx + 1, cy + 1, C.glowSoft);

    // Gold rim + hanging cord (amulet read)
    ctx.strokeStyle = C.gold;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = C.goldL;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 12, -0.8, 0.4);
    ctx.stroke();
    A.rect(ctx, cx - 1, 4, 2, 8, C.gold);
    A.shadeDisk(ctx, cx, 6, 3, C.gold, C.goldL, '#ffffff');

    // Outer vitality pulse
    A.disk(ctx, cx, cy, 18, 'rgba(74,255,138,0.12)');
  }

  function drawSparkSprite(ctx, color) {
    const A = Art();
    A.disk(ctx, 8, 8, 3, color);
    A.px(ctx, 8, 5, '#ffffff');
    A.px(ctx, 5, 8, color);
    A.px(ctx, 11, 8, color);
    A.px(ctx, 8, 11, color);
  }

  function drawMistSprite(ctx, color) {
    const A = Art();
    A.oval(ctx, 8, 8, 6, 4, color);
    A.oval(ctx, 6, 7, 3, 2, 'rgba(255,255,255,0.35)');
  }

  function drawGoldShard(ctx) {
    const A = Art();
    const C = COL();
    ctx.fillStyle = C.gold;
    ctx.beginPath();
    ctx.moveTo(8, 2);
    ctx.lineTo(12, 10);
    ctx.lineTo(6, 14);
    ctx.lineTo(4, 6);
    ctx.fill();
    A.px(ctx, 7, 5, C.goldL);
  }

  function buildSprites() {
    const poses = ['idle', 'walk0', 'walk1', 'attack', 'hurt'];
    spriteCache.monk = {};
    spriteCache.hound = {};
    spriteCache.boss = {};
    for (let i = 0; i < poses.length; i++) {
      const pose = poses[i];
      spriteCache.monk[pose] = makeSprite(function (ctx) {
        drawMonkFrame(ctx, pose);
      });
      spriteCache.hound[pose] = makeSprite(function (ctx) {
        drawHoundFrame(ctx, pose);
      });
      spriteCache.boss[pose] = makeSprite(function (ctx) {
        drawBossFrame(ctx, pose);
      });
    }

    spriteCache.seal = makeSprite(function (ctx) {
      drawSealByIndex(ctx, 0);
    });
    spriteCache.seals = [];
    for (let si = 0; si < 4; si++) {
      const idx = si;
      const size = idx === 3 ? 80 : 64;
      spriteCache.seals[idx] = makeSprite(function (ctx) {
        drawSealByIndex(ctx, idx);
      }, size);
      spriteCache['seal' + idx] = spriteCache.seals[idx];
    }
    spriteCache.bolt = makeSprite(function (ctx) {
      drawPlayerBolt(ctx);
    });
    spriteCache.enemyBolt = makeSprite(function (ctx) {
      drawEnemyBolt(ctx);
    });
    spriteCache.ammo = makeSprite(function (ctx) {
      drawAmmoPickup(ctx);
    });
    spriteCache.health = makeSprite(function (ctx) {
      drawHealthPickup(ctx);
    });

    spriteCache.sparkGreen = makeSprite(function (ctx) {
      drawSparkSprite(ctx, '#5aff9a');
    }, 16);
    spriteCache.sparkGold = makeSprite(function (ctx) {
      drawSparkSprite(ctx, '#ffe89a');
    }, 16);
    spriteCache.sparkCorrupt = makeSprite(function (ctx) {
      drawSparkSprite(ctx, '#c8b060');
    }, 16);
    spriteCache.mistGreen = makeSprite(function (ctx) {
      drawMistSprite(ctx, 'rgba(74,255,138,0.55)');
    }, 16);
    spriteCache.mistCorrupt = makeSprite(function (ctx) {
      drawMistSprite(ctx, 'rgba(168,154,64,0.5)');
    }, 16);
    spriteCache.goldShard = makeSprite(function (ctx) {
      drawGoldShard(ctx);
    }, 16);

    spriteCache.puddle = makeSprite(function (ctx) {
      ST3.Art.drawGreenPuddle(ctx, SPR);
    });
  }

  function walkFrameIndex(e) {
    // ~7 Hz swap between walk0 / walk1
    return ((e.animT * 7) | 0) % 2;
  }

  function isEnemyMoving(e) {
    return !!(e && (e.moving || e.anim === 'walk'));
  }

  function pickAnimFrame(frames, e) {
    if (!frames) return null;
    const idle = frames.idle || frames.walk0 || null;
    let tex = idle;
    // Priority: hurt > attack > walk (only when moving) > idle
    if (e.hurtFlash > 0 || e.anim === 'hurt') tex = frames.hurt || idle;
    else if (e.attackFlash > 0 || e.anim === 'attack') tex = frames.attack || idle;
    else if (e.kind === 'monk' && e.fireCd > 1.35) tex = frames.attack || idle;
    else if (e.kind === 'boss' && e.fireCd > 0.7) tex = frames.attack || idle;
    else if (isEnemyMoving(e)) {
      // Boss float pulse is intentional via walk0/walk1 while drifting
      tex = walkFrameIndex(e) === 0 ? frames.walk0 : frames.walk1;
      tex = tex || idle;
    } else {
      tex = idle;
    }
    return tex || idle;
  }

  /** Screen-space foot-plant bob (px). Small + grounded — only while walking. */
  function walkScreenBob(e) {
    if (!isEnemyMoving(e)) return 0;
    if (e.hurtFlash > 0 || e.attackFlash > 0) return 0;
    if (e.anim === 'hurt' || e.anim === 'attack') return 0;
    // Plant frame dips down 1–2px; lift returns toward center
    return walkFrameIndex(e) === 0 ? 2 : 0;
  }

  function safeSpriteTex(frames, e, fallback) {
    return pickAnimFrame(frames, e) || (frames && frames.idle) || fallback || null;
  }

  /* ─── Combat FX (world billboards) ─── */
  function spawnParticles(x, y, color, n, opts) {
    opts = opts || {};
    const count = n || 8;
    const kind = opts.kind || 'spark';
    const spread = opts.spread != null ? opts.spread : 1.8;
    const lifeBase = opts.life || 0.35;
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 0.4 + Math.random() * spread;
      let tex = spriteCache.sparkGreen;
      if (kind === 'mist') tex = color === 'corrupt' ? spriteCache.mistCorrupt : spriteCache.mistGreen;
      else if (kind === 'gold') tex = spriteCache.goldShard;
      else if (color === 'gold' || color === '#c8a040' || color === '#ffe89a') tex = spriteCache.sparkGold;
      else if (color === 'corrupt' || color === '#c8b060') tex = spriteCache.sparkCorrupt;
      else if (kind === 'mixed') {
        tex = i % 3 === 0 ? spriteCache.goldShard : i % 2 === 0 ? spriteCache.sparkGreen : spriteCache.mistGreen;
      }
      if (!tex) tex = spriteCache.sparkGreen;
      if (!tex) continue;
      fxParticles.push({
        x: x + (Math.random() - 0.5) * 0.15,
        y: y + (Math.random() - 0.5) * 0.15,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: lifeBase * (0.6 + Math.random() * 0.8),
        tex: tex,
        scale: opts.scale || (kind === 'mist' ? 0.28 : 0.18),
      });
    }
    if (fxParticles.length > MAX_FX) fxParticles.splice(0, fxParticles.length - MAX_FX);
  }

  function updateFxParticles(dt) {
    for (let i = fxParticles.length - 1; i >= 0; i--) {
      const p = fxParticles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.92;
      p.vy *= 0.92;
      p.life -= dt;
      if (p.life <= 0) fxParticles.splice(i, 1);
    }
  }

  /* Public alias used by game/enemy/player */
  function updateParticles(dt) {
    lastFxDt = dt > 0 ? dt : lastFxDt;
    updateFxParticles(dt);
  }

  /* ─── Ambient screen mist (preserved ambiance) ─── */
  function initAmbient() {
    ambient = [];
    for (let i = 0; i < MAX_AMBIENT; i++) {
      ambient.push(spawnAmbient(true));
    }
  }

  function spawnAmbient(randomY) {
    const isSmoke = Math.random() < 0.65;
    return {
      x: Math.random() * VW,
      y: randomY ? Math.random() * VH : VH + Math.random() * 20,
      vx: (Math.random() - 0.5) * (isSmoke ? 0.25 : 0.4),
      vy: isSmoke ? -(0.15 + Math.random() * 0.35) : -(0.4 + Math.random() * 0.7),
      life: 0.4 + Math.random() * 0.6,
      age: randomY ? Math.random() : 0,
      size: isSmoke ? 2 + ((Math.random() * 4) | 0) : 1,
      kind: isSmoke ? 'smoke' : 'ember',
    };
  }

  function updateAmbient(dt) {
    ambientT += dt;
    for (let i = 0; i < ambient.length; i++) {
      const p = ambient[i];
      p.age += dt * 0.35;
      p.x += p.vx + Math.sin(ambientT * 1.5 + i) * (p.kind === 'smoke' ? 0.15 : 0.05);
      p.y += p.vy;
      if (p.age >= p.life || p.y < -8 || p.x < -8 || p.x > VW + 8) {
        ambient[i] = spawnAmbient(false);
      }
    }
  }

  function drawAmbient() {
    for (let i = 0; i < ambient.length; i++) {
      const p = ambient[i];
      const t = 1 - p.age / p.life;
      if (t <= 0) continue;
      if (p.kind === 'smoke') {
        bctx.fillStyle = 'rgba(40,90,55,' + (0.08 + t * 0.18).toFixed(3) + ')';
        bctx.fillRect(p.x | 0, p.y | 0, p.size, p.size + 1);
        bctx.fillStyle = 'rgba(74,255,138,' + (0.03 + t * 0.06).toFixed(3) + ')';
        bctx.fillRect((p.x + 1) | 0, (p.y - 1) | 0, Math.max(1, p.size - 1), 1);
      } else {
        const a = 0.35 + t * 0.55;
        bctx.fillStyle = 'rgba(120,255,160,' + a.toFixed(3) + ')';
        bctx.fillRect(p.x | 0, p.y | 0, 1, 1);
        if (t > 0.5) {
          bctx.fillStyle = 'rgba(191,255,200,' + (a * 0.5).toFixed(3) + ')';
          bctx.fillRect(p.x | 0, (p.y - 1) | 0, 1, 1);
        }
      }
    }
  }

  function drawFloorCeiling(animT) {
    const gradC = bctx.createLinearGradient(0, 0, 0, VH / 2);
    gradC.addColorStop(0, '#020806');
    gradC.addColorStop(0.45, '#06140c');
    gradC.addColorStop(1, '#0a1c12');
    bctx.fillStyle = gradC;
    bctx.fillRect(0, 0, VW, VH / 2);

    bctx.fillStyle = 'rgba(0,0,0,0.35)';
    for (let bx = 24; bx < VW; bx += 48) {
      bctx.fillRect(bx, 4, 18, 28);
      bctx.fillRect(bx + 2, 6, 14, 3);
      bctx.fillRect(bx + 4, 12, 4, 4);
      bctx.fillRect(bx + 10, 12, 4, 4);
      bctx.fillRect(bx + 4, 20, 4, 4);
      bctx.fillRect(bx + 10, 20, 4, 4);
    }
    bctx.fillStyle = 'rgba(8,24,14,0.55)';
    bctx.fillRect(0, 18, VW, 2);
    bctx.fillRect(0, 42, VW, 1);
    const vigC = bctx.createRadialGradient(VW / 2, VH * 0.15, 20, VW / 2, VH * 0.15, VW * 0.55);
    vigC.addColorStop(0, 'rgba(4,20,12,0)');
    vigC.addColorStop(1, 'rgba(2,8,6,0.55)');
    bctx.fillStyle = vigC;
    bctx.fillRect(0, 0, VW, VH / 2);

    const gradF = bctx.createLinearGradient(0, VH / 2, 0, VH);
    gradF.addColorStop(0, '#081410');
    gradF.addColorStop(0.5, '#0e2218');
    gradF.addColorStop(1, '#142c1c');
    bctx.fillStyle = gradF;
    bctx.fillRect(0, VH / 2, VW, VH / 2);

    bctx.fillStyle = 'rgba(0,0,0,0.18)';
    for (let y = VH / 2; y < VH; y += 3) {
      bctx.fillRect(0, y, VW, 1);
    }
    bctx.fillStyle = 'rgba(30,70,45,0.08)';
    for (let y = VH / 2 + 1; y < VH; y += 6) {
      bctx.fillRect(0, y, VW, 1);
    }

    const emberSeed = (animT * 3) | 0;
    bctx.fillStyle = 'rgba(74,255,138,0.22)';
    for (let i = 0; i < 18; i++) {
      const ex = ((i * 47 + emberSeed * 13) % (VW - 4)) | 0;
      const ey = (VH / 2 + 8 + ((i * 29 + emberSeed * 7) % (VH / 2 - 16))) | 0;
      if ((i + emberSeed) % 5 === 0) {
        bctx.fillRect(ex, ey, 1, 1);
        if ((i + emberSeed) % 11 === 0) {
          bctx.fillStyle = 'rgba(191,255,200,0.35)';
          bctx.fillRect(ex, ey - 1, 1, 1);
          bctx.fillStyle = 'rgba(74,255,138,0.22)';
        }
      }
    }

    const vigF = bctx.createRadialGradient(VW / 2, VH * 0.85, 10, VW / 2, VH * 0.75, VW * 0.6);
    vigF.addColorStop(0, 'rgba(4,20,12,0)');
    vigF.addColorStop(1, 'rgba(2,10,6,0.5)');
    bctx.fillStyle = vigF;
    bctx.fillRect(0, VH / 2, VW, VH / 2);
  }

  /** Screen-space occult slash arcs during melee (Doom/Dusk swipe feel) */
  function drawMeleeSlashArcs(player, animT) {
    const meleeFlash = Math.max(0, player.meleeFlash || 0);
    if (meleeFlash <= 0) return;
    const meleeMax = 0.38;
    const t = 1 - Math.min(1, meleeFlash / meleeMax);
    // Peak intensity mid-swipe
    const peak = t < 0.2 ? t / 0.2 : t < 0.55 ? 1 : Math.max(0, 1 - (t - 0.55) / 0.45);
    if (peak < 0.05) return;

    const C = COL();
    const cx = VW * 0.55;
    const cy = VH * 0.62;
    // Sweep angle travels right→left across FOV
    const sweep = -0.9 + t * 2.4;
    const a0 = Math.PI * 0.95 + sweep * 0.35;
    const a1 = Math.PI * 1.85 + sweep * 0.15;

    bctx.save();
    // Motion-blur ghost arcs behind the leading edge
    for (let g = 0; g < 4; g++) {
      const lag = g * 0.12;
      const gt = Math.max(0, peak - lag * 0.5);
      const r = 48 + g * 14 + Math.sin(t * Math.PI) * 18;
      bctx.strokeStyle =
        g % 2 === 0
          ? 'rgba(74,255,138,' + (0.18 * gt).toFixed(3) + ')'
          : 'rgba(191,255,200,' + (0.28 * gt).toFixed(3) + ')';
      bctx.lineWidth = 2 + (3 - g);
      bctx.beginPath();
      bctx.arc(cx - g * 8, cy + g * 3, r, a0 - g * 0.08, a1 - g * 0.05);
      bctx.stroke();
    }

    // Leading talon streaks
    for (let i = 0; i < 3; i++) {
      const off = (i - 1) * 0.22;
      const rr = 62 + i * 10;
      const sa = a0 + off;
      const ea = a0 + 0.55 + off + t * 0.9;
      bctx.strokeStyle = i === 1 ? C.glowSoft : C.glow;
      bctx.globalAlpha = 0.35 + peak * 0.55;
      bctx.lineWidth = i === 1 ? 3 : 2;
      bctx.beginPath();
      bctx.arc(cx, cy - i * 4, rr, sa, ea);
      bctx.stroke();
    }
    bctx.globalAlpha = 1;

    // Spark flecks along the arc
    for (let s = 0; s < 10; s++) {
      const u = (s / 10) * peak;
      const ang = a0 + u * (a1 - a0) + Math.sin(animT * 30 + s) * 0.05;
      const rad = 55 + (s % 4) * 8 + Math.sin(t * 12 + s) * 4;
      const sx = cx + Math.cos(ang) * rad;
      const sy = cy + Math.sin(ang) * rad * 0.72;
      bctx.fillStyle = s % 2 ? '#ffffff' : C.glowSoft;
      bctx.fillRect(sx | 0, sy | 0, 2, 2);
    }
    bctx.restore();
  }

  function drawWeapon(player, animT) {
    const A = Art();
    const C = COL();
    const moving = player.moving;
    const ammoEmpty = (player.ammo | 0) <= 0;
    const flash = Math.max(0, player.muzzleFlash || 0);
    const flashMax = 0.34;
    const progress = flash > 0 ? 1 - Math.min(1, flash / flashMax) : 0;
    const thrust = flash > 0 ? Math.sin(progress * Math.PI) : 0;

    const meleeFlash = Math.max(0, player.meleeFlash || 0);
    const meleeMax = 0.38;
    const mProg = meleeFlash > 0 ? 1 - Math.min(1, meleeFlash / meleeMax) : 0;
    const meleeActive = meleeFlash > 0;

    // Melee phases: wind-up → slash → follow-through
    let swipe = 0; // 0 right/cocked → 1 far left
    let clawReach = 0;
    let armRoll = 0;
    if (meleeActive) {
      if (mProg < 0.14) {
        const u = mProg / 0.14;
        swipe = -0.12 * u; // cock back
        clawReach = 0.15 + u * 0.25;
        armRoll = -0.2 * u;
      } else if (mProg < 0.52) {
        const u = (mProg - 0.14) / 0.38;
        const ease = u * u * (3 - 2 * u); // smoothstep — weighty slash
        swipe = -0.12 + ease * 1.35;
        clawReach = 0.4 + Math.sin(ease * Math.PI) * 0.95;
        armRoll = -0.2 + ease * 1.1;
      } else {
        const u = (mProg - 0.52) / 0.48;
        swipe = 1.23 - u * 0.35;
        clawReach = Math.max(0, 0.85 - u * 0.9);
        armRoll = 0.9 - u * 0.75;
      }
    }

    const bobX = Math.sin(animT * 8) * (moving ? 3 : 0.5);
    const bobY = Math.abs(Math.sin(animT * 8)) * (moving ? 2.5 : 0.35);
    const breath = Math.sin(animT * 2.2) * 0.8;

    // Idle empty-ammo: claws sit more forward, arm slightly raised
    const idleClawBias = ammoEmpty && !meleeActive && flash <= 0 ? 1 : 0;

    // Anchor — ranged thrust OR melee arc across lower FOV
    let bx = VW - 52 + bobX - thrust * 28;
    let by = VH - 28 + bobY - thrust * 36 + breath;
    if (meleeActive) {
      bx = VW - 40 + bobX - swipe * 165 + armRoll * 12;
      by = VH - 22 + bobY - clawReach * 42 + Math.sin(swipe * Math.PI) * 18 + breath;
    } else if (idleClawBias) {
      bx -= 6;
      by -= 4;
    }

    // Ombre au sol du viewport
    A.oval(bctx, VW - 36 - (meleeActive ? swipe * 40 : 0), VH - 6, 48, 8, 'rgba(0,0,0,0.45)');

    // Avant-bras massif qui déborde hors écran (bas + droite)
    A.shadeOval(bctx, bx + 58, by + 42, 42, 34, C.furD, C.fur, C.furL);
    A.shadeOval(bctx, bx + 72, by + 52, 38, 28, C.furD, C.fur, null);
    A.rect(bctx, bx + 55, by + 48, 80, 40, C.furD);
    A.rect(bctx, bx + 58, by + 50, 76, 36, C.fur);
    A.rect(bctx, bx + 58, by + 50, 10, 30, C.furL);
    for (let i = 0; i < 8; i++) {
      A.furTuft(bctx, bx + 48 + i * 6, by + 38 + (i % 3) * 2, 5 + (i % 2), -2.0 - i * 0.04, i % 2 ? C.furL : C.furH);
    }
    A.shadeOval(bctx, bx + 38, by + 30, 18, 16, C.furD, C.fur, C.furL);
    A.shadeOval(bctx, bx + 30, by + 26, 12, 11, C.furD, C.belly, C.bellyL);

    // Puits d'énergie — full when ammo, dim/empty when dry
    const wellX = bx + 22 - thrust * 8 - (meleeActive ? clawReach * 6 : 0);
    const wellY = by + 14 - thrust * 10 - (meleeActive ? clawReach * 8 : 0);
    if (ammoEmpty) {
      A.disk(bctx, wellX, wellY, 10, 'rgba(8,18,12,0.55)');
      A.shadeDisk(bctx, wellX, wellY, 5, '#050a06', '#0e1a12', '#1a2a1c');
      // Faint dead ember
      bctx.fillStyle = 'rgba(40,70,50,' + (0.15 + Math.sin(animT * 1.5) * 0.05) + ')';
      bctx.fillRect((wellX - 1) | 0, (wellY - 1) | 0, 2, 2);
    } else {
      A.disk(bctx, wellX, wellY, 12 + thrust * 6, 'rgba(40,120,70,' + (0.2 + thrust * 0.35) + ')');
      A.shadeDisk(bctx, wellX, wellY, 7 + thrust * 3, '#0a2810', C.glow, C.glowSoft);
      A.disk(bctx, wellX, wellY, 2 + thrust * 2, '#ffffff');
    }

    // Griffes — longer/spread on melee swipe or empty idle; bolt thrust when ammo
    const clawBoost = meleeActive ? clawReach : idleClawBias ? 0.55 : thrust;
    const spread = 8 + clawBoost * (meleeActive ? 22 : 14);
    const clawLen = (ammoEmpty ? 24 : 20) + clawBoost * (meleeActive ? 34 : 18);
    const clawAngBias = meleeActive ? -0.85 + swipe * 0.4 : idleClawBias ? -0.35 : 0;

    // Motion-blur claw ghosts during peak slash
    if (meleeActive && mProg > 0.14 && mProg < 0.55) {
      for (let ghost = 2; ghost >= 1; ghost--) {
        const gAlpha = 0.12 * ghost;
        const gSwipe = swipe - ghost * 0.18;
        const gX = wellX + gSwipe * 20;
        const gY = wellY - ghost * 4;
        for (let i = 0; i < 3; i++) {
          const ang = (-0.55 + i * 0.55) * (0.7 + clawBoost * 0.9) + clawAngBias - ghost * 0.15;
          const cx = gX + Math.cos(ang - 0.2) * (10 + spread * 0.3);
          const cy = gY + Math.sin(ang - 0.2) * (6 + spread * 0.2);
          const tipX = cx + Math.cos(ang - 1.2) * clawLen;
          const tipY = cy + Math.sin(ang - 1.2) * clawLen;
          bctx.strokeStyle = 'rgba(74,255,138,' + gAlpha + ')';
          bctx.lineWidth = 3;
          bctx.beginPath();
          bctx.moveTo(cx, cy);
          bctx.lineTo(tipX, tipY);
          bctx.stroke();
        }
      }
    }

    for (let i = 0; i < 3; i++) {
      const ang = (-0.55 + i * 0.55) * (0.7 + clawBoost * 0.9) + clawAngBias;
      const cx = wellX + Math.cos(ang - 0.2) * (10 + spread * 0.3) - thrust * 4;
      const cy = wellY + Math.sin(ang - 0.2) * (6 + spread * 0.2) - thrust * 8;
      const tipX = cx + Math.cos(ang - 1.2) * clawLen;
      const tipY = cy + Math.sin(ang - 1.2) * clawLen;
      bctx.fillStyle = C.clawD;
      bctx.beginPath();
      bctx.moveTo(cx - 3, cy + 4);
      bctx.lineTo(tipX, tipY);
      bctx.lineTo(cx + 4, cy + 5);
      bctx.fill();
      bctx.strokeStyle = meleeActive || idleClawBias ? C.glowSoft : C.clawL;
      bctx.lineWidth = meleeActive ? 2 : 1;
      bctx.beginPath();
      bctx.moveTo(cx, cy);
      bctx.lineTo(tipX, tipY);
      bctx.stroke();
      // Occult trail tip
      if (clawBoost > 0.25) {
        bctx.fillStyle = 'rgba(191,255,200,' + (clawBoost * 0.75) + ')';
        bctx.fillRect(tipX | 0, tipY | 0, 2, 2);
        if (meleeActive) {
          bctx.fillStyle = 'rgba(74,255,138,' + (clawBoost * 0.45) + ')';
          bctx.fillRect((tipX - 2) | 0, (tipY + 1) | 0, 3, 1);
        }
      }
    }

    // Green occult trails from palm during slash (NOT bolt flame cone)
    if (meleeActive && clawReach > 0.3) {
      const trailA = Math.min(1, clawReach);
      for (let tr = 0; tr < 5; tr++) {
        const ta = -1.4 + swipe * 0.5 + tr * 0.18;
        const td = 18 + tr * 7 + clawReach * 10;
        const tx = wellX + Math.cos(ta) * td;
        const ty = wellY + Math.sin(ta) * td * 0.7;
        bctx.fillStyle = tr % 2 ? 'rgba(191,255,200,' + (0.35 * trailA) + ')' : 'rgba(74,255,138,' + (0.25 * trailA) + ')';
        bctx.fillRect(tx | 0, ty | 0, 2 + (tr % 2), 1 + (tr % 2));
      }
      A.disk(bctx, wellX - 4, wellY - 6, 6 + clawReach * 8, 'rgba(74,255,138,' + (0.12 * trailA) + ')');
    }

    // Burst de cri — only when ammo / muzzle flash (ranged)
    if (flash > 0 && !meleeActive) {
      const t = Math.sin(progress * Math.PI);
      const mx = wellX - 6;
      const my = wellY - 10;
      A.pixelFlame(bctx, mx, my, (14 + t * 22) | 0, '#ffffff', C.glowSoft, C.glow);
      A.pixelFlame(bctx, mx - 12, my + 2, (10 + t * 16) | 0, C.glowSoft, C.glow, '#2a8a4a');
      A.pixelFlame(bctx, mx + 12, my + 4, (10 + t * 16) | 0, C.glowSoft, C.glow, '#2a8a4a');
      A.pixelFlame(bctx, mx, my - 14, (8 + t * 12) | 0, C.glow, '#2aff6a', '#0a4020');
      bctx.strokeStyle = 'rgba(191,255,200,' + (0.55 * t) + ')';
      bctx.lineWidth = 2;
      bctx.beginPath();
      bctx.arc(mx, my, 18 + t * 28, Math.PI * 1.05, Math.PI * 1.95);
      bctx.stroke();
      bctx.strokeStyle = 'rgba(74,255,138,' + (0.35 * t) + ')';
      bctx.beginPath();
      bctx.arc(mx, my, 28 + t * 36, Math.PI * 1.1, Math.PI * 1.9);
      bctx.stroke();
      for (let s = 0; s < 8; s++) {
        const a = animT * 20 + s * 0.9;
        const rr = 16 + t * 30 + (s % 3) * 4;
        bctx.fillStyle = s % 2 ? C.glowSoft : '#ffffff';
        bctx.fillRect((mx + Math.cos(a) * rr) | 0, (my + Math.sin(a) * rr) | 0, 2, 2);
      }
      A.disk(bctx, mx, my, 10 + t * 14, 'rgba(74,255,138,' + 0.3 * t + ')');
    } else if (!ammoEmpty && !meleeActive) {
      const gx = wellX + Math.sin(animT * 3) * 2;
      const gy = wellY - 6 - ((animT * 8) % 6);
      bctx.fillStyle = 'rgba(120,255,160,' + (0.3 + Math.sin(animT * 4) * 0.12) + ')';
      bctx.fillRect(gx | 0, gy | 0, 2, 2);
    }
  }

  function collectSprites(state) {
    const list = [];
    const seals = state.seals || [];
    const enemies = state.enemies || [];
    const animT = state.animT || 0;
    const bossEnemy =
      state._bossEnemy ||
      enemies.find(function (e) {
        return e.kind === 'boss' && e.alive;
      });

    for (let i = 0; i < seals.length; i++) {
      const s = seals[i];
      if (s.destroyed && !s.isBoss) continue;
      if (s.isBoss && s.hp <= 0) continue;
      const idx = s.sealIndex != null ? s.sealIndex : i;
      let tex =
        (spriteCache.seals && spriteCache.seals[idx]) ||
        spriteCache['seal' + idx] ||
        spriteCache.seal;
      let scale = 0.85;
      if (s.isBoss) {
        const src = bossEnemy || {
          anim: 'idle',
          animT: animT,
          hurtFlash: 0,
          attackFlash: 0,
          fireCd: 0,
          kind: 'boss',
          moving: false,
        };
        tex = safeSpriteTex(spriteCache.boss, src, spriteCache.seal3 || spriteCache.seal);
        scale = 1.35;
        if (!tex) continue;
        list.push({
          x: s.x,
          y: s.y,
          tex: tex,
          scale: scale,
          kind: 'boss',
          vBob: walkScreenBob(src),
        });
        continue;
      }
      if (!tex) continue;
      // Gentle pulse + idle bob (phase offset per seal)
      const phase = animT * 2.4 + idx * 1.7;
      const pulse = 0.9 + Math.sin(phase) * 0.05;
      const bob = Math.sin(phase * 0.85) * 2.5;
      list.push({
        x: s.x,
        y: s.y,
        tex: tex,
        scale: pulse,
        bobY: bob,
        kind: 'seal',
      });
      // Cheap idle motes (1–2 billboards, no FX alloc)
      const moteTex = idx === 1 ? spriteCache.sparkGold : idx === 2 ? spriteCache.mistGreen : spriteCache.sparkGreen;
      if (moteTex) {
        const a0 = animT * 1.8 + idx;
        list.push({
          x: s.x + Math.cos(a0) * 0.28,
          y: s.y + Math.sin(a0 * 1.3) * 0.28,
          tex: moteTex,
          scale: 0.14 + Math.sin(a0 * 2) * 0.03,
          kind: 'particle',
        });
        if (idx === 2 || idx === 3) {
          const a1 = a0 + 2.1;
          list.push({
            x: s.x + Math.cos(a1) * 0.38,
            y: s.y + Math.sin(a1 * 0.9) * 0.32,
            tex: idx === 3 ? spriteCache.sparkGold : spriteCache.mistGreen,
            scale: 0.12,
            kind: 'particle',
          });
        }
      }
    }

    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (!e.alive || e.kind === 'boss') continue;
      const frames = e.kind === 'hound' ? spriteCache.hound : spriteCache.monk;
      const tex = safeSpriteTex(frames, e, spriteCache.seal);
      if (!tex) continue;
      list.push({
        x: e.x,
        y: e.y,
        tex: tex,
        scale: e.kind === 'hound' ? 0.75 : 0.95,
        kind: e.kind,
        vBob: walkScreenBob(e),
      });
    }

    // Pickups: larger scale for raycaster readability; bobY is vertical screen offset
    // (pixels at base sprite size, scaled with spriteH in renderSprites).
    const pickups = state.pickups || [];
    for (let i = 0; i < pickups.length; i++) {
      const p = pickups[i];
      if (p.taken) continue;
      const tex = p.kind === 'health' ? spriteCache.health : spriteCache.ammo;
      if (!tex) continue;
      const bob = Math.sin(animT * 3.2 + i * 1.7) * 3;
      list.push({
        x: p.x,
        y: p.y,
        tex: tex,
        scale: p.kind === 'health' ? 0.62 : 0.58,
        bobY: bob,
        kind: 'pickup',
      });
    }

    const bolts = state.bolts || [];
    for (let i = 0; i < bolts.length; i++) {
      const b = bolts[i];
      const tex = b.friendly ? spriteCache.bolt : spriteCache.enemyBolt;
      if (!tex) continue;
      list.push({
        x: b.x,
        y: b.y,
        tex: tex,
        scale: b.friendly ? 0.38 : 0.36,
        kind: 'bolt',
      });
    }

    for (let i = 0; i < fxParticles.length; i++) {
      const p = fxParticles[i];
      if (!p.tex) continue;
      list.push({
        x: p.x,
        y: p.y,
        tex: p.tex,
        scale: p.scale * Math.max(0.3, p.life * 2),
        kind: 'particle',
      });
    }

    // Wayfinding landmarks (static map entities — no collision)
    const ents = (ST3.Map && ST3.Map.entities) || [];
    for (let i = 0; i < ents.length; i++) {
      const ent = ents[i];
      if (ent.type === 'puddle') {
        if (!spriteCache.puddle) continue;
        // Flat floor hug: floorBias ≈ 0.5/scaleY - 0.5 so sprite bottom meets horizon.
        const puddleScaleY = 0.16;
        list.push({
          x: ent.x,
          y: ent.y,
          tex: spriteCache.puddle,
          scale: 0.65,
          scaleY: puddleScaleY,
          floorBias: 0.5 / puddleScaleY - 0.5,
          kind: 'puddle',
        });
      }
    }

    return list;
  }

  function renderSprites(player, sprites) {
    const dirX = player.dirX;
    const dirY = player.dirY;
    const planeX = player.planeX;
    const planeY = player.planeY;
    const det = planeX * dirY - dirX * planeY;
    if (!Number.isFinite(det) || Math.abs(det) < 1e-8) return;
    const invDet = 1.0 / det;

    sprites.sort(function (a, b) {
      const da = (a.x - player.x) * (a.x - player.x) + (a.y - player.y) * (a.y - player.y);
      const db = (b.x - player.x) * (b.x - player.x) + (b.y - player.y) * (b.y - player.y);
      return db - da;
    });

    for (let i = 0; i < sprites.length; i++) {
      const sp = sprites[i];
      if (!sp.tex) continue;
      const texW = sp.tex.width || SPR;
      const texH = sp.tex.height || SPR;
      const sx = sp.x - player.x;
      const sy = sp.y - player.y;
      const transformX = invDet * (dirY * sx - dirX * sy);
      const transformY = invDet * (-planeY * sx + planeX * sy);
      if (!(transformY > 0.05) || !Number.isFinite(transformY)) continue;

      const spriteScreenX = ((VW / 2) * (1 + transformX / transformY)) | 0;
      const baseScale = sp.scale || 1;
      const scaleY = sp.scaleY != null ? sp.scaleY : baseScale;
      const scaleX = sp.scaleX != null ? sp.scaleX : baseScale;
      const spriteH = (Math.abs(VH / transformY) * scaleY) | 0;
      if (spriteH < 1) continue;
      const spriteW = Math.max(1, (Math.abs(VH / transformY) * scaleX) | 0);
      // bobY: pickup float (scaled with spriteH). vBob: walk foot-plant (screen px).
      // floorBias: push toward floor (puddles) — fraction of spriteH downward.
      const floorPush = sp.floorBias ? ((spriteH * sp.floorBias) | 0) : 0;
      const bobOff =
        (sp.bobY ? ((sp.bobY * spriteH) / SPR) | 0 : 0) + (sp.vBob || 0) + floorPush;
      const drawStartY = (-spriteH / 2 + VH / 2 + bobOff) | 0;
      const drawEndY = (spriteH / 2 + VH / 2 + bobOff) | 0;
      const drawStartX = (-spriteW / 2 + spriteScreenX) | 0;
      const drawEndX = (spriteW / 2 + spriteScreenX) | 0;
      const destY = Math.max(0, drawStartY);
      const destH = Math.min(VH, drawEndY) - destY;
      if (destH < 1) continue;

      const fog = ST3.Utils.clamp(1 - transformY / FOG_MAX, 0.15, 1);
      bctx.globalAlpha = fog;

      for (let stripe = drawStartX; stripe < drawEndX; stripe++) {
        if (stripe < 0 || stripe >= VW) continue;
        if (transformY >= zBuffer[stripe]) continue;
        let texX = (((stripe - drawStartX) * texW) / spriteW) | 0;
        if (sp.flipX) texX = texW - 1 - texX;
        if (texX < 0 || texX >= texW) continue;
        bctx.drawImage(sp.tex, texX, 0, 1, texH, stripe, destY, 1, destH);
      }
    }
    bctx.globalAlpha = 1;
  }

  function drawPostFX(state) {
    const bass = lastAmpBass;
    const edgeBoost = 0.42 + bass * 0.12;
    const midBoost = 0.08 + bass * 0.05;
    const vig = sctx.createRadialGradient(VW / 2, VH / 2, VH * 0.2, VW / 2, VH / 2, VW * 0.72);
    vig.addColorStop(0, 'rgba(4,20,12,0)');
    vig.addColorStop(0.65, 'rgba(4,20,12,' + midBoost.toFixed(3) + ')');
    vig.addColorStop(1, 'rgba(2,10,6,' + edgeBoost.toFixed(3) + ')');
    sctx.fillStyle = vig;
    sctx.fillRect(0, 0, VW, VH);

    // Soft bass vignette pulse synced to nearby amp cabinets
    if (bass > 0.08) {
      sctx.fillStyle = 'rgba(20,40,18,' + (bass * 0.07).toFixed(3) + ')';
      sctx.fillRect(0, 0, VW, VH);
    }

    sctx.fillStyle = 'rgba(0,0,0,0.06)';
    for (let y = 0; y < VH; y += 2) {
      sctx.fillRect(0, y, VW, 1);
    }

    if (state.nearSeal && (state.phase === 'play' || state.phase === 'sealBoss')) {
      const pulse = 0.04 + Math.sin((state.animT || 0) * 6) * 0.03;
      const flicker = Math.random() < 0.08 ? 0.05 : 0;
      sctx.fillStyle = 'rgba(74,255,138,' + (pulse + flicker).toFixed(3) + ')';
      sctx.fillRect(0, 0, VW, VH);
    }

    // Temple green flash (seal omen / awaken / cine)
    if (state.screenFlash > 0) {
      sctx.fillStyle = 'rgba(90,255,154,' + Math.min(0.55, state.screenFlash).toFixed(3) + ')';
      sctx.fillRect(0, 0, VW, VH);
    }
  }

  function addShake(amount) {
    camShake = Math.max(camShake, amount || 4);
  }

  function frame(state) {
    if (!bctx || !state.player) return;
    const p = state.player;
    const animT = state.animT || 0;
    bctx.imageSmoothingEnabled = false;

    updateAmbient(lastFxDt);

    drawFloorCeiling(animT);
    const wallFx = ST3.Raycaster.renderWalls(
      bctx,
      VW,
      VH,
      p.x,
      p.y,
      p.dirX,
      p.dirY,
      p.planeX,
      p.planeY,
      zBuffer,
      FOG_MAX,
      animT
    );
    lastAmpBass = wallFx && wallFx.ampBass ? wallFx.ampBass : 0;
    renderSprites(p, collectSprites(state));
    drawAmbient();
    if (state.phase === 'play' || state.phase === 'sealBoss') {
      drawWeapon(p, animT);
      drawMeleeSlashArcs(p, animT);
    }

    if (p.attackFlash > 0 || p.muzzleFlash > 0.2 || (p.meleeFlash || 0) > 0) {
      const a = Math.max(
        p.attackFlash || 0,
        (p.muzzleFlash || 0) * 0.5,
        (p.meleeFlash || 0) * 0.7
      );
      bctx.fillStyle = 'rgba(120,255,160,' + Math.min(0.28, a * 0.9) + ')';
      bctx.fillRect(0, 0, VW, VH);
    }

    if (p.hurtFlash > 0) {
      bctx.fillStyle = 'rgba(120,20,20,' + Math.min(0.45, p.hurtFlash) + ')';
      bctx.fillRect(0, 0, VW, VH);
    }

    sctx.imageSmoothingEnabled = false;
    sctx.clearRect(0, 0, screen.width, screen.height);
    let ox = 0;
    let oy = 0;
    if (camShake > 0.15) {
      ox = (Math.random() - 0.5) * camShake;
      oy = (Math.random() - 0.5) * camShake * 0.65;
      camShake *= 0.86;
    } else {
      camShake = 0;
    }
    sctx.drawImage(buffer, ox, oy);
    drawPostFX(state);
  }

  ST3.Renderer = {
    VW,
    VH,
    FOG_MAX,
    init,
    resize,
    frame,
    spawnParticles,
    updateParticles,
    addShake,
    spriteCache: function () {
      return spriteCache;
    },
  };
})(window.ST3 = window.ST3 || {});
