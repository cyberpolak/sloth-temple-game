/* SHA'UR'NA — WebAudio SFX + musique HTMLAudio */
(function (ST3) {
  'use strict';

  let actx = null;
  let master = null;
  let musicEl = null;
  let unlocked = false;

  function ensureCtx() {
    if (actx) return actx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    actx = new AC();
    master = actx.createGain();
    master.gain.value = 0.22;
    master.connect(actx.destination);
    return actx;
  }

  function unlock() {
    ensureCtx();
    if (actx && actx.state === 'suspended') {
      actx.resume().catch(function () {});
    }
    unlocked = true;
    if (musicEl) {
      musicEl.play().catch(function () {});
    }
  }

  function beep(freq, dur, type, vol, slide) {
    if (!ensureCtx()) return;
    const t0 = actx.currentTime;
    const osc = actx.createOscillator();
    const g = actx.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, slide), t0 + dur);
    }
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol != null ? vol : 0.18, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noiseBurst(dur, vol) {
    if (!ensureCtx()) return;
    const len = Math.max(1, (actx.sampleRate * dur) | 0);
    const buf = actx.createBuffer(1, len, actx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = actx.createBufferSource();
    src.buffer = buf;
    const g = actx.createGain();
    const t0 = actx.currentTime;
    g.gain.setValueAtTime(vol != null ? vol : 0.12, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(g);
    g.connect(master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  const SFX = {
    shoot: function () {
      beep(520, 0.08, 'square', 0.14, 180);
      beep(880, 0.05, 'sawtooth', 0.06, 220);
    },
    /** Empty-ammo claw whoosh — air cut, never silent on miss */
    clawSwing: function () {
      noiseBurst(0.11, 0.11);
      beep(320, 0.1, 'sawtooth', 0.07, 90);
      beep(190, 0.14, 'triangle', 0.09, 55);
      setTimeout(function () {
        noiseBurst(0.06, 0.05);
        beep(140, 0.08, 'square', 0.04, 70);
      }, 45);
    },
    /** Meaty claw connect — low thud + wet bite */
    clawHit: function () {
      beep(95, 0.12, 'sawtooth', 0.22, 42);
      noiseBurst(0.09, 0.14);
      setTimeout(function () {
        beep(160, 0.07, 'triangle', 0.12, 70);
        noiseBurst(0.05, 0.08);
      }, 35);
      setTimeout(function () {
        beep(70, 0.1, 'square', 0.1, 38);
      }, 70);
    },
    hit: function () {
      beep(180, 0.07, 'triangle', 0.16, 90);
      noiseBurst(0.05, 0.08);
    },
    hurt: function () {
      beep(140, 0.18, 'sawtooth', 0.2, 60);
      noiseBurst(0.12, 0.1);
    },
    seal: function () {
      beep(220, 0.12, 'triangle', 0.16);
      setTimeout(function () {
        beep(330, 0.14, 'triangle', 0.14);
      }, 90);
      setTimeout(function () {
        beep(440, 0.22, 'sine', 0.12);
      }, 180);
    },
    pickup: function () {
      beep(660, 0.06, 'square', 0.12);
      setTimeout(function () {
        beep(990, 0.08, 'square', 0.1);
      }, 50);
    },
    enemyDie: function () {
      beep(110, 0.2, 'sawtooth', 0.14, 40);
      noiseBurst(0.15, 0.1);
    },
    bossAwaken: function () {
      noiseBurst(0.45, 0.18);
      beep(48, 0.55, 'sawtooth', 0.26, 28);
      setTimeout(function () {
        beep(62, 0.5, 'square', 0.2, 36);
        noiseBurst(0.28, 0.12);
      }, 140);
      setTimeout(function () {
        beep(90, 0.35, 'sawtooth', 0.16, 50);
      }, 320);
      setTimeout(function () {
        beep(140, 0.4, 'triangle', 0.14, 70);
        noiseBurst(0.2, 0.1);
      }, 520);
    },
    win: function () {
      beep(220, 0.18, 'triangle', 0.14);
      setTimeout(function () {
        beep(330, 0.2, 'triangle', 0.13);
      }, 140);
      setTimeout(function () {
        beep(440, 0.22, 'sine', 0.14);
      }, 280);
      setTimeout(function () {
        beep(554, 0.28, 'sine', 0.12);
      }, 440);
      setTimeout(function () {
        beep(660, 0.45, 'sine', 0.15);
        beep(330, 0.5, 'triangle', 0.06);
      }, 620);
    },
  };

  function bindMusic(el) {
    musicEl = el;
    if (musicEl) {
      musicEl.loop = true;
      musicEl.volume = 0.45;
    }
  }

  function startMusic() {
    if (!musicEl) return;
    musicEl.play().catch(function () {});
  }

  function stopMusic() {
    if (!musicEl) return;
    musicEl.pause();
  }

  ST3.Audio = {
    unlock,
    bindMusic,
    startMusic,
    stopMusic,
    sfx: SFX,
    isUnlocked: function () {
      return unlocked;
    },
  };
})(window.ST3 = window.ST3 || {});
