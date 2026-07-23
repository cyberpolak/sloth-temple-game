/* SHA'UR'NA — IA ennemis + boss sceau */
(function (ST3) {
  'use strict';

  /** Shared kite / shoot envelope; per-variant hp/speed/boltDmg override. */
  const MONK_BASE = {
    keepDist: 4.2,
    shootRange: 7.5,
    fireCd: 1.95,
    boltSpeed: 5.5,
    radius: 0.28,
  };

  const MONK_VARIANTS = {
    ash: { hp: 40, speed: 1.1, boltDmg: 6 },
    riff: { hp: 48, speed: 1.0, boltDmg: 8 },
    smoke: { hp: 32, speed: 1.35, boltDmg: 5 },
    somnul: { hp: 55, speed: 0.95, boltDmg: 7 },
  };

  /** @deprecated alias — ash defaults (scripts / HUD may still read MONK) */
  const MONK = Object.assign({}, MONK_BASE, MONK_VARIANTS.ash);

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

  function pushEnemyBolt(bolts, x, y, ang, speed, damage, life, r) {
    bolts.push({
      x: x + Math.cos(ang) * 0.35,
      y: y + Math.sin(ang) * 0.35,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      life: life || 2,
      friendly: false,
      damage: damage,
      r: r || 0.14,
      trailAcc: 0,
    });
  }

  function spawnSomnulDeathRing(e, bolts) {
    if (!bolts) return;
    const spin = Math.random() * Math.PI * 2;
    const dmg = Math.max(3, (e.boltDmg || MONK_VARIANTS.somnul.boltDmg) - 2);
    for (let k = 0; k < 3; k++) {
      const ang = spin + (k / 3) * Math.PI * 2;
      pushEnemyBolt(bolts, e.x, e.y, ang, MONK_BASE.boltSpeed * 0.85, dmg, 1.6, 0.12);
    }
    if (ST3.Renderer && ST3.Renderer.spawnParticles) {
      ST3.Renderer.spawnParticles(e.x, e.y, '#5aff9a', 10, { kind: 'mist', spread: 1.8, life: 0.45 });
      ST3.Renderer.spawnParticles(e.x, e.y, '#7affaa', 6, { kind: 'spark', spread: 1.4, life: 0.35 });
    }
  }

  function trySmokeBlink(e, player) {
    // Short step toward / past player when LoS breaks (cd ~4s)
    const ang = Math.atan2(player.y - e.y, player.x - e.x) + ST3.Utils.rand(-0.5, 0.5);
    const step = ST3.Utils.rand(1.1, 1.7);
    const nx = e.x + Math.cos(ang) * step;
    const ny = e.y + Math.sin(ang) * step;
    const r = e.radius;
    if (!cellBlocked(nx, ny, r) && !insidePlayerSafe(nx, ny, player)) {
      e.x = nx;
      e.y = ny;
      e.blinkCd = 4.0 + ST3.Utils.rand(-0.4, 0.6);
      if (ST3.Renderer && ST3.Renderer.spawnParticles) {
        ST3.Renderer.spawnParticles(e.x, e.y, 'corrupt', 8, { kind: 'mist', spread: 1.4, life: 0.4 });
      }
      return true;
    }
    return false;
  }

  function createFromEntity(ent) {
    if (ent.type !== 'monk') return null;
    const variant = ent.variant && MONK_VARIANTS[ent.variant] ? ent.variant : 'ash';
    const stats = MONK_VARIANTS[variant];
    return {
      kind: 'monk',
      variant: variant,
      x: ent.x,
      y: ent.y,
      hp: stats.hp,
      maxHp: stats.hp,
      speed: stats.speed,
      boltDmg: stats.boltDmg,
      alive: true,
      fireCd: ST3.Utils.rand(0.4, 1.2),
      meleeCd: 0,
      blinkCd: ST3.Utils.rand(1.5, 3.5),
      shotCount: 0,
      mistAcc: 0,
      radius: MONK_BASE.radius,
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
    if (e.blinkCd > 0) e.blinkCd -= dt;

    const prevX = e.x;
    const prevY = e.y;
    const d = ST3.Utils.dist(e.x, e.y, player.x, player.y);
    const los = d < 12 && hasLineOfSight(e.x, e.y, player.x, player.y);
    e.facing = Math.atan2(player.y - e.y, player.x - e.x);

    if (e.kind === 'monk') {
      const speed = e.speed || MONK.speed;
      const boltDmg = e.boltDmg || MONK.boltDmg;
      const variant = e.variant || 'ash';

      if (!los) {
        if (d < 10) moveToward(e, player.x, player.y, speed * 0.4, dt, player);
        // smoke: short blink step when LoS lost
        if (variant === 'smoke' && (e.blinkCd || 0) <= 0 && d < 11) {
          trySmokeBlink(e, player);
        }
      } else {
        if (d < MONK_BASE.keepDist - 0.5) {
          moveToward(e, e.x - (player.x - e.x), e.y - (player.y - e.y), speed, dt, player);
        } else if (d > MONK_BASE.keepDist + 0.8) {
          moveToward(e, player.x, player.y, speed, dt, player);
        }
        if (d < MONK_BASE.shootRange && e.fireCd <= 0) {
          const ang = Math.atan2(player.y - e.y, player.x - e.x);
          e.shotCount = (e.shotCount || 0) + 1;
          // riff: 2-bolt fan ±0.12 every other shot
          if (variant === 'riff' && (e.shotCount % 2) === 0) {
            pushEnemyBolt(bolts, e.x, e.y, ang - 0.12, MONK_BASE.boltSpeed, boltDmg);
            pushEnemyBolt(bolts, e.x, e.y, ang + 0.12, MONK_BASE.boltSpeed, boltDmg);
          } else {
            pushEnemyBolt(bolts, e.x, e.y, ang, MONK_BASE.boltSpeed, boltDmg);
          }
          e.fireCd = MONK_BASE.fireCd + ST3.Utils.rand(-0.2, 0.3);
          e.attackFlash = 0.28;
        }
      }

      // smoke: mist particles while moving
      if (variant === 'smoke') {
        const movedNow = Math.abs(e.x - prevX) + Math.abs(e.y - prevY) > 0.0008;
        if (movedNow) {
          e.mistAcc = (e.mistAcc || 0) + dt;
          if (e.mistAcc > 0.09 && ST3.Renderer && ST3.Renderer.spawnParticles) {
            e.mistAcc = 0;
            ST3.Renderer.spawnParticles(e.x, e.y, 'corrupt', 1, {
              kind: 'mist',
              spread: 0.35,
              life: 0.28,
              scale: 0.2,
            });
          }
        }
      }
    } else if (e.kind === 'boss') {
      if (e.ringCd > 0) e.ringCd -= dt;
      if (e.chargeCd > 0) e.chargeCd -= dt;

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

    separateFromPlayer(e, player);

    const moved = Math.abs(e.x - prevX) + Math.abs(e.y - prevY) > 0.0008;
    e.moving = moved;
    e.lastX = e.x;
    e.lastY = e.y;
    if (e.attackFlash > 0) {
      e.anim = 'attack';
    } else if (e.hurtFlash > 0) {
      e.anim = 'hurt';
    } else if (moved) {
      e.anim = 'walk';
      e.animT = (e.animT || 0) + dt;
    } else {
      e.anim = 'idle';
    }
  }

  function damage(e, dmg, bolts) {
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
      if (e.kind === 'monk' && e.variant === 'somnul') {
        spawnSomnulDeathRing(e, bolts);
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
        let hit = false;
        for (let j = 0; j < enemies.length; j++) {
          const e = enemies[j];
          if (!e.alive) continue;
          if (ST3.Utils.dist(b.x, b.y, e.x, e.y) < e.radius + b.r) {
            damage(e, b.damage, bolts);
            fxHit(b.x, b.y, true);
            hit = true;
            break;
          }
        }
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
    MONK_BASE,
    MONK_VARIANTS,
    BOSS,
    createFromEntity,
    createBoss,
    updateEnemy,
    damage,
    updateBolts,
    hasLineOfSight,
  };
})(window.ST3 = window.ST3 || {});
