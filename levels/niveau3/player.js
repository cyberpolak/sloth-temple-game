/* SHA'UR'NA — joueur, collision, tir + griffe melee */
(function (ST3) {
  'use strict';

  const MOVE_SPEED = 3.2;
  const STRAFE_SPEED = 2.6;
  const ROT_SPEED = 2.4;
  const MOUSE_SENS = 0.0022;
  const RADIUS = 0.22;
  const MAX_HP = 100;
  const MAX_AMMO = 60;
  const FIRE_COOLDOWN = 0.28;
  const BOLT_SPEED = 10;
  const BOLT_DAMAGE = 20;
  const START_AMMO = 32;
  const HURT_INVULN = 0.85;
  const INTERACT_DIST = 1.15;

  // Melee claw — intimate, weighty, higher damage than bolt
  const MELEE_RANGE = 1.05;
  const MELEE_DAMAGE = 31;
  const MELEE_COOLDOWN = 0.45;
  const MELEE_HALF_CONE = 0.55; // ~63° total arc
  const MELEE_FLASH = 0.38;

  function create(spawn) {
    const ang = -Math.PI / 2; // face north-ish
    return {
      x: spawn.x,
      y: spawn.y,
      dirX: Math.cos(ang),
      dirY: Math.sin(ang),
      planeX: Math.cos(ang + Math.PI / 2) * 0.66,
      planeY: Math.sin(ang + Math.PI / 2) * 0.66,
      hp: MAX_HP,
      ammo: START_AMMO,
      fireCd: 0,
      muzzleFlash: 0,
      meleeFlash: 0,
      attackFlash: 0,
      hurtFlash: 0,
      invuln: 0,
      spawnGrace: 0,
      moving: false,
      angle: ang,
    };
  }

  function setAngle(p, ang) {
    p.angle = ST3.Utils.normAngle(ang);
    p.dirX = Math.cos(p.angle);
    p.dirY = Math.sin(p.angle);
    p.planeX = Math.cos(p.angle + Math.PI / 2) * 0.66;
    p.planeY = Math.sin(p.angle + Math.PI / 2) * 0.66;
  }

  function tryMove(p, nx, ny) {
    const map = ST3.Map;
    const r = RADIUS;
    // Circle vs grid — check neighboring cells
    function blocked(x, y) {
      const minCX = Math.floor(x - r);
      const maxCX = Math.floor(x + r);
      const minCY = Math.floor(y - r);
      const maxCY = Math.floor(y + r);
      for (let cy = minCY; cy <= maxCY; cy++) {
        for (let cx = minCX; cx <= maxCX; cx++) {
          if (map.isSolid(cx, cy)) {
            // Closest point on cell to circle center
            const closestX = ST3.Utils.clamp(x, cx, cx + 1);
            const closestY = ST3.Utils.clamp(y, cy, cy + 1);
            const dx = x - closestX;
            const dy = y - closestY;
            if (dx * dx + dy * dy < r * r) return true;
          }
        }
      }
      return false;
    }

    if (!blocked(nx, p.y)) p.x = nx;
    if (!blocked(p.x, ny)) p.y = ny;
  }

  /**
   * Closest living enemy in forward cone within MELEE_RANGE.
   * Boss is an enemy — seals without HP stay on interact (E).
   */
  function tryMeleeHit(player, enemies) {
    if (!enemies || !enemies.length) return { hits: 0, target: null };

    const half = MELEE_HALF_CONE;
    const reach = MELEE_RANGE;
    let best = null;
    let bestD = reach + 0.01;

    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (!e || !e.alive) continue;
      const dx = e.x - player.x;
      const dy = e.y - player.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      // Allow slight radius pad so body edge counts
      const pad = (e.radius || 0.25) * 0.35;
      if (d > reach + pad || d < 0.01) continue;

      const ang = Math.atan2(dy, dx);
      if (Math.abs(ST3.Utils.angleDiff(player.angle, ang)) > half) continue;

      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }

    if (!best) return { hits: 0, target: null };

    ST3.Enemy.damage(best, MELEE_DAMAGE);
    return { hits: 1, target: best };
  }

  function fireBolt(p, bolts) {
    p.ammo--;
    p.fireCd = FIRE_COOLDOWN;
    p.muzzleFlash = 0.34;
    p.attackFlash = 0.22;
    bolts.push({
      x: p.x + p.dirX * 0.4,
      y: p.y + p.dirY * 0.4,
      vx: p.dirX * BOLT_SPEED,
      vy: p.dirY * BOLT_SPEED,
      life: 1.4,
      friendly: true,
      damage: BOLT_DAMAGE,
      r: 0.12,
      trailAcc: 0,
    });
    ST3.Audio.sfx.shoot();
    if (ST3.Renderer && ST3.Renderer.spawnParticles) {
      ST3.Renderer.spawnParticles(
        p.x + p.dirX * 0.55,
        p.y + p.dirY * 0.55,
        '#5aff9a',
        4,
        { kind: 'spark', spread: 1.0, life: 0.2, scale: 0.16 }
      );
    }
  }

  function fireMelee(p, enemies) {
    p.fireCd = MELEE_COOLDOWN;
    p.meleeFlash = MELEE_FLASH;
    p.attackFlash = 0.28;
    p.muzzleFlash = 0;

    ST3.Audio.sfx.clawSwing();
    if (ST3.Renderer && ST3.Renderer.addShake) {
      ST3.Renderer.addShake(3.5);
    }

    if (ST3.HUD && ST3.HUD.showTip) {
      ST3.HUD.showTip(
        'melee-first',
        'GRIFFE',
        'Sans cry… la griffe de Somnul tranche de près.',
        4200
      );
    }

    const result = tryMeleeHit(p, enemies);
    if (result.hits > 0 && result.target) {
      ST3.Audio.sfx.clawHit();
      if (ST3.Renderer && ST3.Renderer.addShake) {
        ST3.Renderer.addShake(7);
      }
      if (ST3.Renderer && ST3.Renderer.spawnParticles) {
        const t = result.target;
        const hx = t.x;
        const hy = t.y;
        ST3.Renderer.spawnParticles(hx, hy, '#5aff9a', 12, {
          kind: 'spark',
          spread: 2.4,
          life: 0.32,
          scale: 0.2,
        });
        ST3.Renderer.spawnParticles(hx, hy, '#bfffc8', 6, {
          kind: 'mist',
          spread: 1.4,
          life: 0.28,
        });
      }
    } else {
      // Miss whoosh motes — still alive, never dead
      if (ST3.Renderer && ST3.Renderer.spawnParticles) {
        ST3.Renderer.spawnParticles(
          p.x + p.dirX * 0.7,
          p.y + p.dirY * 0.7,
          '#5aff9a',
          3,
          { kind: 'mist', spread: 0.8, life: 0.18, scale: 0.14 }
        );
      }
    }
    return result;
  }

  function update(p, dt, input, bolts, enemies) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.angle)) {
      p.x = 14.5;
      p.y = 14.5;
      setAngle(p, -Math.PI / 2);
    }
    if (p.fireCd > 0) p.fireCd -= dt;
    if (p.muzzleFlash > 0) p.muzzleFlash -= dt;
    if (p.meleeFlash > 0) p.meleeFlash -= dt;
    if (p.attackFlash > 0) p.attackFlash -= dt;
    if (p.hurtFlash > 0) p.hurtFlash -= dt;
    if (p.invuln > 0) p.invuln -= dt;
    if (p.spawnGrace > 0) p.spawnGrace -= dt;

    // Rotation
    let rot = 0;
    if (input.turnLeft) rot -= 1;
    if (input.turnRight) rot += 1;
    if (input.mouseDx) {
      rot += input.mouseDx * MOUSE_SENS / Math.max(dt, 0.001) * 0.35;
      input.mouseDx = 0;
    }
    if (rot !== 0) setAngle(p, p.angle + rot * ROT_SPEED * dt);

    // Movement
    let mx = 0;
    let my = 0;
    if (input.forward) {
      mx += p.dirX;
      my += p.dirY;
    }
    if (input.back) {
      mx -= p.dirX;
      my -= p.dirY;
    }
    if (input.strafeLeft) {
      mx += p.dirY;
      my -= p.dirX;
    }
    if (input.strafeRight) {
      mx -= p.dirY;
      my += p.dirX;
    }
    const len = Math.sqrt(mx * mx + my * my);
    p.moving = len > 0.01;
    if (p.moving) {
      mx /= len;
      my /= len;
      const speed = input.forward || input.back ? MOVE_SPEED : STRAFE_SPEED;
      tryMove(p, p.x + mx * speed * dt, p.y + my * speed * dt);
    }

    // Fire — bolt when ammo, claw melee when empty
    if (input.fire && p.fireCd <= 0) {
      if (p.ammo > 0) {
        fireBolt(p, bolts);
      } else {
        fireMelee(p, enemies || []);
      }
    }
  }

  function hurt(p, dmg) {
    if (p.invuln > 0 || p.spawnGrace > 0) return false;
    p.hp -= dmg;
    p.hurtFlash = 0.35;
    p.invuln = HURT_INVULN;
    ST3.Audio.sfx.hurt();
    return true;
  }

  function nearestSeal(p, seals) {
    let best = null;
    let bestD = INTERACT_DIST;
    for (let i = 0; i < seals.length; i++) {
      const s = seals[i];
      if (s.destroyed || s.isBoss) continue;
      const d = ST3.Utils.dist(p.x, p.y, s.x, s.y);
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    return best;
  }

  ST3.Player = {
    MAX_HP,
    MAX_AMMO,
    START_AMMO,
    RADIUS,
    INTERACT_DIST,
    MELEE_RANGE,
    MELEE_DAMAGE,
    MELEE_COOLDOWN,
    MELEE_HALF_CONE,
    create,
    setAngle,
    update,
    hurt,
    nearestSeal,
    tryMove,
    tryMeleeHit,
  };
})(window.ST3 = window.ST3 || {});
