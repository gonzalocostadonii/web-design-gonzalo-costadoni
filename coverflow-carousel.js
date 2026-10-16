// Coverflow carousel — vanilla port of the React "coverflow-carousel" component (shadcn-style).
// The markup (frame > track > .cf-card) is rendered by the dc template; this module only
// moves the cards. Cards are re-queried on every paint, so template re-renders are safe.
//
//   const cf = CoverflowCarousel.create(frame, { onChange: (index) => ..., onPick: (index) => ... });
//   cf.goTo(index); cf.nudge(+1 | -1); cf.destroy();
"use strict";
(() => {
  if (window.CoverflowCarousel) return;

  const DEFAULTS = { rotate: 44, depth: 0.6, falloff: 0.56, fade: 0.1, gap: 0.05, loop: true };

  function create(frame, opts = {}) {
    const o = Object.assign({}, DEFAULTS, opts);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cards = () => Array.from(frame.querySelectorAll(".cf-card"));
    let pos = 0, target = 0, width = 0, raf = null, drag = null, selected = 0;

    const count = () => cards().length || 1;
    const indexAt = (p) => ((Math.round(p) % count()) + count()) % count();
    const clamp = (p) => (o.loop ? p : Math.max(0, Math.min(count() - 1, p)));

    // Paint straight to the DOM: el carrusel nunca pasa por la plantilla mientras se mueve.
    function paint() {
      const list = cards(), n = list.length;
      if (!width || !n) return;
      const pitch = width * (1 + o.gap);
      list.forEach((card, i) => {
        // Distancia por el camino más corto alrededor del anillo: así se hace el loop, sin clonar nodos.
        let off = i - pos;
        if (o.loop) { off = ((off % n) + n) % n; if (off > n / 2) off -= n; }
        const dist = Math.abs(off);
        const ramp = Math.pow(dist, o.falloff);
        const tilt = Math.min(o.rotate * ramp, 82) * Math.sign(off);
        card.style.transform = `translateX(calc(-50% + ${off * pitch}px)) translateZ(${-o.depth * width * ramp}px) rotateY(${-tilt}deg)`;
        // Una tarjeta salta al otro lado del anillo a media vuelta: tiene que estar invisible para entonces.
        const edge = o.loop ? Math.min(1, Math.max(0, n / 2 - dist)) : 1;
        card.style.opacity = String(Math.max(0, 1 - o.fade * dist) * edge);
        card.style.zIndex = String(100 - Math.round(dist));
        card.setAttribute("aria-hidden", dist > 0.5 ? "true" : "false");
      });
    }

    function select(i) {
      if (i === selected) return;
      selected = i;
      if (o.onChange) o.onChange(i);
    }

    function settle(to) {
      if (raf !== null) cancelAnimationFrame(raf);
      target = to;
      select(indexAt(to));
      if (reduce) { pos = to; paint(); raf = null; return; }
      const step = () => {
        const rest = target - pos;
        if (Math.abs(rest) < 0.0004) { pos = target; paint(); raf = null; return; }
        pos += rest * 0.16; // ease-out exponencial, sin rebote
        paint();
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }

    function goTo(i) {
      const n = count();
      const to = o.loop ? i + Math.round((target - i) / n) * n : i;
      settle(clamp(to));
    }
    const nudge = (by) => settle(clamp(Math.round(target) + by));

    function down(e) {
      if (e.button !== undefined && e.button !== 0) return;
      if (raf !== null) { cancelAnimationFrame(raf); raf = null; }
      frame.setPointerCapture(e.pointerId);
      target = pos;
      drag = { id: e.pointerId, x: e.clientX, x0: e.clientX, pos, v: 0, t: performance.now(), card: e.target.closest(".cf-card") };
    }
    function move(e) {
      if (!drag || drag.id !== e.pointerId) return;
      const pitch = width * (1 + o.gap);
      if (!pitch) return;
      const now = performance.now(), prev = pos;
      pos = clamp(drag.pos - (e.clientX - drag.x) / pitch);
      drag.v = ((pos - prev) / Math.max(now - drag.t, 1)) * 1000; // tarjetas por segundo, para el envión
      drag.t = now;
      select(indexAt(pos));
      paint();
    }
    function up(e) {
      if (!drag || drag.id !== e.pointerId) return;
      const d = drag; drag = null;
      // Un toque sin arrastre sobre una tarjeta de costado la trae al centro.
      if (Math.abs(e.clientX - d.x0) < 6 && d.card) {
        const i = cards().indexOf(d.card);
        if (i >= 0 && i !== indexAt(pos)) { goTo(i); return; }
        if (i >= 0 && o.onPick) o.onPick(i);
      }
      const carried = Math.max(-2, Math.min(2, d.v * 0.18)); // un flick lleva, pero nunca más de dos tarjetas
      settle(clamp(Math.round(pos + carried)));
    }
    function key(e) {
      if (e.key === "ArrowLeft") { e.preventDefault(); nudge(-1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); nudge(1); }
    }

    function measure() {
      const c = cards()[0];
      if (!c) return;
      width = c.offsetWidth;
      paint();
    }

    frame.addEventListener("pointerdown", down);
    frame.addEventListener("pointermove", move);
    frame.addEventListener("pointerup", up);
    frame.addEventListener("pointercancel", up);
    frame.addEventListener("keydown", key);
    const ro = new ResizeObserver(measure);
    ro.observe(frame);
    measure();

    return {
      goTo, nudge, paint: measure,
      destroy() {
        if (raf !== null) cancelAnimationFrame(raf);
        ro.disconnect();
        frame.removeEventListener("pointerdown", down);
        frame.removeEventListener("pointermove", move);
        frame.removeEventListener("pointerup", up);
        frame.removeEventListener("pointercancel", up);
        frame.removeEventListener("keydown", key);
      },
    };
  }

  window.CoverflowCarousel = { create };
})();
