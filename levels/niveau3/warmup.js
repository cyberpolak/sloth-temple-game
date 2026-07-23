/* SHA'UR'NA — chargement / warmup GPU + audio (hors écran de jeu) */
(function (ST3) {
  'use strict';

  function yieldFrame() {
    return new Promise(function (resolve) {
      requestAnimationFrame(function () {
        resolve();
      });
    });
  }

  function report(onProgress, p) {
    if (typeof onProgress === 'function') {
      onProgress(Math.max(0, Math.min(1, p)));
    }
  }

  /**
   * Warm renderer / engine / combat paths before intro.
   * @param {function(number)} onProgress 0–1
   */
  async function run(onProgress) {
    report(onProgress, 0);

    // 1. Ensure Renderer canvas + assets (boot already inits; resize forces layout)
    if (ST3.Renderer && typeof ST3.Renderer.resize === 'function') {
      ST3.Renderer.resize();
    }
    await yieldFrame();
    report(onProgress, 0.15);

    // 2. Engine3D.init if mesh not built yet
    if (ST3.Engine3D && typeof ST3.Engine3D.init === 'function') {
      const faces = typeof ST3.Engine3D.faceCount === 'function' ? ST3.Engine3D.faceCount() : 0;
      if (!faces) {
        ST3.Engine3D.init();
      }
    }
    await yieldFrame();
    report(onProgress, 0.3);

    // 3. Warm combat draw paths
    if (ST3.Renderer && typeof ST3.Renderer.warmCombat === 'function') {
      ST3.Renderer.warmCombat();
    }
    await yieldFrame();
    report(onProgress, 0.45);

    // 4. Warm frames — pivot angle, phase play (hidden under loading overlay)
    const state = ST3.Game && typeof ST3.Game.getState === 'function' ? ST3.Game.getState() : null;
    if (state && state.player && ST3.Renderer && typeof ST3.Renderer.frame === 'function') {
      const savedPhase = state.phase;
      const savedAngle = state.player.angle;
      const savedAnim = state.animT || 0;
      state.phase = 'play';
      const frames = 6;
      for (let i = 0; i < frames; i++) {
        const ang = savedAngle + (i / frames) * (Math.PI * 0.35);
        if (ST3.Player && typeof ST3.Player.setAngle === 'function') {
          ST3.Player.setAngle(state.player, ang);
        } else {
          state.player.angle = ang;
          state.player.dirX = Math.cos(ang);
          state.player.dirY = Math.sin(ang);
          const pl = (ST3.Engine3D && ST3.Engine3D.HALF_TAN) || Math.tan(Math.PI / 6);
          state.player.planeX = Math.cos(ang + Math.PI / 2) * pl;
          state.player.planeY = Math.sin(ang + Math.PI / 2) * pl;
        }
        state.animT = savedAnim + i * 0.05;
        ST3.Renderer.frame(state);
        await yieldFrame();
        report(onProgress, 0.45 + ((i + 1) / frames) * 0.4);
      }
      state.phase = savedPhase;
      if (ST3.Player && typeof ST3.Player.setAngle === 'function') {
        ST3.Player.setAngle(state.player, savedAngle);
      } else {
        state.player.angle = savedAngle;
        state.player.dirX = Math.cos(savedAngle);
        state.player.dirY = Math.sin(savedAngle);
        const pl = (ST3.Engine3D && ST3.Engine3D.HALF_TAN) || Math.tan(Math.PI / 6);
        state.player.planeX = Math.cos(savedAngle + Math.PI / 2) * pl;
        state.player.planeY = Math.sin(savedAngle + Math.PI / 2) * pl;
      }
      state.animT = savedAnim;
    } else {
      report(onProgress, 0.85);
    }

    // 5. Audio warm if already unlocked; else game will warm after tutorial gesture
    if (ST3.Audio && typeof ST3.Audio.warm === 'function') {
      if (ST3.Audio.isUnlocked && ST3.Audio.isUnlocked()) {
        ST3.Audio.warm();
      }
    }
    await yieldFrame();
    report(onProgress, 1);
  }

  ST3.Warmup = { run };
})(window.ST3 = window.ST3 || {});
