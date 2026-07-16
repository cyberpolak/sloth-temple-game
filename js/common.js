/* SLOTH TEMPLE — utilitaires partagés */
const SlothProgress = (() => {
  const KEY = 'sloth-temple-progress';
  const TOTAL = 5;
  const DEFAULT = { unlocked: [1], completed: [] };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return { ...DEFAULT, unlocked: [1] };
      const data = JSON.parse(raw);
      const unlocked = Array.isArray(data.unlocked) && data.unlocked.length
        ? [...new Set([1, ...data.unlocked])].sort((a, b) => a - b)
        : [1];
      const completed = Array.isArray(data.completed) ? [...new Set(data.completed)].sort((a, b) => a - b) : [];
      return { unlocked, completed };
    } catch {
      return { unlocked: [1], completed: [] };
    }
  }

  function save(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  function isUnlocked(n) {
    return load().unlocked.includes(n);
  }

  function isCompleted(n) {
    return load().completed.includes(n);
  }

  function completeLevel(n) {
    const data = load();
    if (!data.completed.includes(n)) data.completed.push(n);
    const next = n + 1;
    if (next <= TOTAL && !data.unlocked.includes(next)) data.unlocked.push(next);
    data.unlocked.sort((a, b) => a - b);
    data.completed.sort((a, b) => a - b);
    save(data);
    return data;
  }

  function reset() {
    localStorage.removeItem(KEY);
  }

  return { load, save, isUnlocked, isCompleted, completeLevel, reset, TOTAL };
})();

const SlothDevice = (() => {
  function isMobile() {
    return window.matchMedia('(max-width: 900px), (pointer: coarse)').matches;
  }

  /** Appareil tactile principal (sans souris) — contrôles à l'écran */
  function isTouchPrimary() {
    return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  }

  function isPortrait() {
    return window.matchMedia('(orientation: portrait)').matches;
  }

  return { isMobile, isTouchPrimary, isPortrait };
})();

const SlothShell = (() => {
  function isEmbedded() {
    try {
      return window.parent !== window && !!window.parent.SlothApp;
    } catch {
      return false;
    }
  }

  function indexPath() {
    return window.location.pathname.includes('/levels/') ? '../index.html' : 'index.html';
  }

  return { isEmbedded, indexPath };
})();

const SlothFullscreen = (() => {
  let btn = null;

  function isActive() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }

  function applyLandscape() {
    const mobile = SlothDevice.isMobile();
    document.documentElement.classList.toggle('fs-active', isActive());
    document.documentElement.classList.toggle('fs-mobile', isActive() && mobile);
    document.documentElement.classList.toggle('fs-landscape', isActive() && mobile && SlothDevice.isPortrait());
    if (isActive() && mobile && screen.orientation && screen.orientation.lock) {
      screen.orientation.lock('landscape').catch(() => {});
    }
    if (!isActive() && screen.orientation && screen.orientation.unlock) {
      screen.orientation.unlock();
    }
    updateButton();
  }

  function updateButton() {
    if (!btn) return;
    btn.textContent = '⛶';
    btn.title = isActive() ? 'Quitter le plein écran' : 'Plein écran';
    btn.setAttribute('aria-label', btn.title);
    btn.classList.toggle('actif', isActive());
  }

  function enter() {
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (req) return req.call(el);
    return Promise.reject();
  }

  function exit() {
    const ex = document.exitFullscreen || document.webkitExitFullscreen;
    if (ex) return ex.call(document);
    return Promise.reject();
  }

  function toggle() {
    if (isActive()) return exit().catch(() => {});
    return enter().catch(() => {});
  }

  function mount() {
    if (SlothShell.isEmbedded()) return null;
    if (btn || document.getElementById('btn-fullscreen')) {
      btn = document.getElementById('btn-fullscreen');
      updateButton();
      return btn;
    }
    btn = document.createElement('button');
    btn.id = 'btn-fullscreen';
    btn.type = 'button';
    btn.addEventListener('click', toggle);
    document.body.appendChild(btn);
    ['fullscreenchange', 'webkitfullscreenchange'].forEach((ev) => {
      document.addEventListener(ev, applyLandscape);
    });
    window.addEventListener('resize', applyLandscape);
    window.addEventListener('orientationchange', applyLandscape);
    updateButton();
    return btn;
  }

  return { mount, toggle, isActive, enter, exit };
})();

function slothGoToMenu() {
  if (SlothShell.isEmbedded()) {
    window.parent.SlothApp.showMenu();
    return;
  }
  window.location.href = `${SlothShell.indexPath()}?menu=1`;
}

function slothGoHome() {
  if (SlothShell.isEmbedded()) {
    window.parent.SlothApp.showSplash();
    return;
  }
  window.location.href = SlothShell.indexPath();
}

const SlothDevSkip = (() => {
  function mount(onComplete) {
    if (document.getElementById('btn-dev-skip')) return;
    const btn = document.createElement('button');
    btn.id = 'btn-dev-skip';
    btn.type = 'button';
    btn.textContent = 'DEV ⏭';
    btn.title = 'Passer le niveau (développement)';
    btn.setAttribute('aria-label', btn.title);
    btn.addEventListener('click', onComplete);
    document.body.appendChild(btn);
  }

  return { mount };
})();
