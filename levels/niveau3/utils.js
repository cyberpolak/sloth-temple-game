/* SHA'UR'NA — utilitaires mathématiques */
(function (ST3) {
  'use strict';

  function clamp(v, a, b) {
    return v < a ? a : v > b ? b : v;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function dist(ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function dist2(ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    return dx * dx + dy * dy;
  }

  function normAngle(a) {
    if (!Number.isFinite(a)) return 0;
    // Modulo avoids infinite loops on huge / infinite values
    const tau = Math.PI * 2;
    a = a % tau;
    if (a <= -Math.PI) a += tau;
    if (a > Math.PI) a -= tau;
    return a;
  }

  function angleDiff(a, b) {
    return normAngle(b - a);
  }

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  function randInt(a, b) {
    return (a + Math.floor(Math.random() * (b - a + 1))) | 0;
  }

  function hexRgb(hex) {
    const h = hex.replace('#', '');
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    };
  }

  function shadeColor(hex, factor) {
    const c = hexRgb(hex);
    const f = clamp(factor, 0, 1.5);
    return (
      'rgb(' +
      ((c.r * f) | 0) +
      ',' +
      ((c.g * f) | 0) +
      ',' +
      ((c.b * f) | 0) +
      ')'
    );
  }

  function createCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  ST3.Utils = {
    clamp,
    lerp,
    dist,
    dist2,
    normAngle,
    angleDiff,
    rand,
    randInt,
    hexRgb,
    shadeColor,
    createCanvas,
  };
})(window.ST3 = window.ST3 || {});
