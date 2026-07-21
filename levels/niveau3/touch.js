/* SHA'UR'NA — contrôles tactiles glassmorphism */
(function (ST3) {
  'use strict';

  let root = null;
  let input = null;
  let visible = false;

  function bindHold(el, onDown, onUp) {
    function down(e) {
      e.preventDefault();
      if (el.setPointerCapture && e.pointerId != null) {
        try {
          el.setPointerCapture(e.pointerId);
        } catch (err) {
          /* ignore */
        }
      }
      el.classList.add('actif');
      onDown();
    }
    function up(e) {
      e.preventDefault();
      el.classList.remove('actif');
      onUp();
    }
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('lostpointercapture', up);
  }

  function mount(sharedInput) {
    input = sharedInput;
    root = document.getElementById('touch-ui');
    if (!root) return;

    const map = {
      'touch-fwd': 'forward',
      'touch-back': 'back',
      'touch-left': 'turnLeft',
      'touch-right': 'turnRight',
      'touch-fire': 'fire',
      'touch-action': 'action',
    };

    Object.keys(map).forEach(function (id) {
      const el = document.getElementById(id);
      if (!el) return;
      const key = map[id];
      bindHold(
        el,
        function () {
          input[key] = true;
        },
        function () {
          input[key] = false;
        }
      );
    });

    refresh();
    window.addEventListener('resize', refresh);
  }

  function refresh() {
    if (!root) return;
    const show = typeof SlothDevice !== 'undefined' &&
      SlothDevice.isTouchPrimary() &&
      !root.dataset.blocked;
    visible = show;
    root.classList.toggle('visible', show);
  }

  function setBlocked(blocked) {
    if (!root) return;
    if (blocked) root.dataset.blocked = '1';
    else delete root.dataset.blocked;
    refresh();
  }

  ST3.Touch = {
    mount,
    refresh,
    setBlocked,
    isVisible: function () {
      return visible;
    },
  };
})(window.ST3 = window.ST3 || {});
