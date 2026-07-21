/* SHA'UR'NA — IA ennemis + boss sceau */
(function (ST3) {
  'use strict';

  const MONK = {
    hp: 40,
    speed: 1.1,
    keepDist: 4.2,
    shootRange: 7.5,
    fireCd: 1.95,
    boltSpeed: 5.5,
    boltDmg: 6,
    radius: 0.28,
  };

  const HOUND = {
    hp: 28,
    speed: 2.45,
    meleeRange: 1.05,
    meleeDmg: 7,
    meleeCd: 0.85,
    aggroRange: 9.5,
    radius: 0.26,
  };

  const BOSS = {
    hp: 160,
    speed: 1.6,
    keepDist: 3.2,
    shootRange: 9,
    fireCd: 0.95,
    boltSpeed: 6.5,
    boltDmg: 10,
    meleeRange: 1.25,
    meleeDmg: 13,
    meleeCd: 1.1,
    radius: 0.45,
    ringCd: 3.5,
    ringBolts: 7,
    ringSpeed: 5.2,
    chargeCd: 5.2,
    chargeDur: 0.4,
    chargeSpeed: 5.8,
    chargeTelegraph: 0.28,
  };

  /** Zone autour du joueur infranchissable — évite le stack / ennemi inatteignable */
  const PLAYER_SAFE = 0.9;

  function cellBlocked(x, y, r) {
    const map = ST3.Map;
    const minCX = Math.floor(x - r);
    const maxCX = Math.floor(x + r);
    const minCY = Math.floor(y - r);
    const maxCY = Math.floor(y + r);
    for (let cy = minCY; cy <= maxCY; cy++) {
      for (let cx = minCX; cx <= maxCX; cx++) {
        if (map.isSolid(cx, cy)) {
          const closestX = ST3.Utils.clamp(x, cx, cx + 1);
          const closestY = ST3.Utils.clamp(y, cy, cy + 1);
          const ddx = x - closestX;
          const ddy = y - closestY;
          if (ddx * ddx + ddy * ddy < r * r) return true;
        }
      }
    }
    return false;
  }

  function insidePlayerSafe(x, y, player) {
    const dx = x - player.x;
    const dy = y - player.y;
    return dx * dx + dy * dy < PLAYER_SAFE * PLAYER_SAFE;
  }

  /** Repousse l'ennemi hors de la bulle du joueur (murs respectés). */
  function separateFromPlayer(e, player) {
    let dx = e.x - player.x;
    let dy = e.y - player.y;
    let d = Math.sqrt(dx * dx + dy * dy);
    if (d < 0.05) {
      // Exactement dessus : pousse dans la direction opposée au regard joueur, ou est
      dx = -player.dirX || 1;
      dy = -player.dirY || 0;
      d = Math.sqrt(dx * dx + dy * dy) || 1;
    }
    if (d >= PLAYER_SAFE) return;
    const nx = player.x + (dx / d) * PLAYER_SAFE;
    const ny = player.y + (dy / d) * PLAYER_SAFE;
    const r = e.radius;
    if (!cellBlocked(nx, e.y, r)) e.x = nx;
    else if (!cellBlocked(e.x, ny, r)) e.y = ny;
    else if (!cellBlocked(nx, ny, r)) {
      e.x = nx;
      e.y = ny;
    } else {
      // Glisse autour de la bulle
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const sx = player.x + Math.cos(a) * PLAYER_SAFE;
        const sy = player.y + Math.sin(a) * PLAYER_SAFE;
        if (!cellBlocked(sx, sy, r)) {
          e.x = sx;
          e.y = sy;
          break;
        }
      }
    }
  }

  function moveToward(e, tx, ty, speed, dt, player) {
    const dx = tx - e.x;
    const dy = ty - e.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = e.x + (dx / d) * speed * dt;
    const ny = e.y + (dy / d) * speed * dt;
    const r = e.radius;
    if (player) {
      if (!cellBlocked(nx, e.y, r) && !insidePlayerSafe(nx, e.y, player)) e.x = nx;
      if (!cellBlocked(e.x, ny, r) && !insidePlayerSafe(e.x, ny, player)) e.y = ny;
    } else {
      if (!cellBlocked(nx, e.y, r)) e.x = nx;
      if (!cellBlocked(e.x, ny, r)) e.y = ny;
    }
  }

  function createFromEntity(ent) {
    if (ent.type === 'monk') {
      return {
        kind: 'monk',
        x: ent.x,
        y: ent.y,
        hp: MONK.hp,
        maxHp: MONK.hp,
        alive: true,
        fireCd: ST3.Utils.rand(0.4, 1.2),
        meleeCd: 0,
        radius: MONK.radius,
        hurtFlash: 0,
        anim: 'idle',
        animT: ST3.Utils.rand(0, 2),
        facing: 0,
        attackFlash: 0,
        moving: false,
        lastX: ent.x,
        lastY: ent.y,
      };
    }
    if (ent.type === 'hound') {
      return {
        kind: 'hound',
        x: ent.x,
        y: ent.y,
        hp: HOUND.hp,
        maxHp: HOUND.hp,
        alive: true,
        fireCd: 0,
        meleeCd: ST3.Utils.rand(0.2, 0.8),
        radius: HOUND.radius,
        hurtFlash: 0,
        anim: 'idle',
        animT: ST3.Utils.rand(0, 2),
        facing: 0,
        attackFlash: 0,
        moving: false,
        lastX: ent.x,
        lastY: ent.y,
      };
    }
    return null;
  }

  function createBoss(seal) {
    return {
      kind: 'boss',
      x: seal.x,
      y: seal.y,
      hp: BOSS.hp,
      maxHp: BOSS.hp,
      alive: true,
      fireCd: 0.8,
      meleeCd: 0.6,
      ringCd: 2.2,
      chargeCd: 3.0,
      chargeT: 0,
      chargeTele: 0,
      radius: BOSS.radius,
      hurtFlash: 0,
      anim: 'idle',
      animT: 0,
      facing: 0,
      attackFlash: 0,
      moving: false,
      lastX: seal.x,
      lastY: seal.y,
      sealRef: seal,
    };
  }

  function hasLineOfSight(ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    const steps = Math.ceil(Math.sqrt(dx * dx + dy * dy) * 4);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const x = ax + dx * t;
      const y = ay + dy * t;
      if (ST3.Map.isSolid(x | 0, y | 0)) return false;
    }
    return true;
  }

  function updateEnemy(e, dt, player, bolts) {
    if (!e.alive) return;
    if (e.hurtFlash > 0) e.hurtFlash -= dt;
    if (e.fireCd > 0) e.fireCd -= dt;
    if (e.meleeCd > 0) e.meleeCd -= dt;
    if (e.attackFlash > 0) e.attackFlash -= dt;

    const prevX = e.x;
    const prevY = e.y;
    const d = ST3.Utils.dist(e.x, e.y, player.x, player.y);
    const los = d < 12 && hasLineOfSight(e.x, e.y, player.x, player.y);
    e.facing = Math.atan2(player.y - e.y, player.x - e.x);

    if (e.kind === 'monk') {
      if (!los) {
        // Idle wander slightly toward player if somewhat close
        if (d < 10) moveToward(e, player.x, player.y, MONK.speed * 0.4, dt, player);
      } else {
        if (d < MONK.keepDist - 0.5) {
          // Back away
          moveToward(e, e.x - (player.x - e.x), e.y - (player.y - e.y), MONK.speed, dt, player);
        } else if (d > MONK.keepDist + 0.8) {
          moveToward(e, player.x, player.y, MONK.speed, dt, player);
        }
        if (d < MONK.shootRange && e.fireCd <= 0) {
          const ang = Math.atan2(player.y - e.y, player.x - e.x);
          bolts.push({
            x: e.x + Math.cos(ang) * 0.35,
            y: e.y + Math.sin(ang) * 0.35,
            vx: Math.cos(ang) * MONK.boltSpeed,
            vy: Math.sin(ang) * MONK.boltSpeed,
            life: 2,
            friendly: false,
            damage: MONK.boltDmg,
            r: 0.14,
            trailAcc: 0,
          });
          e.fireCd = MONK.fireCd + ST3.Utils.rand(-0.2, 0.3);
          e.attackFlash = 0.28;
        }
      }
    } else if (e.kind === 'hound') {
      if (d < HOUND.aggroRange) {
        moveToward(e, player.x, player.y, HOUND.speed, dt, player);
      }
      if (d < HOUND.meleeRange && d >= PLAYER_SAFE * 0.92 && e.meleeCd <= 0) {
        ST3.Player.hurt(player, HOUND.meleeDmg);
        e.meleeCd = HOUND.meleeCd;
        e.attackFlash = 0.22;
        if (ST3.Renderer && ST3.Renderer.spawnParticles) {
          ST3.Renderer.spawnParticles(player.x, player.y, 'corrupt', 6, { kind: 'mist' });
        }
      }
    } else if (e.kind === 'boss') {
      if (e.ringCd > 0) e.ringCd -= dt;
      if (e.chargeCd > 0) e.chargeCd -= dt;

      // Charge rush: telegraph → dash → melee if in range
      if (e.chargeTele > 0) {
        e.attackFlash = Math.max(e.attackFlash, 0.22);
        e.chargeTele -= dt;
        if (e.chargeTele <= 0) {
          e.chargeT = BOSS.chargeDur;
          e.attackFlash = 0.35;
        }
      } else if (e.chargeT > 0) {
        moveToward(e, player.x, player.y, BOSS.chargeSpeed, dt, player);
        e.attackFlash = Math.max(e.attackFlash, 0.18);
        e.chargeT -= dt;
        if (e.chargeT <= 0) {
          const dAfter = ST3.Utils.dist(e.x, e.y, player.x, player.y);
          if (dAfter < BOSS.meleeRange + 0.2 && dAfter >= PLAYER_SAFE * 0.9) {
            ST3.Player.hurt(player, BOSS.meleeDmg);
            e.meleeCd = BOSS.meleeCd;
            e.attackFlash = 0.3;
            if (ST3.Renderer && ST3.Renderer.spawnParticles) {
              ST3.Renderer.spawnParticles(player.x, player.y, 'corrupt', 8, { kind: 'spark', spread: 2.0 });
            }
          }
        }
      } else if (!los && d > 2) {
        moveToward(e, player.x, player.y, BOSS.speed * 0.6, dt, player);
      } else {
        if (d < BOSS.meleeRange && d >= PLAYER_SAFE * 0.92 && e.meleeCd <= 0) {
          ST3.Player.hurt(player, BOSS.meleeDmg);
          e.meleeCd = BOSS.meleeCd;
          e.attackFlash = 0.25;
        }
        if (d < BOSS.keepDist) {
          moveToward(e, e.x - (player.x - e.x), e.y - (player.y - e.y), BOSS.speed * 0.8, dt, player);
        } else if (d > BOSS.keepDist + 1) {
          moveToward(e, player.x, player.y, BOSS.speed, dt, player);
        }

        // Spread bolts (primary ranged)
        if (d < BOSS.shootRange && e.fireCd <= 0 && los) {
          const base = Math.atan2(player.y - e.y, player.x - e.x);
          for (let k = -1; k <= 1; k++) {
            const ang = base + k * 0.18;
            bolts.push({
              x: e.x + Math.cos(ang) * 0.4,
              y: e.y + Math.sin(ang) * 0.4,
              vx: Math.cos(ang) * BOSS.boltSpeed,
              vy: Math.sin(ang) * BOSS.boltSpeed,
              life: 2.2,
              friendly: false,
              damage: BOSS.boltDmg,
              r: 0.16,
              trailAcc: 0,
            });
          }
          e.fireCd = BOSS.fireCd;
          e.attackFlash = 0.3;
        }

        // Ring pulse — radial bolts with gaps (telegraphed)
        if (e.ringCd <= 0 && los && d < BOSS.shootRange + 1.5) {
          e.ringCd = BOSS.ringCd + ST3.Utils.rand(-0.25, 0.35);
          e.attackFlash = 0.4;
          if (ST3.Renderer && ST3.Renderer.spawnParticles) {
            for (let ri = 0; ri < 10; ri++) {
              const ra = (ri / 10) * Math.PI * 2;
              ST3.Renderer.spawnParticles(
                e.x + Math.cos(ra) * 0.55,
                e.y + Math.sin(ra) * 0.55,
                '#5aff9a',
                1,
                { kind: 'spark', spread: 0.6, life: 0.35, scale: 0.22 }
              );
            }
            ST3.Renderer.spawnParticles(e.x, e.y, '#5aff9a', 8, { kind: 'mist', spread: 1.6, life: 0.4 });
          }
          const n = BOSS.ringBolts;
          const spin = Math.random() * 0.4;
          for (let k = 0; k < n; k++) {
            const ang = spin + (k / n) * Math.PI * 2;
            bolts.push({
              x: e.x + Math.cos(ang) * 0.45,
              y: e.y + Math.sin(ang) * 0.45,
              vx: Math.cos(ang) * BOSS.ringSpeed,
              vy: Math.sin(ang) * BOSS.ringSpeed,
              life: 2.0,
              friendly: false,
              damage: BOSS.boltDmg - 2,
              r: 0.15,
              trailAcc: 0,
            });
          }
        }

        // Start charge telegraph when mid-range
        if (e.chargeCd <= 0 && los && d > 1.8 && d < 7.5) {
          e.chargeTele = BOSS.chargeTelegraph;
          e.chargeCd = BOSS.chargeCd + ST3.Utils.rand(-0.4, 0.5);
          e.attackFlash = 0.35;
          if (ST3.Renderer && ST3.Renderer.spawnParticles) {
            ST3.Renderer.spawnParticles(e.x, e.y, 'gold', 6, { kind: 'gold', spread: 1.2, life: 0.3 });
          }
        }
      }
    }

    // Jamais empiler sur le joueur
    separateFromPlayer(e, player);

    // Anim state (does not change HP / AI numbers)
    const moved = Math.abs(e.x - prevX) + Math.abs(e.y - prevY) > 0.0008;
    e.moving = moved;
    e.lastX = e.x;
    e.lastY = e.y;
    // Priority: attack > hurt > walk > idle
    if (e.attackFlash > 0) {
      e.anim = 'attack';
    } else if (e.hurtFlash > 0) {
      e.anim = 'hurt';
    } else if (moved) {
      e.anim = 'walk';
      // Advance only while walking so walk0/walk1 swap ~7 Hz
      e.animT = (e.animT || 0) + dt;
    } else {
      e.anim = 'idle';
    }
  }

  function damage(e, dmg) {
    if (!e.alive) return false;
    e.hp -= dmg;
    e.hurtFlash = 0.2;
    if (e.hp <= 0) {
      e.alive = false;
      e.hp = 0;
      ST3.Audio.sfx.enemyDie();
      if (ST3.Renderer && ST3.Renderer.spawnParticles) {
        ST3.Renderer.spawnParticles(e.x, e.y, '#5aff9a', 14, { kind: 'mixed', spread: 2.4, life: 0.45 });
      }
      return true;
    }
    ST3.Audio.sfx.hit();
    return false;
  }

  function fxHit(x, y, friendly) {
    if (!ST3.Renderer || !ST3.Renderer.spawnParticles) return;
    if (friendly) {
      ST3.Renderer.spawnParticles(x, y, '#5aff9a', 8, { kind: 'spark', spread: 2.0 });
      ST3.Renderer.spawnParticles(x, y, '#5aff9a', 4, { kind: 'mist', spread: 1.2, life: 0.4 });
    } else {
      ST3.Renderer.spawnParticles(x, y, 'corrupt', 7, { kind: 'spark', spread: 1.8 });
      ST3.Renderer.spawnParticles(x, y, 'corrupt', 3, { kind: 'mist', spread: 1.0, life: 0.35 });
    }
  }

  function updateBolts(bolts, dt, player, enemies, seals) {
    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;

      // Trail mist along flight path
      b.trailAcc = (b.trailAcc || 0) + dt;
      if (b.trailAcc > 0.045 && ST3.Renderer && ST3.Renderer.spawnParticles) {
        b.trailAcc = 0;
        ST3.Renderer.spawnParticles(
          b.x,
          b.y,
          b.friendly ? '#5aff9a' : 'corrupt',
          1,
          { kind: 'mist', spread: 0.3, life: 0.18, scale: 0.22 }
        );
      }

      if (b.life <= 0 || ST3.Map.isSolid(b.x | 0, b.y | 0)) {
        fxHit(b.x, b.y, b.friendly);
        bolts.splice(i, 1);
        continue;
      }

      if (b.friendly) {
        // Hit enemies
        let hit = false;
        for (let j = 0; j < enemies.length; j++) {
          const e = enemies[j];
          if (!e.alive) continue;
          if (ST3.Utils.dist(b.x, b.y, e.x, e.y) < e.radius + b.r) {
            damage(e, b.damage);
            fxHit(b.x, b.y, true);
            hit = true;
            break;
          }
        }
        // Boss HP is tracked on the boss enemy (synced to seal in game.js)
        if (hit) bolts.splice(i, 1);
      } else {
        if (ST3.Utils.dist(b.x, b.y, player.x, player.y) < ST3.Player.RADIUS + b.r) {
          ST3.Player.hurt(player, b.damage);
          fxHit(b.x, b.y, false);
          bolts.splice(i, 1);
        }
      }
    }
  }

  ST3.Enemy = {
    MONK,
    HOUND,
    BOSS,
    createFromEntity,
    createBoss,
    updateEnemy,
    damage,
    updateBolts,
    hasLineOfSight,
  };
})(window.ST3 = window.ST3 || {});
