// Card fan carousel — vanilla port of the React/GSAP "card-fan-carousel" component.
// The markup (cards, arrows, dots) is rendered by the dc template; this module only
// animates the `.fan-card` children of a container. Requires window.gsap.
//
//   const fan = CardFanCarousel.create(container, { onSwipe: (dir) => ... });
//   fan.update(centerIndex, direction);   // "left" | "right" | null (first call = entry)
//   fan.isBusy();                          // true while a transition is running
//   fan.destroy();
"use strict";
(() => {
  if (window.CardFanCarousel) return;

  const MAX_VISIBLE = 7;
  const HALF = 3;

  const FAN_POSITIONS = [
    { rot: -21, scale: 0.7756, x: -30, y: 7.3, zIndex: 1 },
    { rot: -14, scale: 0.8498, x: -22, y: 4.0, zIndex: 2 },
    { rot: -7,  scale: 0.9346, x: -11, y: 1.3, zIndex: 3 },
    { rot: 0,   scale: 1.0,    x: 0,   y: 0.0, zIndex: 10 },
    { rot: 7,   scale: 0.9346, x: 11,  y: 1.3, zIndex: 3 },
    { rot: 14,  scale: 0.8498, x: 22,  y: 4.0, zIndex: 2 },
    { rot: 21,  scale: 0.7756, x: 30,  y: 7.3, zIndex: 1 },
  ];

  function getResponsiveMultiplier(width) {
    if (width < 480) return 0.28;
    if (width < 640) return 0.38;
    if (width < 768) return 0.5;
    if (width < 1024) return 0.75;
    return 1.0;
  }

  // Scales y-offsets when the viewport is shorter than the ideal layout height
  // (the .fan-layout heights in the page CSS use the same breakpoints).
  function getHeightMultiplier(width) {
    let idealPx;
    if (width < 480) idealPx = 22 * 16;
    else if (width < 640) idealPx = 26 * 16;
    else if (width < 768) idealPx = 28 * 16;
    else if (width < 1024) idealPx = 34 * 16;
    else idealPx = 38 * 16;

    const available = window.innerHeight * 0.7;
    if (available >= idealPx) return 1;
    return available / idealPx;
  }

  function getSlotConfig(totalCards, slot) {
    if (totalCards >= MAX_VISIBLE) return FAN_POSITIONS[slot];
    const center = totalCards >> 1;
    const distance = totalCards > 1 ? (slot - center) / center : 0;
    const absDistance = Math.abs(distance);
    return {
      rot: distance * 21,
      scale: 1.0 - 0.2244 * absDistance * absDistance,
      x: distance * 30,
      y: absDistance * absDistance * 7.3,
      zIndex: 10 - Math.abs(slot - center),
    };
  }

  function initialCenter(totalCards) {
    return totalCards > MAX_VISIBLE ? HALF : totalCards >> 1;
  }

  function create(container, opts) {
    const gsap = window.gsap;
    const onSwipe = (opts && opts.onSwipe) || null;
    let animating = false;
    let entered = false;
    let prevVisible = new Set();
    let cleanup = null;

    const cards = () => Array.from(container.querySelectorAll(".fan-card"));

    function getVisibleMap(center, totalCards) {
      const map = new Map();
      if (totalCards <= MAX_VISIBLE) {
        for (let i = 0; i < totalCards; i++) map.set(i, i);
        return map;
      }
      for (let slot = 0; slot < MAX_VISIBLE; slot++) {
        map.set(((center + slot - HALF) % totalCards + totalCards) % totalCards, slot);
      }
      return map;
    }

    function update(centerIndex, direction) {
      if (cleanup) { cleanup(); cleanup = null; }
      const cardElements = cards();
      const totalCards = cardElements.length;
      if (!gsap || !totalCards) return;

      const needsPagination = totalCards > MAX_VISIBLE;
      const visibleMap = getVisibleMap(centerIndex, totalCards);
      const previouslyVisible = prevVisible;
      const isFirstMount = !entered;
      const multiplier = getResponsiveMultiplier(window.innerWidth);
      const hMult = getHeightMultiplier(window.innerWidth);
      const slotCount = needsPagination ? MAX_VISIBLE : totalCards;
      const config = (slot) => getSlotConfig(slotCount, slot);

      animating = true;

      let completedCount = 0;
      const visibleCount = visibleMap.size;
      const onCardDone = () => {
        if (++completedCount >= visibleCount) {
          animating = false;
          if (isFirstMount) entered = true;
        }
      };

      cardElements.forEach((card, cardIndex) => {
        const slot = visibleMap.get(cardIndex);
        const wasVisible = previouslyVisible.has(cardIndex);

        if (slot !== undefined) {
          const { x, y, rot, scale, zIndex } = config(slot);
          const target = {
            x: `${x * multiplier}rem`,
            y: `${y * hMult}rem`,
            rotation: rot,
            scale,
            opacity: 1,
            zIndex,
          };

          if (isFirstMount) {
            gsap.set(card, { x: 0, y: `${12 * hMult}rem`, rotation: 0, scale: 0.5, opacity: 0 });
            gsap.to(card, { ...target, duration: 1.2, ease: "elastic.out(1.05,.78)", delay: 0.2 + slot * 0.06, onComplete: onCardDone });
          } else if (!wasVisible) {
            const enterX = direction === "right" ? 40 : -40;
            gsap.set(card, { x: `${enterX}rem`, y: `${y * hMult}rem`, rotation: direction === "right" ? 30 : -30, scale: 0.5, opacity: 0 });
            gsap.to(card, { ...target, duration: 0.6, ease: "power2.out", onComplete: onCardDone });
          } else {
            gsap.to(card, { ...target, duration: 0.5, ease: "power2.out", onComplete: onCardDone });
          }
        } else if (wasVisible) {
          const exitX = direction === "right" ? -40 : 40;
          gsap.to(card, { x: `${exitX}rem`, opacity: 0, scale: 0.5, rotation: direction === "right" ? -30 : 30, duration: 0.4, ease: "power2.in", zIndex: 0 });
        } else if (isFirstMount) {
          gsap.set(card, { opacity: 0, scale: 0.3, x: 0, y: 0, zIndex: 0 });
        }
      });

      prevVisible = new Set(visibleMap.keys());

      // Hover interactions
      const visibleEntries = [];
      cardElements.forEach((el, i) => {
        const slot = visibleMap.get(i);
        if (slot !== undefined) visibleEntries.push({ el, slot });
      });
      visibleEntries.sort((a, b) => a.slot - b.slot);

      let activeSlot = null;
      let leaveTimer = null;
      const centerSlot = visibleEntries.length >> 1;

      const updateHoverLayout = (hoveredSlot) => {
        const mult = getResponsiveMultiplier(window.innerWidth);
        const hM = getHeightMultiplier(window.innerWidth);

        visibleEntries.forEach(({ el, slot }) => {
          const base = config(slot);
          let targetX = base.x * mult;
          let targetY = base.y * hM;
          let targetRot = base.rot;
          let targetScale = base.scale;
          let delay = 0;

          if (hoveredSlot !== null) {
            const distance = Math.abs(slot - hoveredSlot);
            delay = distance * 0.02;

            if (slot === hoveredSlot) {
              targetY -= 2.5 * hM;
              targetScale *= 1.08;
            } else {
              const normalized = centerSlot > 0 ? (slot - centerSlot) / centerSlot : 0;
              const pushStrength = 8 * (1 - Math.abs(normalized)) * (1 + 0.2 * Math.max(0, 3 - distance));

              if (slot < hoveredSlot) {
                targetX -= pushStrength * mult;
                targetRot -= 3 / (distance + 1);
              } else {
                targetX += pushStrength * mult;
                targetRot += 3 / (distance + 1);
              }

              if (slot === visibleEntries.length - 1 && hoveredSlot < centerSlot) targetY -= 1 * hM;
              if (slot === 0 && hoveredSlot > centerSlot) targetY -= 1 * hM;
            }
          } else {
            delay = Math.abs(slot - centerSlot) * 0.02;
          }

          gsap.to(el, {
            x: `${targetX}rem`, y: `${targetY}rem`, rotation: targetRot, scale: targetScale,
            duration: 0.5, delay, ease: "elastic.out(1,.75)", overwrite: "auto",
          });
          gsap.set(el, { zIndex: base.zIndex });
        });
      };

      const enterHandlers = visibleEntries.map(({ el, slot }) => {
        const handler = () => {
          if (animating) return;
          if (leaveTimer) { clearTimeout(leaveTimer); leaveTimer = null; }
          if (activeSlot !== slot) { activeSlot = slot; updateHoverLayout(slot); }
        };
        el.addEventListener("mouseenter", handler);
        return { el, handler };
      });

      const onMouseLeave = () => {
        if (animating) return;
        if (leaveTimer) clearTimeout(leaveTimer);
        leaveTimer = setTimeout(() => { activeSlot = null; updateHoverLayout(null); }, 50);
      };
      container.addEventListener("mouseleave", onMouseLeave);

      const onResize = () => { if (!animating) updateHoverLayout(activeSlot); };
      window.addEventListener("resize", onResize);

      // Horizontal swipe cycles the fan on touch screens
      let touchX = null;
      let touchY = null;
      const onTouchStart = (e) => { touchX = e.touches[0].clientX; touchY = e.touches[0].clientY; };
      const onTouchEnd = (e) => {
        if (touchX === null || !onSwipe || !needsPagination) return;
        const dx = e.changedTouches[0].clientX - touchX;
        const dy = e.changedTouches[0].clientY - touchY;
        touchX = null;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) onSwipe(dx < 0 ? "right" : "left");
      };
      container.addEventListener("touchstart", onTouchStart, { passive: true });
      container.addEventListener("touchend", onTouchEnd);

      cleanup = () => {
        enterHandlers.forEach(({ el, handler }) => el.removeEventListener("mouseenter", handler));
        container.removeEventListener("mouseleave", onMouseLeave);
        window.removeEventListener("resize", onResize);
        container.removeEventListener("touchstart", onTouchStart);
        container.removeEventListener("touchend", onTouchEnd);
        if (leaveTimer) clearTimeout(leaveTimer);
      };
    }

    return {
      update,
      isBusy: () => animating || !entered,
      destroy: () => {
        if (cleanup) cleanup();
        cleanup = null;
        if (gsap) gsap.killTweensOf(cards());
      },
    };
  }

  window.CardFanCarousel = { create, initialCenter, MAX_VISIBLE };
})();
