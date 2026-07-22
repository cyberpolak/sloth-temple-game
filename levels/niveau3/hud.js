/* SHA'UR'NA — HUD + tips + écrans */
(function (ST3) {
  'use strict';

  let els = {};
  let tipTimer = 0;
  let tipSeen = {};

  function mount() {
    els.hpFill = document.getElementById('hud-hp-fill');
    els.hpText = document.getElementById('hud-hp-text');
    els.ammo = document.getElementById('hud-ammo');
    els.ammoPanel = document.getElementById('hud-ammo-panel');
    els.ammoLabel = document.getElementById('hud-ammo-label');
    els.seals = document.getElementById('hud-seals');
    els.prompt = document.getElementById('hud-prompt');
    els.annonce = document.getElementById('annonce');
    els.tipStack = document.getElementById('tip-stack');
    els.intro = document.getElementById('intro-quote');
    els.tutoriel = document.getElementById('tutoriel');
    els.tutorielOk = document.getElementById('tutoriel-ok');
    els.tutorielGrid = document.getElementById('tutoriel-grid');
    els.ecranFin = document.getElementById('ecran-fin');
    els.finTitre = document.getElementById('fin-titre');
    els.finTexte = document.getElementById('fin-texte');
    els.finOk = document.getElementById('fin-ok');
    els.bossBar = document.getElementById('boss-bar');
    els.bossFill = document.getElementById('boss-fill');
    els.bossName = document.getElementById('boss-name');
  }

  function update(state) {
    const p = state.player;
    if (!p || !els.hpFill) return;
    const hpPct = ST3.Utils.clamp((p.hp / ST3.Player.MAX_HP) * 100, 0, 100);
    els.hpFill.style.width = hpPct + '%';
    els.hpFill.classList.toggle('low', p.hp <= 30);
    els.hpText.textContent = Math.max(0, Math.ceil(p.hp)) + '';

    const ammo = Math.max(0, p.ammo | 0);
    const ammoEmpty = ammo <= 0;
    const ammoLow = ammo > 0 && ammo <= 8;
    els.ammo.textContent = ammo + '';
    els.ammo.classList.toggle('low', ammoLow);
    els.ammo.classList.toggle('empty', ammoEmpty);
    if (els.ammoPanel) {
      els.ammoPanel.classList.toggle('ammo-critical', ammoLow || ammoEmpty);
      els.ammoPanel.classList.toggle('empty', ammoEmpty);
    }
    if (els.ammoLabel) {
      els.ammoLabel.textContent = ammoEmpty ? 'MUNITIONS · GRIFFES' : 'MUNITIONS';
    }
    if (ammoEmpty) {
      showTip(
        'ammo-empty',
        'MUNITIONS',
        'Plus de cry — griffe de Somnul !',
        4000
      );
    }

    const destroyed = state.seals.filter(function (s) {
      return s.destroyed && !s.isBoss;
    }).length;
    // Count boss death as 4th
    const sealsDone = state.sealsDestroyed || destroyed;
    els.seals.textContent = sealsDone + '/4';

    // Interact prompt
    if (state.nearSeal && state.phase === 'play' && !state.bossAwakened) {
      if (state.sealsDestroyed >= 3) {
        els.prompt.style.opacity = '0';
      } else {
        const touch =
          typeof SlothDevice !== 'undefined' && SlothDevice.isTouchPrimary();
        els.prompt.textContent = touch
          ? 'ACTION — Briser le sceau'
          : 'E / ACTION — Briser le sceau';
        els.prompt.style.opacity = '1';
      }
    } else {
      els.prompt.style.opacity = '0';
    }

    // Boss HP
    const boss = state.seals.find(function (s) {
      return s.isBoss && s.hp > 0;
    });
    if (boss && els.bossBar) {
      els.bossBar.style.display = 'block';
      els.bossName.textContent = boss.name || "SHA'UR'NA";
      els.bossFill.style.width = ST3.Utils.clamp((boss.hp / boss.maxHp) * 100, 0, 100) + '%';
    } else if (els.bossBar) {
      els.bossBar.style.display = 'none';
    }
  }

  function announce(text, ms) {
    if (!els.annonce) return;
    els.annonce.textContent = text;
    els.annonce.style.opacity = '1';
    clearTimeout(announce._t);
    announce._t = setTimeout(function () {
      els.annonce.style.opacity = '0';
    }, ms || 2200);
  }

  function showTip(key, title, body, ms) {
    if (tipSeen[key] || !els.tipStack) return;
    tipSeen[key] = true;
    const bub = document.createElement('div');
    bub.className = 'tip-bubble';
    bub.innerHTML = '<strong>' + title + '</strong>' + body;
    els.tipStack.appendChild(bub);
    setTimeout(function () {
      bub.classList.add('fade-out');
      setTimeout(function () {
        if (bub.parentNode) bub.parentNode.removeChild(bub);
      }, 400);
    }, ms || 3500);
  }

  function checkInscriptions(player) {
    const list = ST3.Map.inscriptions;
    for (let i = 0; i < list.length; i++) {
      const ins = list[i];
      const d = ST3.Utils.dist(player.x, player.y, ins.x + 0.5, ins.y + 0.5);
      if (d < 1.8) {
        showTip('ins-' + i, 'INSCRIPTION', ins.text, 4000);
      }
    }
    checkGraffiti(player);
  }

  /** Première vue du graffiti SOMNUL */
  function checkGraffiti(player) {
    if (tipSeen['graffiti-somnul'] || !ST3.Map) return;
    const cx = player.x | 0;
    const cy = player.y | 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (ST3.Map.wallId(cx + dx, cy + dy) === 8) {
          showTip(
            'graffiti-somnul',
            'GRAFFITI',
            '« Somnul a gravé son nom dans la pierre… suis les runes vertes. »',
            4500
          );
          return;
        }
      }
    }
  }

  function bindDismiss(btn, onDone) {
    function done(e) {
      if (e) e.preventDefault();
      btn.removeEventListener('click', done);
      window.removeEventListener('keydown', onKey);
      onDone();
    }
    function onKey(e) {
      // Enter / Échap only — Espace est aussi le tir une fois en jeu
      if (e.code === 'Enter' || e.code === 'Escape') done(e);
    }
    btn.addEventListener('click', done);
    window.addEventListener('keydown', onKey);
  }

  function showIntro() {
    return new Promise(function (resolve) {
      if (!els.intro) {
        resolve();
        return;
      }
      els.intro.style.display = 'flex';
      const ok = document.getElementById('intro-ok');
      bindDismiss(ok, function () {
        els.intro.style.display = 'none';
        resolve();
      });
    });
  }

  function showTutorial(isTouch) {
    return new Promise(function (resolve) {
      if (!els.tutoriel) {
        resolve();
        return;
      }
      // Fill controls based on device
      if (els.tutorielGrid) {
        if (isTouch) {
          els.tutorielGrid.innerHTML =
            '<div class="tut-key">CROIX</div><div class="tut-desc">Avancer / reculer / pas de côté</div>' +
            '<div class="tut-key">REGARD</div><div class="tut-desc">Joystick droit pour viser</div>' +
            '<div class="tut-key">TIR</div><div class="tut-desc">Cry vert — griffe si vide</div>' +
            '<div class="tut-key">ACTION</div><div class="tut-desc">Briser un sceau (proche)</div>';
        } else {
          els.tutorielGrid.innerHTML =
            '<div class="tut-key">ZQSD / WASD</div><div class="tut-desc">Avancer / pas de côté</div>' +
            '<div class="tut-key">← → / SOURIS</div><div class="tut-desc">Tourner (clic pour verrouiller)</div>' +
            '<div class="tut-key">ESPACE</div><div class="tut-desc">Cry / griffe à sec</div>' +
            '<div class="tut-key">E</div><div class="tut-desc">Action — briser un sceau</div>';
        }
      }
      els.tutoriel.style.display = 'flex';
      bindDismiss(els.tutorielOk, function () {
        els.tutoriel.style.display = 'none';
        resolve();
      });
    });
  }

  function showWin(onOk) {
    if (!els.ecranFin) {
      onOk();
      return;
    }
    els.finTitre.textContent = "SHA'UR'NA";
    if (els.finTexte) {
      els.finTexte.innerHTML =
        'Les quatre sceaux sont poussière.<br><br>' +
        'Somnul rouvre l\'œil du Temple.<br>' +
        'La pierre respire — lente, ancienne, satisfaite.<br><br>' +
        '<em style="color:#6a9a72;font-style:normal;letter-spacing:2px">' +
        'Ce qui fut scellé est repris.</em>';
    }
    els.ecranFin.style.display = 'flex';
    els.finOk.onclick = function () {
      els.ecranFin.style.display = 'none';
      onOk();
    };
  }

  function showDeathFlash() {
    announce('…le sommeil te reprend…', 1600);
  }

  ST3.HUD = {
    mount,
    update,
    announce,
    showTip,
    checkInscriptions,
    showIntro,
    showTutorial,
    showWin,
    showDeathFlash,
  };
})(window.ST3 = window.ST3 || {});
