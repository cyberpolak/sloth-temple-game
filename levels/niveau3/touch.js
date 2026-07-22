/* SHA'UR'NA — contrôles tactiles glassmorphism */
(function (ST3) {
  'use strict';

  const LOOK_RADIUS = 38;
  const LOOK_DEADZONE = 0.05;

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

  function mountLookJoystick(sharedInput) {
    const joy = document.getElementById('touch-lookjoy');
    const knob = document.getElementById('touch-lookjoy-knob');
    if (!joy || !knob) return;

    let activeId = null;
    let originX = 0;
    let originY = 0;

    function setKnob(dx, dy) {
      knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    }

    function release() {
      if (activeId == null) return;
      activeId = null;
      sharedInput.lookStick = 0;
      setKnob(0, 0);
      joy.classList.remove('actif');
    }

    joy.addEventListener('pointerdown', function (e) {
      if (activeId != null) return;
      e.preventDefault();
      activeId = e.pointerId;
      const rect = joy.getBoundingClientRect();
      originX = rect.left + rect.width / 2;
      originY = rect.top + rect.height / 2;
      joy.classList.add('actif');
      if (joy.setPointerCapture) {
        try {
          joy.setPointerCapture(e.pointerId);
        } catch (err) {
          /* ignore */
        }
      }
      // Apply immediately so first frame isn't zero
      applyPointer(e.clientX, e.clientY);
    });

    function applyPointer(clientX, clientY) {
      let dx = clientX - originX;
      let dy = clientY - originY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > LOOK_RADIUS) {
        const s = LOOK_RADIUS / dist;
        dx *= s;
        dy *= s;
      }
      setKnob(dx, dy);
      // Horizontal only — yaw; ignore pitch (game has none)
      let nx = dx / LOOK_RADIUS;
      if (Math.abs(nx) < LOOK_DEADZONE) nx = 0;
      sharedInput.lookStick = Math.max(-1, Math.min(1, nx));
    }

    joy.addEventListener('pointermove', function (e) {
      if (e.pointerId !== activeId) return;
      e.preventDefault();
      applyPointer(e.clientX, e.clientY);
    });

    function end(e) {
      if (e.pointerId !== activeId) return;
      e.preventDefault();
      release();
    }

    joy.addEventListener('pointerup', end);
    joy.addEventListener('pointercancel', end);
    joy.addEventListener('lostpointercapture', function (e) {
      if (e.pointerId !== activeId) return;
      release();
    });
  }

  function mount(sharedInput) {
    input = sharedInput;
    root = document.getElementById('touch-ui');
    if (!root) return;

    const map = {
      'touch-fwd': 'forward',
      'touch-back': 'back',
      'touch-left': 'strafeLeft',
      'touch-strafe-r': 'strafeRight',
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

    mountLookJoystick(input);
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
