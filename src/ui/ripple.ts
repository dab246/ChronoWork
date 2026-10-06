/**
 * Material ink ripple for every button. A single delegated pointerdown
 * listener avoids wrapping each button in a component. Opt out with
 * `data-no-ripple` on the element.
 */
const RIPPLE_TARGET = 'button:not(:disabled):not([data-no-ripple]), [data-ripple]';

function spawnRipple(event: PointerEvent) {
  if (event.button !== 0) return;
  const target = (event.target as Element | null)?.closest<HTMLElement>(RIPPLE_TARGET);
  if (!target) return;

  const rect = target.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 2;

  // A clipping layer keeps the button's own overflow and layout untouched.
  const layer = document.createElement('span');
  layer.className = 'ripple-layer';
  const wave = document.createElement('span');
  wave.className = 'ripple-wave';
  wave.style.width = wave.style.height = `${size}px`;
  wave.style.left = `${event.clientX - rect.left - size / 2}px`;
  wave.style.top = `${event.clientY - rect.top - size / 2}px`;
  layer.appendChild(wave);

  if (getComputedStyle(target).position === 'static') target.style.position = 'relative';
  target.appendChild(layer);

  const remove = () => {
    wave.classList.add('ripple-fade');
    setTimeout(() => layer.remove(), 450);
  };
  window.addEventListener('pointerup', remove, { once: true });
  window.addEventListener('pointercancel', remove, { once: true });
}

export function installRipple(): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.addEventListener('pointerdown', spawnRipple, { passive: true });
}
