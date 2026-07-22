/* SHA'UR'NA — boucle principale & machine d'états
 * États: boot → intro → tutorial → play → sealBoss → cine → win → menu
 */
(function (ST3) {
  'use strict';

  const input = {
    forward: false,
    back: false,
    strafeLeft: false,
    strafeRight: false,
    turnLeft: false,
    turnRight: false,
    fire: false,
    action: false,
    mouseDx: 0,
    lookStick: 0,
  };

  let state = null;
  let lastT = 0;
  let loopStarted = false;
  let actionLatch = false;
  let pointerLocked = false;

  function freshState() {
    const spawn = ST3.Map.getPlayerSpawn();
    const seals = [];
    const pickups = [];
    const enemies = [];

    ST3.Map.entities.forEach(function (ent) {
      if (ent.type === 'seal') {
        seals.push({
          sealIndex: ent.sealIndex,
          x: ent.x,
          y: ent.y,
          name: ent.name,
          destroyed: false,
          isBoss: false,
          hp: 0,
          maxHp: 0,
        });
      } else if (ent.type === 'ammo' || ent.type === 'health') {
        pickups.push({
          kind: ent.type,
          x: ent.x,
          y: ent.y,
          amount: ent.amount,
          taken: false,
        });
      } else if (ent.type === 'monk' || ent.type === 'hound') {
        const e = ST3.Enemy.createFromEntity(ent);
        if (e) enemies.push(e);
      }
    });

    return {
      phase: 'boot',
      player: ST3.Player.create(spawn),
      seals: seals,
      pickups: pickups,
      enemies: enemies,
      bolts: [],
      sealsDestroyed: 0,
      checkpoint: { x: spawn.x, y: spawn.y, angle: -Math.PI / 2 },
      nearSeal: null,
      bossAwakened: false,
      bossForeshadow: 0, // 0 idle · 1 approaching · 2 ready to awaken
      foreshadowT: 0,
      animT: 0,
      winPending: false,
      cineT: 0,
      cineBeat: 0,
      screenFlash: 0,
    };
  }

  function setupKeyboard() {
    window.addEventListener('keydown', function (e) {
      if (state && state.phase !== 'play' && state.phase !== 'sealBoss') return;
      ST3.Audio.unlock();
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          input.forward = true;
          e.preventDefault();
          break;
        case 'KeyS':
        case 'ArrowDown':
          input.back = true;
          e.preventDefault();
          break;
        case 'KeyA':
          input.strafeLeft = true;
          e.preventDefault();
          break;
        case 'KeyD':
          input.strafeRight = true;
          e.preventDefault();
          break;
        case 'ArrowLeft':
          input.turnLeft = true;
          e.preventDefault();
          break;
        case 'KeyE':
          input.action = true;
          e.preventDefault();
          break;
        case 'ArrowRight':
          input.turnRight = true;
          e.preventDefault();
          break;
        case 'Space':
          input.fire = true;
          e.preventDefault();
          break;
      }
    });

    window.addEventListener('keyup', function (e) {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          input.forward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          input.back = false;
          break;
        case 'KeyA':
          input.strafeLeft = false;
          break;
        case 'KeyD':
          input.strafeRight = false;
          break;
        case 'ArrowLeft':
          input.turnLeft = false;
          break;
        case 'KeyE':
          input.action = false;
          break;
        case 'ArrowRight':
          input.turnRight = false;
          break;
        case 'Space':
          input.fire = false;
          break;
      }
    });

    // Click to pointer-lock for mouse look (desktop)
    const canvas = document.getElementById('game-canvas');
    canvas.addEventListener('click', function () {
      ST3.Audio.unlock();
      if (typeof SlothDevice !== 'undefined' && SlothDevice.isTouchPrimary()) return;
      if (state && (state.phase === 'play' || state.phase === 'sealBoss')) {
        canvas.requestPointerLock && canvas.requestPointerLock();
      }
    });
    document.addEventListener('pointerlockchange', function () {
      pointerLocked = document.pointerLockElement === canvas;
    });
    document.addEventListener('mousemove', function (e) {
      if (!pointerLocked) return;
      input.mouseDx += e.movementX || 0;
    });
  }

  function destroySeal(seal) {
    if (seal.destroyed || seal.isBoss) return;
    seal.destroyed = true;
    state.sealsDestroyed++;
    state.checkpoint = {
      x: seal.x,
      y: seal.y,
      angle: state.player.angle,
    };
    ST3.Audio.sfx.seal();
    ST3.HUD.announce(seal.name + ' brisé', 2000);
    if (ST3.Renderer && ST3.Renderer.spawnParticles) {
      ST3.Renderer.spawnParticles(seal.x, seal.y, '#5aff9a', 16, { kind: 'mixed', spread: 2.8, life: 0.55 });
      ST3.Renderer.spawnParticles(seal.x, seal.y, 'gold', 10, { kind: 'gold', spread: 2.2, life: 0.5 });
    }

    // Soft clear nearby threats slightly by giving ammo
    state.player.ammo = Math.min(ST3.Player.MAX_AMMO, state.player.ammo + 6);

    // Narrative foreshadow — never auto-awaken on seal break
    if (state.sealsDestroyed === 2) {
      ST3.HUD.showTip(
        'seal-2-omen',
        'OMEN',
        'Trois restaient. Sous le troisième, quelque chose écoute.',
        4200
      );
    } else if (state.sealsDestroyed === 3) {
      ST3.HUD.announce('Le dernier ne dormira pas.', 2800);
      state.screenFlash = 0.55;
    }
  }

  function startBossForeshadow() {
    if (state.bossAwakened || state.bossForeshadow > 0 || state.sealsDestroyed < 3) return;
    state.bossForeshadow = 1;
    state.foreshadowT = 0;
    ST3.HUD.announce('La pierre pulse.', 1500);
  }

  function updateBossForeshadow(dt) {
    if (state.bossAwakened || state.bossForeshadow !== 1) return;
    state.foreshadowT += dt;
    if (state.foreshadowT >= 1.5 && state.foreshadowT - dt < 1.5) {
      ST3.HUD.announce("Un œil s'ouvre sous l'or.", 2000);
    }
    if (state.foreshadowT >= 2.9) {
      state.bossForeshadow = 2;
      const last = state.seals.find(function (s) {
        return !s.destroyed && !s.isBoss;
      });
      if (last) awakenBoss(last);
    }
  }

  function awakenBoss(seal) {
    if (state.bossAwakened) return;
    state.bossAwakened = true;
    state.bossForeshadow = 2;
    seal.isBoss = true;
    seal.destroyed = false;
    seal.hp = ST3.Enemy.BOSS.hp;
    seal.maxHp = ST3.Enemy.BOSS.hp;
    seal.name = "SHA'UR'NA ÉVEILLÉE";
    state.phase = 'sealBoss';
    ST3.Audio.sfx.bossAwaken();
    state.screenFlash = 0.75;
    if (ST3.Renderer && ST3.Renderer.addShake) {
      ST3.Renderer.addShake(7);
    }
    if (ST3.Renderer && ST3.Renderer.spawnParticles) {
      ST3.Renderer.spawnParticles(seal.x, seal.y, '#5aff9a', 36, { kind: 'mixed', spread: 4.2, life: 0.9 });
      ST3.Renderer.spawnParticles(seal.x, seal.y, 'gold', 22, { kind: 'gold', spread: 3.6, life: 0.8 });
      ST3.Renderer.spawnParticles(seal.x, seal.y, '#5aff9a', 18, { kind: 'mist', spread: 2.8, life: 1.1 });
    }
    ST3.HUD.announce("SHA'UR'NA S'ÉVEILLE", 2200);
    setTimeout(function () {
      if (!state || state.phase !== 'sealBoss') return;
      ST3.HUD.announce('Le sceau qui ne devait jamais ouvrir les yeux.', 2600);
    }, 1600);

    const boss = ST3.Enemy.createBoss(seal);
    state.enemies.push(boss);
    state._bossEnemy = boss;
  }

  function tryInteract() {
    const seal = ST3.Player.nearestSeal(state.player, state.seals);
    state.nearSeal = seal;
    if (!seal) {
      // Reset latch even when far from seals (otherwise E stays "stuck" after a press)
      if (!input.action) actionLatch = false;
      return;
    }
    if (!input.action) {
      actionLatch = false;
      return;
    }
    if (actionLatch) return;
    actionLatch = true;

    // Last seal: start foreshadow / finish awaken — never casual destroy
    const remaining = state.seals.filter(function (s) {
      return !s.destroyed && !s.isBoss;
    });
    if (remaining.length === 1 && state.sealsDestroyed >= 3 && seal === remaining[0]) {
      if (state.bossForeshadow === 0) startBossForeshadow();
      else if (state.bossForeshadow >= 2) awakenBoss(seal);
      return;
    }

    destroySeal(seal);
  }

  function updatePickups() {
    const p = state.player;
    for (let i = 0; i < state.pickups.length; i++) {
      const item = state.pickups[i];
      if (item.taken) continue;
      if (ST3.Utils.dist(p.x, p.y, item.x, item.y) < 0.55) {
        item.taken = true;
        if (item.kind === 'ammo') {
          p.ammo = Math.min(ST3.Player.MAX_AMMO, p.ammo + item.amount);
        } else {
          p.hp = Math.min(ST3.Player.MAX_HP, p.hp + item.amount);
        }
        ST3.Audio.sfx.pickup();
      }
    }
  }

  function syncBoss() {
    if (!state._bossEnemy || !state.bossAwakened) return;
    const boss = state._bossEnemy;
    const seal = state.seals.find(function (s) {
      return s.isBoss;
    });
    if (!seal) return;
    // Sync position seal ↔ enemy for sprite (renderer uses seals for boss sprite)
    seal.x = boss.x;
    seal.y = boss.y;
    seal.hp = boss.hp;
    if (!boss.alive || boss.hp <= 0) {
      seal.hp = 0;
      seal.destroyed = true;
      if (!state.winPending) {
        state.winPending = true;
        state.sealsDestroyed = 4;
        if (ST3.Renderer && ST3.Renderer.spawnParticles) {
          ST3.Renderer.spawnParticles(seal.x, seal.y, '#5aff9a', 40, { kind: 'mixed', spread: 4.0, life: 1.0 });
          ST3.Renderer.spawnParticles(seal.x, seal.y, 'gold', 24, { kind: 'gold', spread: 3.4, life: 0.9 });
          ST3.Renderer.spawnParticles(seal.x, seal.y, '#5aff9a', 16, { kind: 'mist', spread: 2.4, life: 1.2 });
        }
        if (ST3.Renderer && ST3.Renderer.addShake) ST3.Renderer.addShake(5);
        startCine();
      }
    }
  }

  function startCine() {
    state.phase = 'cine';
    state.cineT = 0;
    state.cineBeat = 0;
    ST3.Touch.setBlocked(true);
    // Clear hostile bolts so dissolve reads clean
    state.bolts = state.bolts.filter(function (b) {
      return b.friendly;
    });
    ST3.HUD.announce('Les quatre sceaux sont poussière.', 2200);
  }

  function updateCine(dt) {
    state.cineT += dt;
    state.animT += dt; // keep world ambience alive during dissolve
    if (ST3.Renderer && ST3.Renderer.updateParticles) {
      ST3.Renderer.updateParticles(dt);
    }
    // Soft lingering dissolve particles near fallen boss
    const seal = state.seals.find(function (s) {
      return s.isBoss;
    });
    if (seal && state.cineT < 1.4 && ST3.Renderer && ST3.Renderer.spawnParticles && Math.random() < 0.35) {
      ST3.Renderer.spawnParticles(seal.x, seal.y, '#5aff9a', 2, { kind: 'mist', spread: 1.4, life: 0.5 });
    }

    if (state.cineBeat < 1 && state.cineT >= 1.5) {
      state.cineBeat = 1;
      state.screenFlash = 0.7;
      ST3.HUD.announce("Somnul rouvre l'œil du Temple.", 2400);
      ST3.Audio.sfx.win();
    }

    if (state.cineBeat < 2 && state.cineT >= 3.5) {
      state.cineBeat = 2;
      state.phase = 'win';
      ST3.HUD.showWin(function () {
        SlothProgress.completeLevel(3);
        slothGoToMenu();
      });
    }

    ST3.HUD.update(state);
  }

  function cellWalkable(cx, cy) {
    return ST3.Map.inBounds(cx, cy) && !ST3.Map.isSolid(cx, cy);
  }

  /** Find open cell center at least minDist from (px,py), preferring near that ring. */
  function findOpenAway(px, py, minDist) {
    let best = null;
    let bestScore = Infinity;
    for (let cy = 1; cy < ST3.Map.H - 1; cy++) {
      for (let cx = 1; cx < ST3.Map.W - 1; cx++) {
        if (!cellWalkable(cx, cy)) continue;
        const x = cx + 0.5;
        const y = cy + 0.5;
        const d = ST3.Utils.dist(x, y, px, py);
        if (d < minDist) continue;
        const score = Math.abs(d - (minDist + 1.2));
        if (score < bestScore) {
          bestScore = score;
          best = { x: x, y: y };
        }
      }
    }
    return best;
  }

  /** Soft knockback enemies off spawn; teleport if blocked. */
  function clearEnemiesNearSpawn(px, py, enemies) {
    const NEAR = 2.5;
    const FAR = 4.0;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (!e.alive) continue;
      const d = ST3.Utils.dist(e.x, e.y, px, py);
      if (d >= NEAR) continue;

      let dx = e.x - px;
      let dy = e.y - py;
      let len = Math.sqrt(dx * dx + dy * dy);
      if (len < 0.08) {
        const ang = Math.random() * Math.PI * 2;
        dx = Math.cos(ang);
        dy = Math.sin(ang);
        len = 1;
      } else {
        dx /= len;
        dy /= len;
      }

      const pushDist = Math.max(3.4, NEAR + 1.0);
      const tx = px + dx * pushDist;
      const ty = py + dy * pushDist;
      const tcx = Math.floor(tx);
      const tcy = Math.floor(ty);
      let placed = false;
      if (cellWalkable(tcx, tcy)) {
        const nx = tcx + 0.5;
        const ny = tcy + 0.5;
        if (ST3.Utils.dist(nx, ny, px, py) >= NEAR) {
          e.x = nx;
          e.y = ny;
          placed = true;
        }
      }
      if (!placed) {
        const spot = findOpenAway(px, py, FAR);
        if (spot) {
          e.x = spot.x;
          e.y = spot.y;
        }
      }
      // Brief stun so they don't instantly re-engage
      e.fireCd = Math.max(e.fireCd || 0, 1.2);
      e.meleeCd = Math.max(e.meleeCd || 0, 1.2);
    }
  }

  function clearEnemyBoltsNear(bolts, px, py, radius) {
    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i];
      if (b.friendly) continue;
      if (ST3.Utils.dist(b.x, b.y, px, py) < radius) {
        bolts.splice(i, 1);
      }
    }
  }

  function respawn() {
    ST3.HUD.showDeathFlash();
    const cp = state.checkpoint;
    state.player.x = cp.x;
    state.player.y = cp.y;
    ST3.Player.setAngle(state.player, cp.angle != null ? cp.angle : -Math.PI / 2);
    state.player.hp = ST3.Player.MAX_HP;
    state.player.ammo = ST3.Player.MAX_AMMO;
    state.player.invuln = 2.0;
    state.player.spawnGrace = 2.0;
    state.player.hurtFlash = 0;
    state.player.meleeFlash = 0;
    state.player.muzzleFlash = 0;
    state.player.attackFlash = 0;
    state.player.fireCd = 0;

    // Soft reset: revive dead non-boss enemies at reduced HP
    state.enemies.forEach(function (e) {
      if (e.kind === 'boss') return;
      if (!e.alive) {
        e.alive = true;
        e.hp = e.maxHp * 0.6;
      }
    });

    // Critical: push living threats off the checkpoint before play resumes
    clearEnemiesNearSpawn(state.player.x, state.player.y, state.enemies);
    clearEnemyBoltsNear(state.bolts, state.player.x, state.player.y, 4.0);
    // Also drop any leftover hostile bolts in the whole arena for a clean breath
    state.bolts = state.bolts.filter(function (b) {
      return b.friendly;
    });
  }

  function update(dt) {
    if (!state) return;
    if (state.screenFlash > 0) {
      state.screenFlash = Math.max(0, state.screenFlash - dt * 1.35);
    }
    if (state.phase === 'cine') {
      updateCine(dt);
      return;
    }
    if (state.phase !== 'play' && state.phase !== 'sealBoss') {
      ST3.HUD.update(state);
      return;
    }

    state.animT += dt;
    ST3.Player.update(state.player, dt, input, state.bolts, state.enemies);

    for (let i = 0; i < state.enemies.length; i++) {
      ST3.Enemy.updateEnemy(state.enemies[i], dt, state.player, state.bolts);
    }

    ST3.Enemy.updateBolts(state.bolts, dt, state.player, state.enemies, state.seals);
    if (ST3.Renderer && ST3.Renderer.updateParticles) {
      ST3.Renderer.updateParticles(dt);
    }
    updatePickups();
    tryInteract();
    updateBossForeshadow(dt);

    // Approach last seal → foreshadow arc (no abrupt awaken)
    if (!state.bossAwakened && state.sealsDestroyed >= 3 && state.bossForeshadow === 0) {
      const last = state.seals.find(function (s) {
        return !s.destroyed && !s.isBoss;
      });
      if (last && ST3.Utils.dist(state.player.x, state.player.y, last.x, last.y) < 2.8) {
        startBossForeshadow();
      }
    }

    syncBoss();
    ST3.HUD.checkInscriptions(state.player);

    if (state.player.hp <= 0) {
      respawn();
    }

    ST3.HUD.update(state);
    ST3.Touch.refresh();
  }

  function loop(t) {
    requestAnimationFrame(loop);
    if (!loopStarted) {
      loopStarted = true;
      lastT = t;
      return;
    }
    const dt = Math.min((t - lastT) / 1000, 0.05);
    lastT = t;
    if (dt <= 0) return;
    update(dt);
    ST3.Renderer.frame(state);
  }

  function completeAndMenu() {
    SlothProgress.completeLevel(3);
    slothGoToMenu();
  }

  async function boot() {
    if (!SlothProgress.isUnlocked(3)) {
      slothGoToMenu();
      return;
    }

    state = freshState();
    ST3.HUD.mount();
    ST3.Audio.bindMusic(document.getElementById('musique-niveau'));
    ST3.Renderer.init(document.getElementById('game-canvas'));
    setupKeyboard();
    ST3.Touch.mount(input);

    if (typeof SlothFullscreen !== 'undefined') {
      SlothFullscreen.mount();
    }
    SlothDevSkip.mount(completeAndMenu);

    // Unlock audio on first gesture
    document.body.addEventListener(
      'pointerdown',
      function () {
        ST3.Audio.unlock();
      },
      { once: true }
    );

    state.phase = 'intro';
    ST3.Touch.setBlocked(true);
    ST3.Renderer.frame(state);

    await ST3.HUD.showIntro();
    const isTouch = typeof SlothDevice !== 'undefined' && SlothDevice.isTouchPrimary();
    state.phase = 'tutorial';
    await ST3.HUD.showTutorial(isTouch);

    ST3.Audio.unlock();
    ST3.Audio.startMusic();
    // Purge held keys from intro/tutoriel (Espace, etc.)
    input.forward = input.back = false;
    input.strafeLeft = input.strafeRight = false;
    input.turnLeft = input.turnRight = false;
    input.fire = input.action = false;
    input.mouseDx = 0;
    input.lookStick = 0;
    actionLatch = false;
    state.phase = 'play';
    ST3.Touch.setBlocked(false);
    ST3.HUD.announce("SHA'UR'NA", 1800);

    requestAnimationFrame(loop);
  }

  ST3.Game = {
    boot,
    getState: function () {
      return state;
    },
    getInput: function () {
      return input;
    },
  };

  // Auto-start when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window.ST3 = window.ST3 || {});
